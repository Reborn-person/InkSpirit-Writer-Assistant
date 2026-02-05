import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { checkQuota, deductQuota } from '@/lib/quota';
import { PROVIDER_MODELS } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET;
// const PLATFORM_API_KEY = process.env.SILICONFLOW_API_KEY; 
// const PLATFORM_BASE_URL = 'https://api.siliconflow.cn/v1';

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) return NextResponse.json({ error: 'Server Config Error: JWT_SECRET missing' }, { status: 500 });
  
  // 1. Get System Providers
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'SYSTEM_PROVIDERS' }
  });
  
  let providers: any[] = [];
  try {
    providers = setting?.value ? JSON.parse(setting.value) : [];
  } catch(e) {}

  // Fallback to legacy
  if (providers.length === 0) {
     const oldKeySetting = await prisma.systemSetting.findUnique({ where: { key: 'SYSTEM_API_KEY' } });
     const oldKey = oldKeySetting?.value || process.env.SILICONFLOW_API_KEY;
     if (oldKey) {
       providers.push({
         id: 'siliconflow',
         baseUrl: 'https://api.siliconflow.cn/v1',
         apiKey: oldKey,
         enabled: true
       });
     }
  }

  if (providers.length === 0) return NextResponse.json({ error: 'Server Config Error: No System Providers configured' }, { status: 500 });

  // 2. Auth Check
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized: Please login' }, { status: 401 });

  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch {
    return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, level: true }
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 3. Quota Check
  const quotaCheck = await checkQuota(user.id, user.level);
  if (!quotaCheck.ok) {
      return NextResponse.json({ error: 'Quota Exceeded', message: quotaCheck.message }, { status: 403 });
  }

  // 4. Forward Request with Load Balancing & Failover
  try {
      const body = await req.json();
      const { model, messages, stream, temperature, max_tokens } = body;
      
      // Filter enabled providers
      const enabledProviders = providers.filter(p => p.enabled);
      if (enabledProviders.length === 0) {
          return NextResponse.json({ error: 'No active provider available' }, { status: 500 });
      }

      // Find providers that support this model
      let candidateProviders = enabledProviders.filter(p => {
          const supportedModels = PROVIDER_MODELS[p.id as keyof typeof PROVIDER_MODELS] as string[] | undefined;
          return supportedModels?.includes(model);
      });

      // If no specific model match, use all enabled providers
      if (candidateProviders.length === 0) {
          candidateProviders = enabledProviders;
      }

      // Shuffle candidates for randomized load balancing (Polling/Round-Robin equivalent in stateless)
      const shuffledProviders = [...candidateProviders].sort(() => Math.random() - 0.5);

      let lastError = null;
      
      // Try providers one by one (Failover Mechanism)
      for (const targetProvider of shuffledProviders) {
          const finalApiKey = targetProvider.apiKey;
          const finalBaseUrl = targetProvider.baseUrl;
          const priceRatio = targetProvider.priceRatio || 1;
          const cleanBaseUrl = finalBaseUrl.replace(/\/$/, '');

          try {
              const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${finalApiKey}`
                  },
                  body: JSON.stringify({
                      model: model,
                      messages,
                      stream,
                      temperature,
                      max_tokens
                  }),
                  // Set a reasonable timeout for failover (e.g., 10s for the initial connection)
                  signal: AbortSignal.timeout(15000) 
              });

              if (!response.ok) {
                  const errText = await response.text();
                  console.warn(`Provider ${targetProvider.name} failed:`, errText);
                  lastError = { status: response.status, details: errText };
                  continue; // Try next provider
              }

              // Success! Handle Stream or JSON
              if (stream) {
                  const reader = response.body?.getReader();
                  const decoder = new TextDecoder();
                  
                  const stream = new ReadableStream({
                      async start(controller) {
                          if (!reader) { controller.close(); return; }
                          try {
                              while (true) {
                                  const { done, value } = await reader.read();
                                  if (done) break;
                                  controller.enqueue(value);
                                  
                                  if (user.level !== 'PROMAX') {
                                      const text = decoder.decode(value, { stream: true });
                                      const match = text.match(/"usage":\s*(\{[^}]+\})/);
                                      if (match) {
                                          try {
                                              const usage = JSON.parse(match[1]);
                                              const tokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
                                              if (tokens > 0) {
                                                  const cost = Math.ceil(tokens * priceRatio);
                                                  await deductQuota(user.id, user.level, cost);
                                              }
                                          } catch (e) {}
                                      }
                                  }
                              }
                              controller.close();
                          } catch (e) {
                              controller.error(e);
                          }
                      }
                  });
                  
                  return new NextResponse(stream, {
                      headers: { 'Content-Type': 'text/event-stream' }
                  });
              } else {
                  const data = await response.json();
                  if (data.usage && user.level !== 'PROMAX') {
                      const tokens = (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0);
                      const cost = Math.ceil(tokens * priceRatio);
                      await deductQuota(user.id, user.level, cost);
                  }
                  return NextResponse.json(data);
              }
          } catch (e: any) {
              console.error(`Fetch error for provider ${targetProvider.name}:`, e.message);
              lastError = { status: 500, details: e.message };
              continue; // Try next provider
          }
      }

      // If all providers failed
      return NextResponse.json({ 
          error: 'All providers failed', 
          last_error: lastError 
      }, { status: 502 });

  } catch (e: any) {
      return NextResponse.json({ error: 'Internal Proxy Error', details: e.message }, { status: 500 });
  }
}
