import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;


export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: '登录失效' }, { status: 401 });
    }

    const body = await req.json();
    const { type, nodeData, connectedNodes, worldContext, apiKey, baseUrl, model } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 400 });
    }

    const runAI = async (prompt: string, userPrompt: string | null = null) => {
      // Reconstruct logic to use fetch directly or use generateAIContent if we want simple text.
      // But the original code requested JSON object response format.
      // generateAIContent in lib/ai.ts does NOT support response_format.
      // So we implement a custom fetch here.

      const finalBaseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
      const finalModel = model || 'gpt-4o';

      const messages = [
        { role: 'system', content: prompt }
      ];
      if (userPrompt) {
        messages.push({ role: 'user', content: userPrompt });
      }

      // Extract system prompt from the prompt variable if it contains instruction, 
      // but here 'prompt' in the original code was the WHOLE instruction.
      // The original code passed 'prompt' as the first arg to 'callAI'.
      // Let's assume 'prompt' is the system prompt or user prompt.

      const response = await fetch(`${finalBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: finalModel,
          messages: messages,
          temperature: 0.8,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AI Request Failed: ${response.status} - ${err}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };
    };

    if (type === 'expand_region') {
      // 区域扩展：为一个节点生成详细描述和子节点
      const prompt = `你是一个网文世界观构建助手。

**当前节点信息：**
- 名称：${nodeData.name}
- 类型：${nodeData.layer}
- 描述：${nodeData.desc || '无'}

**世界背景：**
${worldContext || '玄幻修仙世界'}

**任务：**
1. 为这个节点生成一段详细的描述（100-200字）
2. 生成 3-5 个相关的子节点，每个子节点包含：
   - name: 节点名称
   - layer: 所属图层（geo/faction/resource/race/culture/power/rule/artifact/plot）
   - desc: 简短描述（30-50字）

请以 JSON 格式返回：
{
  "description": "详细描述",
  "childNodes": [
    { "name": "...", "layer": "...", "desc": "..." }
  ]
}`;

      const { content: result, usage } = await runAI(prompt);

      return NextResponse.json({ success: true, data: JSON.parse(result), usage });
    }

    if (type === 'infer_plot') {
      // 剧情推演：基于多个节点关系生成事件
      const prompt = `你是一个网文剧情设计助手。

**相关节点：**
${connectedNodes.map((n: any) => `- ${n.name} (${n.layer}): ${n.desc || '无描述'}`).join('\n')}

**世界背景：**
${worldContext || '玄幻修仙世界'}

**任务：**
基于这些节点之间的关系，生成 2-3 个可能的剧情事件节点。每个事件包含：
- name: 事件名称
- desc: 事件描述（50-100字）
- connections: 应该连接到哪些节点的 name 列表

请以 JSON 格式返回：
{
  "events": [
    { 
      "name": "...", 
      "desc": "...",
      "connections": ["节点名1", "节点名2"]
    }
  ]
}`;

      const { content: result, usage } = await runAI(prompt);

      return NextResponse.json({ success: true, data: JSON.parse(result), usage });
    }

    return NextResponse.json({ error: '未知的生成类型' }, { status: 400 });

  } catch (error: any) {
    console.error('God Mode AI Generation Error:', error);
    return NextResponse.json(
      { error: error.message || 'AI 生成失败' },
      { status: 500 }
    );
  }
}
