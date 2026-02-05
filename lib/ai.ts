import { StorageManager } from './storage';

export async function generateAIContent(
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'gpt-4o',
  maxTokens?: number,
  signal?: AbortSignal
) {
  // 移除 baseUrl 末尾的斜杠，防止拼接出双斜杠
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  let requestUrl = `${cleanBaseUrl}/chat/completions`;
  let isProxy = false;

  if (!apiKey) {
    requestUrl = '/api/proxy/chat';
    isProxy = true;
    console.log(`[AI] No API Key provided, switching to Proxy: ${requestUrl}`);
  }
  
  console.log(`[AI] Requesting completion from: ${requestUrl} (Model: ${model})`);

  try {
    if (!isProxy) {
        if (!apiKey) {
        throw new Error('API Key is missing. Please set it in Settings.');
        }
    
        if (!baseUrl) {
        throw new Error('Base URL is missing. Please check your API configuration.');
        }
    }
  
    if (!model) {
      throw new Error('Model is missing. Please check your API configuration.');
    }

    const body: any = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
    };

    if (maxTokens) {
        body.max_tokens = maxTokens;
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': isProxy ? '' : `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(text);
      } catch {
        // 忽略解析错误，使用原始文本作为错误信息
      }
      
      const errorMessage = errorData.error?.message || text.slice(0, 200) || `API request failed with status ${response.status}`;
      
      // 提供更详细的错误信息
      if (response.status === 401) {
        throw new Error(`API 认证失败 (401): 请检查您的 API 密钥是否正确。${errorMessage}`);
      } else if (response.status === 403) {
        throw new Error(`API 权限错误 (403): 您的 API 密钥可能没有访问该模型或服务的权限。${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`API 请求频率限制 (429): 请稍后再试。${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error(`API 服务器错误 (500): 服务暂时不可用。${errorMessage}`);
      } else {
        throw new Error(`API 错误 (${response.status}): ${errorMessage}`);
      }
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      console.error('Response Text:', text.slice(0, 200));
      
      // 尝试提取 HTML title 作为更友好的错误信息
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1] : 'Unknown HTML Page';
      
      console.error('--- API Error Debug Info ---');
      console.error('Request URL:', requestUrl);
      console.error('Response Status:', response.status);
      console.error('Response Preview:', text.slice(0, 500));
      console.error('----------------------------');

      let errorMsg = `API 请求返回了网页而非数据 (Title: ${pageTitle})。\n\n返回内容预览:\n${text.slice(0, 150)}...`;
      
      // 智能建议：检查是否缺少 /v1
      if (!cleanBaseUrl.endsWith('/v1')) {
        errorMsg += `\n\n💡 建议：您的 Base URL (${cleanBaseUrl}) 可能缺少了 "/v1" 后缀。\n请尝试修改为: ${cleanBaseUrl}/v1`;
      } else {
        errorMsg += `\n\n请检查 Base URL 配置是否正确 (当前: ${cleanBaseUrl})。`;
      }

      throw new Error(errorMsg);
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API Response Structure:', data);
      throw new Error('API 响应格式不符合预期: 缺少 choices[0].message 字段');
    }

    // 记录 Token 使用情况 (如果存在)
    if (data.usage) {
        StorageManager.addTokenUsage(
            'Unknown', // Provider is tricky to guess from just baseUrl, maybe we can pass it?
            model,
            data.usage.prompt_tokens,
            data.usage.completion_tokens
        );
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Generation Error:', error);
    
    // 网络错误处理
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('网络连接失败: 请检查您的网络连接或 API 服务地址。');
    }
    
    throw error;
  }
}

