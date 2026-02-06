import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// 书籍分析请求接口
interface BookAnalysisRequest {
  bookTitle: string;
  author?: string;
  templateType: 'standard' | 'professional';
}

// 调用AI进行书籍分析
async function analyzeBookWithAI(bookTitle: string, author: string | undefined, templateType: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  // 根据模板类型构建不同的提示词
  const isProfessional = templateType === 'professional';
  
  const systemPrompt = isProfessional 
    ? `你是一位专业的小说拆解分析师，擅长深度分析网络小说的核心梗、人设、爽点、节奏等要素。
你需要根据书名搜索相关信息，并按照专业模板格式输出详细的拆书分析。
输出必须是JSON格式，包含以下字段：
{
  "title": "书名",
  "author": "作者",
  "genre": "类型",
  "wordCount": "字数",
  "summary": "简介",
  "core": { "theme": "核心主题", "hook": "开篇钩子", "conflict": "核心冲突", "climax": "高潮设计", "ending": "结局处理" },
  "structure": { "act1": "起", "act2": "承", "act3": "转", "act4": "合" },
  "characters": [{ "name": "角色名", "role": "protagonist/antagonist/supporting", "traits": "性格特点", "arc": "人物弧光" }],
  "techniques": { "pacing": "节奏把控", "suspense": "悬念设置", "dialogue": "对话风格", "description": "描写特点" },
  "market": { "platform": "首发平台", "rating": 评分数字, "heat": 热度数字, "tags": ["标签1", "标签2"] },
  "professional": {
    "coreHook": "一句话核心梗",
    "coreFormula": "核心公式",
    "protagonistTags": "主角标签",
    "protagonistContrast": "主角反差点",
    "antagonistType": "反派类型",
    "antagonistFunction": "反派功能",
    "bondFunction": "羁绊功能",
    "materialGap": "物资差爽点",
    "faceSlap": "打脸爽点",
    "timeGap": "时间差爽点",
    "chapter1Hook": "第1章钩子",
    "chapterEndHook": "章末钩子",
    "emotionalResonance": "情绪共鸣点",
    "nostalgia": "代入感/怀旧杀",
    "trafficPassword": "流量密码",
    "imitationIdeas": ["仿写脑洞1", "仿写脑洞2", "仿写脑洞3", "仿写脑洞4", "仿写脑洞5"]
  }
}`
    : `你是一位专业的小说拆解分析师，擅长分析网络小说的结构、人物、技巧等要素。
你需要根据书名搜索相关信息，并按照标准模板格式输出拆书分析。
输出必须是JSON格式，包含以下字段：
{
  "title": "书名",
  "author": "作者",
  "genre": "类型",
  "wordCount": "字数",
  "summary": "简介",
  "core": { "theme": "核心主题", "hook": "开篇钩子", "conflict": "核心冲突", "climax": "高潮设计", "ending": "结局处理" },
  "structure": { "act1": "起", "act2": "承", "act3": "转", "act4": "合" },
  "characters": [{ "name": "角色名", "role": "protagonist/antagonist/supporting", "traits": "性格特点", "arc": "人物弧光" }],
  "techniques": { "pacing": "节奏把控", "suspense": "悬念设置", "dialogue": "对话风格", "description": "描写特点" },
  "market": { "platform": "首发平台", "rating": 评分数字, "heat": 热度数字, "tags": ["标签1", "标签2"] }
}`;

  const userPrompt = author 
    ? `请分析小说《${bookTitle}》，作者：${author}。请搜索这本书的相关信息，包括剧情简介、人物设定、核心卖点等，然后按照专业拆书分析师的角度进行深度拆解。只输出JSON，不要其他内容。`
    : `请分析小说《${bookTitle}》。请搜索这本书的相关信息，包括剧情简介、人物设定、核心卖点等，然后按照专业拆书分析师的角度进行深度拆解。只输出JSON，不要其他内容。`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // 提取JSON内容
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

// POST /api/book-analysis - AI自动分析书籍
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: BookAnalysisRequest = await request.json();
    const { bookTitle, author, templateType } = body;

    if (!bookTitle) {
      return NextResponse.json(
        { error: 'Book title is required' },
        { status: 400 }
      );
    }

    // 调用AI进行分析
    const analysis = await analyzeBookWithAI(bookTitle, author, templateType);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Book analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze book',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
