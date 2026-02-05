import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token || !JWT_SECRET) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    // Check if username is in the allowed admin list
    if (user?.username && ADMIN_USERNAMES.includes(user.username)) {
        return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

export async function GET() {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Try to get SYSTEM_PROVIDERS first
  const providersSetting = await prisma.systemSetting.findUnique({
    where: { key: 'SYSTEM_PROVIDERS' }
  });

  if (providersSetting?.value) {
    try {
      const providers = JSON.parse(providersSetting.value);
      return NextResponse.json({ providers });
    } catch {
      // ignore parse error
    }
  }

  // Fallback to legacy single key
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'SYSTEM_API_KEY' }
  });
  
  // Return in list format for compatibility
  const legacyProviders = setting?.value ? [{
    id: 'siliconflow',
    name: '硅基流动 (默认)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: setting.value,
    enabled: true
  }] : [];

  return NextResponse.json({ providers: legacyProviders });
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  
  // Support both single apiKey update and providers list update
  if (body.providers) {
    await prisma.systemSetting.upsert({
      where: { key: 'SYSTEM_PROVIDERS' },
      update: { value: JSON.stringify(body.providers) },
      create: { key: 'SYSTEM_PROVIDERS', value: JSON.stringify(body.providers) }
    });
    
    // Also sync the first SiliconFlow key to legacy field for safety
    const silicon = body.providers.find((p: any) => p.id === 'siliconflow');
    if (silicon && silicon.apiKey) {
        await prisma.systemSetting.upsert({
            where: { key: 'SYSTEM_API_KEY' },
            update: { value: silicon.apiKey },
            create: { key: 'SYSTEM_API_KEY', value: silicon.apiKey }
        });
    }
  } else if (body.apiKey) {
    // Legacy mode update
    await prisma.systemSetting.upsert({
      where: { key: 'SYSTEM_API_KEY' },
      update: { value: body.apiKey },
      create: { key: 'SYSTEM_API_KEY', value: body.apiKey }
    });
  }

  return NextResponse.json({ success: true });
}