export async function generateEmbeddings(
  apiKey: string,
  inputs: string[],
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'text-embedding-3-large',
  signal?: AbortSignal
): Promise<number[][]> {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const requestUrl = `${cleanBaseUrl}/embeddings`;

  console.log(`[AI] Requesting embeddings from: ${requestUrl} (Model: ${model})`);

  try {
    if (!apiKey) {
      throw new Error('API Key is missing. Please set it in Settings.');
    }

    if (!baseUrl) {
      throw new Error('Base URL is missing. Please check your API configuration.');
    }

    if (!model) {
      throw new Error('Model is missing. Please check your API configuration.');
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: inputs
      }),
      signal
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(text);
      } catch {
      }
      const errorMessage = errorData.error?.message || text.slice(0, 200) || `Embedding request failed with status ${response.status}`;
      throw new Error(`Embedding Error: ${errorMessage}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.data)) {
      throw new Error('Embedding response is invalid.');
    }

    const vectors = data.data.map((item: any) => item.embedding).filter((embedding: any) => Array.isArray(embedding));
    if (vectors.length === 0) {
      throw new Error('Embedding response is empty.');
    }

    return vectors;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

export async function generateAIContentStream(
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'gpt-4o',
  onUpdate: (content: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  let requestUrl = `${cleanBaseUrl}/chat/completions`;
  let isProxy = false;

  if (!apiKey) {
    requestUrl = '/api/proxy/chat';
    isProxy = true;
    console.log(`[AI Stream] No API Key provided, switching to Proxy: ${requestUrl}`);
  }
  
  console.log(`[AI Stream] Requesting completion from: ${requestUrl} (Model: ${model})`);

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': isProxy ? '' : `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
        // Handle error similarly to non-stream version
        const text = await response.text();
        let errorMsg = text;
        try {
            const json = JSON.parse(text);
            errorMsg = json.error?.message || json.message || text;
        } catch (e) {
            // ignore
        }

        if (response.status === 503) {
             throw new Error(`服务暂时不可用 (503): 服务器可能正忙或维护中，请稍后重试。`);
        }
        
        // Handle SiliconFlow specific overload error code 50508
        if (response.status === 50508 || (response.status === 400 && text.includes('50508')) || errorMsg.includes('50508')) {
             throw new Error(`服务繁忙 (50508): API 服务商系统正忙，请稍后重试或检查余额。`);
        }

        throw new Error(`API Request Failed: ${response.status} - ${errorMsg}`);
    }

    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
                try {
                    const jsonStr = trimmedLine.slice(6);
                    const data = JSON.parse(jsonStr);
                    const content = data.choices?.[0]?.delta?.content || '';
                    // Also capture reasoning_content if available (for DeepSeek R1)
                    // const reasoning = data.choices?.[0]?.delta?.reasoning_content || ''; 
                    // Note: merging reasoning + content might be confusing without UI support, sticking to content for now.
                    
                    if (content) {
                        fullContent += content;
                        onUpdate(fullContent);
                    }
                    
                    // Capture Token Usage from stream final chunk (if available)
                    // Many providers send usage in the last chunk or a special chunk with usage field
                    if (data.usage) {
                        StorageManager.addTokenUsage(
                            'Unknown', 
                            model,
                            data.usage.prompt_tokens,
                            data.usage.completion_tokens
                        );
                    }
                } catch (e) {
                    console.warn('Error parsing stream chunk:', e);
                }
            }
        }
    }
    
    return fullContent;

  } catch (error) {
    console.error('AI Stream Generation Error:', error);
    throw error;
  }
}

export async function generateImage(
  apiKey: string,
  prompt: string,
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'dall-e-3',
  size: string = '1024x1024',
  signal?: AbortSignal
): Promise<string> {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  // Special Handling for Grok / VectorEngine (uses Chat Completions)
  if (model.toLowerCase().includes('grok') || baseUrl.includes('vectorengine')) {
    console.log(`[AI Image] Detected Grok/VectorEngine model, switching to Chat API: ${cleanBaseUrl}/chat/completions`);
    
    // Construct a chat request to ask for an image
    // Grok typically returns the image URL in the content, often as markdown
    const chatResponse = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { 
            role: 'user', 
            content: `Generate an image of: ${prompt}. Please provide only the image URL or the markdown image syntax.` 
          }
        ],
        stream: false
      }),
      signal
    });

    if (!chatResponse.ok) {
        const text = await chatResponse.text();
        throw new Error(`Grok Image Generation Failed: ${chatResponse.status} - ${text}`);
    }

    const data = await chatResponse.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract URL from markdown ![alt](url) or raw URL
    const urlMatch = content.match(/!\[.*?\]\((.*?)\)/) || content.match(/(https?:\/\/[^\s)]+)/);
    
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    } else {
        console.warn('Could not extract image URL from Grok response:', content);
        throw new Error('Grok response did not contain a recognizable image URL');
    }
  }

  // Standard OpenAI / SiliconFlow Image API
  const requestUrl = `${cleanBaseUrl}/images/generations`;

  console.log(`[AI Image] Requesting image from: ${requestUrl} (Model: ${model})`);

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        n: 1,
        size: size
      }),
      signal
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(text);
      } catch {
        // Ignore
      }
      
      const errorMessage = errorData.error?.message || text.slice(0, 200) || `Image generation failed with status ${response.status}`;
      throw new Error(`Image Generation Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0 && data.data[0].url) {
      return data.data[0].url;
    } else if (data.images && data.images.length > 0 && data.images[0].url) {
      // Some APIs might use 'images' key
      return data.images[0].url;
    } else {
      console.error('Invalid Image API Response:', data);
      throw new Error('API response did not contain image URL');
    }

  } catch (error) {
    console.error('AI Image Generation Error:', error);
    throw error;
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  const size = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < size; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
