export async function generateAIContent(
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'gpt-4o'
) {
  // 移除 baseUrl 末尾的斜杠，防止拼接出双斜杠
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const requestUrl = `${cleanBaseUrl}/chat/completions`;
  
  console.log(`[AI] Requesting completion from: ${requestUrl} (Model: ${model})`);

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
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
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

export async function generateAIContentStream(
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'gpt-4o',
  onUpdate: (content: string) => void
): Promise<string> {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const requestUrl = `${cleanBaseUrl}/chat/completions`;
  
  console.log(`[AI Stream] Requesting completion from: ${requestUrl} (Model: ${model})`);

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
        // Handle error similarly to non-stream version
        const text = await response.text();
        throw new Error(`API Request Failed: ${response.status} - ${text}`);
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
