export async function generateContent(
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'gpt-4o'
) {
  if (!apiKey) {
    throw new Error('API Key is missing. Please set it in Settings.');
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw error;
  }
}
