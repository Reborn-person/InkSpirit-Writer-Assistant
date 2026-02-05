import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { checkQuota, deductQuota } from '@/lib/quota';

const JWT_SECRET = process.env.JWT_SECRET;
const PLATFORM_API_KEY = process.env.SILICONFLOW_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: '登录失效' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    let { type, nodeData, connectedNodes, worldContext, apiKey, baseUrl, model } = body;

    let usePlatformKey = false;

    if (!apiKey) {
      // Get System API Key from DB (fallback logic)
      const systemSetting = await prisma.systemSetting.findUnique({
        where: { key: 'SYSTEM_API_KEY' }
      });
      const platformKey = systemSetting?.value || PLATFORM_API_KEY;

      // Fallback to Platform Key
      if (!platformKey) {
         return NextResponse.json({ error: 'Server Config Error: Platform Key Missing' }, { status: 500 });
      }
      
      // Check Quota
      const quotaCheck = await checkQuota(user.id, user.level);
      if (!quotaCheck.ok) {
        return NextResponse.json({ error: quotaCheck.message }, { status: 403 });
      }
      
      apiKey = platformKey;
      usePlatformKey = true;
      // Force SiliconFlow URL if using platform key
      baseUrl = 'https://api.siliconflow.cn/v1'; 
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

      if (usePlatformKey && usage) {
          const tokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
          await deductQuota(user.id, user.level, tokens);
      }

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

      if (usePlatformKey && usage) {
          const tokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
          await deductQuota(user.id, user.level, tokens);
      }

      return NextResponse.json({ success: true, data: JSON.parse(result), usage });
    }

    if (type === 'summarize_chapter') {
      const { bookTitle, chapterNo, chapterTitle, chapterContent } = body as {
        bookTitle?: string;
        chapterNo?: number;
        chapterTitle?: string;
        chapterContent?: string;
      };

      const content = (chapterContent || '').trim();
      if (!content) return NextResponse.json({ error: '章节正文为空' }, { status: 400 });

      // 截断以避免超出 token 限制，保留 12k 字符通常足够
      const safeContent = content.length > 12000 ? content.slice(0, 12000) : content;

      const prompt = `你是一个小说章节深度解析工具。

任务：将小说章节正文转化为**多维度剧情图谱**数据。

请从以下 9 个维度提取本章的关键信息（如果某维度本章未涉及，则跳过）：
1. **summary** (剧情): 本章主线故事梗概 (80-150字)。
2. **geo** (地理): 主角的位置变化、新地图开启 (如: 乌坦城 -> 魔兽山脉)。
3. **faction** (势力): 宗门/家族/组织的动态 (如: 云岚宗退婚、萧家召开族会)。
4. **power** (力量): 修炼体系/境界的展示或突破 (如: 斗之气三段、炼药师等级)。
5. **artifact** (神器): 关键物品/法宝的获得或使用 (如: 黑色戒指、玄重尺)。
6. **race** (种族/角色): 关键角色的登场或种族揭秘 (如: 萧炎、药老、美杜莎)。
7. **relation** (关系): 人际关系的重大变化 (如: 纳兰嫣然-解除婚约)。
8. **culture** (文化/经济): 经济贸易、文化习俗、社会制度的展现 (如: 拍卖会、炼药师公会制度)。
9. **secret** (伏笔): 重要的伏笔或秘密揭示。

输出 JSON 格式：
{
  "summary": "...",
  "dimensions": [
    {
      "layer": "geo", 
      "content": "...", 
      "entity": "地点名" 
    },
    {
      "layer": "faction",
      "content": "...",
      "entity": "势力名"
    },
    {
      "layer": "race",
      "content": "...",
      "entity": "角色名/种族名"
    }
    // ... 其他维度
  ]
}`;

      const userPrompt = `书名：${bookTitle || ''}\n章节：${chapterNo || ''} ${chapterTitle || ''}\n正文：\n${safeContent}`;

      const { content: result, usage } = await runAI(prompt, userPrompt);

      if (usePlatformKey && usage) {
        const tokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
        await deductQuota(user.id, user.level, tokens);
      }

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
