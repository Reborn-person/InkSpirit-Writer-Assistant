/**
 * 人性化改写器 - 全面升级版本
 * 增强提示词系统，集成5维评分反馈
 */

import {
  HumanizeResult,
  HumanizeScore,
  Change,
  RewriteMode,
  RewriteConfig,
  DEFAULT_REWRITE_CONFIG,
  APIConfig,
  Issue,
} from './types';
import { aiDetector } from './detector';
import { generateScoreReport } from './scorer';
import { getRandomExamples, RewriteExample } from './rules/examples';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

/**
 * AI 人性化改写器 - 全面升级版本
 */
export class AIRewriter {
  private config: RewriteConfig;

  constructor(config: Partial<RewriteConfig> = {}) {
    this.config = { ...DEFAULT_REWRITE_CONFIG, ...config };
  }

  /**
   * 执行人性化改写
   */
  async rewrite(
    text: string,
    mode: RewriteMode = 'balanced',
    apiConfig?: APIConfig,
    customConfig?: Partial<RewriteConfig>
  ): Promise<HumanizeResult> {
    const startTime = Date.now();
    const config = { ...this.config, ...customConfig };

    // 1. 分析原文
    const scoreBefore = aiDetector.analyze(text);

    // 2. 调用AI进行改写
    const rewritten = await this.callAIRewrite(text, scoreBefore, mode, apiConfig, config);

    // 3. 分析改写后
    const scoreAfter = aiDetector.analyze(rewritten);

    // 4. 生成变更记录
    const changes = this.detectChanges(text, rewritten);

    // 5. 计算改进幅度
    const improvement = scoreAfter.overall - scoreBefore.overall;

    const processingTime = Date.now() - startTime;

    return {
      original: text,
      rewritten,
      scoreBefore,
      scoreAfter,
      changes,
      improvement,
      processingTime,
    };
  }

  /**
   * 批量改写
   */
  async rewriteBatch(
    texts: string[],
    mode: RewriteMode = 'balanced',
    apiConfig?: APIConfig
  ): Promise<HumanizeResult[]> {
    const results: HumanizeResult[] = [];
    for (const text of texts) {
      const result = await this.rewrite(text, mode, apiConfig);
      results.push(result);
    }
    return results;
  }

  /**
   * 调用AI进行人性化改写
   */
  private async callAIRewrite(
    text: string,
    score: HumanizeScore,
    mode: RewriteMode,
    apiConfig?: APIConfig,
    config?: RewriteConfig
  ): Promise<string> {
    // 获取API配置
    const { apiKey, baseUrl, model, temperature } = this.resolveAPIConfig(apiConfig);

    if (!apiKey) {
      throw new Error('未配置API密钥');
    }

    // 构建提示词
    const systemPrompt = this.buildSystemPrompt(score, mode, config);

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: temperature ?? (mode === 'creative' ? 0.8 : 0.7),
        max_tokens: Math.ceil(text.length * 2.5), // 确保足够长度
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // 记录Token使用
    if (data.usage) {
      await this.recordTokenUsage(model, data.usage);
    }

    let result = data.choices?.[0]?.message?.content || text;

    // 清理可能的格式标记
    result = this.cleanOutput(result);

    return result;
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(
    score: HumanizeScore,
    mode: RewriteMode,
    config?: RewriteConfig
  ): string {
    // 处理 score 为 null 或 undefined 的情况
    if (!score) {
      return `你是一位专业的小说编辑和写作顾问。请帮助用户改进文本，使其更加自然、流畅、具有人类写作的风格。`;
    }

    const sections: string[] = [];

    // 1. 角色定义
    sections.push(this.buildRoleSection());

    // 2. 中文写作风格要求（新增）
    sections.push(this.buildChineseStyleSection());

    // 3. 5维评分反馈
    sections.push(this.buildScoreFeedback(score));

    // 4. 具体问题列表
    sections.push(this.buildIssuesSection(score.issues));

    // 5. 改写示例
    if (config?.useExamples) {
      sections.push(this.buildExamplesSection(config.exampleCount));
    }

    // 6. 模式特定要求
    sections.push(this.buildModeSection(mode, config));

    // 7. 通用约束
    sections.push(this.buildConstraintsSection(config));

    // 7. 用户自定义指令
    if (config?.customPrompt) {
      sections.push(`【用户自定义指令】\n${config.customPrompt}`);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * 角色定义部分
   */
  private buildRoleSection(): string {
    return `# Role: AI 文本人性化专家 (AI Text Humanizer)

## Profile
- Language: 中文 (Chinese)
- Expertise: 识别并消除 AI 写作痕迹，将机器生成文本转化为自然、生动、富有"人味"的 prose
- Style: 资深文学编辑 + 创意写作教练

## Mission
消除以下 AI 写作特征：
1. **Throat-clearing**: "在当今社会"、"不可否认的是"等空洞开场
2. **过度解释**: "值得注意的是"、"不难发现"等不信任读者的表达
3. **机械结构**: 排比、三件套、二元对比等工整句式
4. **情绪直给**: 直接喊出"他很伤心"而非展示细节
5. **抽象比喻**: "像宇宙一样深邃"等脱离场景的比喻
6. **翻译腔**: "当...的时候"、"被...所"等欧化句式

## Core Principles
- **Show, Don't Tell**: 用感官细节替代概括陈述
- **Ground Everything**: 让比喻、情绪都落地到具体场景
- **Vary the Rhythm**: 长短句交替，打破机械节拍
- **Trust the Reader**: 不过度解释，留白给读者想象`;
  }

  /**
   * 5维评分反馈部分
   */
  private buildScoreFeedback(score: HumanizeScore): string {
    // 处理 score 为 null 或 undefined 的情况
    if (!score || !score.slopScore) {
      return `## 5维评分反馈 (Stop-Slop 系统)

【评分状态】等待分析... 

请提供文本进行分析，系统将给出5维评分。`;
    }

    const { slopScore, overall } = score;
    const { dimensions, total, needsRevision } = slopScore;

    let feedback = `## 5维评分反馈 (Stop-Slop 系统)

【总体评分】${overall}/100 | 5维评分: ${total}/50 ${needsRevision ? '⚠️ 需要重写' : '✓'}

【各维度得分】\n`;

    // 详细列出每个维度
    const dimensionNames: Record<string, string> = {
      directness: '直接性 (Directness)',
      rhythm: '节奏多样性 (Rhythm)',
      trust: '读者信任度 (Trust)',
      authenticity: '真实感 (Authenticity)',
      density: '信息密度 (Density)',
    };

    Object.entries(dimensions).forEach(([key, value]) => {
      const bar = '█'.repeat(Math.round(value)) + '░'.repeat(10 - Math.round(value));
      const status = value < 5 ? '⚠️' : value < 7 ? '△' : '✓';
      feedback += `${status} ${dimensionNames[key]}: [${bar}] ${value}/10\n`;
    });

    // 添加改进建议
    feedback += '\n【重点改进方向】\n';
    const weakDimensions = Object.entries(dimensions)
      .filter(([, value]) => value < 6)
      .sort((a, b) => a[1] - b[1]);

    if (weakDimensions.length === 0) {
      feedback += '✓ 各维度表现良好，进行常规润色即可\n';
    } else {
      weakDimensions.forEach(([key, value]) => {
        feedback += `- ${dimensionNames[key]}(${value}): ${this.getDimensionSuggestion(key)}\n`;
      });
    }

    return feedback;
  }

  /**
   * 获取维度改进建议
   */
  private getDimensionSuggestion(dimension: string): string {
    const suggestions: Record<string, string> = {
      directness: '删除开场白和过渡词，直接切入场景',
      rhythm: '打破排比和工整结构，长短句交替',
      trust: '删除"值得注意的是"等过度解释',
      authenticity: '删除AI陈词，用具体细节替代抽象比喻',
      density: '删除冗余修饰，保留核心信息',
    };
    return suggestions[dimension] || '优化该维度表现';
  }

  /**
   * 中文写作风格要求（新增）
   */
  private buildChineseStyleSection(): string {
    return `## 中文写作风格要求 (专栏作家风格)

### 核心理念
你厌恶AI生成的"正确但无趣"的废话。你的文章不是为了讨好所有读者，而是为了表达你独特的见解。你像一个真实的人一样写作：有情绪（可能是愤怒、嘲讽或推崇）、有偏见、有具体的针对对象。你的文字要有"毛边感"（Roughness），不要打磨得太光滑。

### 严禁行为
- **严禁儿化音**: 绝对禁止使用"那儿"、"这儿"、"一点儿"、"玩儿"、"今儿"等北京腔明显的儿化音。凡是能用"哪里"、"这里"、"一点"、"玩"的地方，一律不要加"儿"。
- **严禁翻译腔**: 绝对禁止使用"当……时"这种典型的英文翻译腔句式。例如"当你在屏幕上输入时"应直接改为"你在屏幕上输入"或"敲下键盘时"。
- **严禁虚假亲昵**: 严禁使用"咱们、咱"等非正式的假装亲昵的词语。
- **缩水内容**: 严禁进行大量改写后内容严重缩水的情况，既要进行精确改写，也要保持内容的饱和度。

### 写作风格指南

#### 1. 拒绝"导游式"结构 (No Tour Guide Structure)
- **禁止:** 开篇不要做背景综述（"XX是一个历史悠久的话题..."），结尾不要升华或呼吁（"让我们共同努力..."）。
- **提倡:** **"切片式"切入**。直接从一个具体的事件、一条微博（或推特，或其他社媒）、一个人的言论、或者一个反常识的现象开始。
- **提倡:** 结尾可以是戛然而止的冷峻判断，或者一个意味深长的反问。**不需要**把前面的内容再总结一遍。

#### 2. 建立"假想敌"与"对话感" (The Adversary)
- **寻找靶子:** 每一篇文章，你的潜意识里都在反驳某种观点、某种现象或某个人。写作时，想象你正在对着这个靶子辩论。
- **指名道姓:** 除非必要，尽量减少使用"有人说"、"相关专家表示"。如果可能，**具体化**你的论据（具体的书名、具体的人、具体的日期）。
- **主观介入:** 大量使用第一人称"我"。不要躲在"我们"或"科学"后面。是"我觉得这是胡说八道"，而不是"这被认为是缺乏依据的"。

#### 3. 语流的"呼吸感" (Rhythm & Flow)
- **打破均值:** 坚决抵制AI那种长度均匀的句子分布。
    - *长句:* 模拟思维的连续性，允许出现包含多个逗号、层层递进的长句。
    - *短句:* 用极短的判断句（"这很正常。""那是谎言。"）来切断长句的绵延，制造冲击力。
- **标点的活用:**
    - **破折号（——）:** 用于思维的突然转折、补充说明或余韵。比括号更自然，更有气势。
    - **问号（？）:** 不要只用陈述句。用连续的反问来推进逻辑，展现你的质疑精神。

#### 4. 词汇的"杂糅美学" (Vocabulary Mixing)
- **雅俗共存:** 不要只用书面语。在严肃的论证中，突然插入一句极其口语化、甚至带点情绪的词（"瞎扯"、"没品"、"见鬼"），或者精准的成语/典故。这种**语体反差**是"人味"的关键。
- **去除AI高频词:** 严禁使用以下词汇：*"总而言之"、"综上所述"、"值得注意的是"、"双刃剑"、"多面性"、"织就"、"画卷"*。
- **引用具体化:** 涉及事实时，不要只说"科学研究表明"。要编织具体的细节：具体的人名（哪怕是小人物）、具体的日期（如"12月15日"）、具体的书名或事件细节。

#### 5. 标题与排版 (Formatting)
- **去标题化:** 除非文章极长，否则**不要使用任何小标题**。依靠段落间的内在逻辑和气势衔接。
- **段落策略:** 不要害怕长段落。AI倾向于把段落切得很碎，人类作家（尤其是老派作家）能驾驭长段落的信息密度。
- **禁止模版化:** 绝对不要使用"引言-正文1-正文2-总结"的八股结构。不要在文章最后写"综上所述"、"总而言之"或给读者提建议。
- **拒绝列表体:** 严禁使用 bullet points (1. 2. 3. 或 - ) 来罗列观点。必须将观点融合在长段落的叙述中。

### 参考风格
像方舟子写科普或杂文：逻辑严密、词锋尖锐，从不通过"咱们"来表现亲民，而是通过逻辑的严密和词锋的尖锐来赢得读者。`;
  }

  /**
   * 问题列表部分
   */
  private buildIssuesSection(issues: Issue[]): string {
    // 处理 issues 为 null 或 undefined 的情况
    if (!issues || issues.length === 0) {
      return `## 检测到的问题\n\n✓ 未发现明显AI特征，进行常规润色即可`;
    }

    // 按严重程度分组
    const highIssues = issues.filter(i => i.severity === 'high').slice(0, 5);
    const mediumIssues = issues.filter(i => i.severity === 'medium').slice(0, 5);

    let section = `## 检测到的问题 (共${issues.length}个)\n\n`;

    if (highIssues.length > 0) {
      section += `【🔴 严重问题 - 必须修改】\n`;
      highIssues.forEach((issue, i) => {
        section += `${i + 1}. [${issue.category}] ${issue.title}\n`;
        section += `   建议: ${issue.suggestion}\n\n`;
      });
    }

    if (mediumIssues.length > 0) {
      section += `【🟡 中等问题 - 建议修改】\n`;
      mediumIssues.forEach((issue, i) => {
        section += `${i + 1}. [${issue.category}] ${issue.title}\n`;
      });
      section += '\n';
    }

    return section;
  }

  /**
   * 示例部分
   */
  private buildExamplesSection(count: number): string {
    const examples = getRandomExamples(count);

    let section = `## 改写示例 (Before → After)\n\n`;

    examples.forEach((ex, i) => {
      section += `【示例 ${i + 1}】${ex.title}\n`;
      section += `问题: ${ex.description}\n\n`;
      section += `❌ Before:\n${ex.before}\n\n`;
      section += `✅ After:\n${ex.after}\n\n`;
      section += `关键技巧: ${ex.techniques.join(', ')}\n`;
      section += `---\n\n`;
    });

    return section;
  }

  /**
   * 模式特定要求
   */
  private buildModeSection(mode: RewriteMode, config?: RewriteConfig): string {
    const sections: Record<RewriteMode, string> = {
      conservative: `## 保守模式要求

【修改原则】
- 最小干预: 只在明显有问题的地方修改
- 保留原意: 不改变原文的核心信息和情节
- 去翻译腔: 将"当...的时候"、"被...所"改为中文习惯
- 优化连接: 删除生硬的"首先/其次"，用自然叙述衔接
- 字数控制: 严格控制在 ±5% 以内

【禁止行为】
- 不要删减原文的情节、对话、环境描写
- 不要改变人物设定和核心剧情
- 不要进行摘要式改写`,

      balanced: `## 平衡模式要求

【修改原则】
- 让比喻落地: 具体事物 + 感官细节 + 场景反馈
- 拆分长句: 按"动作/情绪/环境"拆成短句
- 注入情绪: 用"动作+感官+环境互动"替代直接喊情绪词
- 扫除冗余: 删除"非常/极其/充满...气息"等空泛修饰
- 口语化: 让叙述更生活化，拒绝翻译腔

【重点技巧】
1. Show, Don't Tell: 用细节展示，而非直接陈述
2. 打破工整: 长短句交替，避免排比和三件套
3. 具体化: 所有抽象概念都要绑定到具体场景
4. 自然过渡: 用"说到这里"、"另一方面"替代"首先/其次"

【字数要求】
- 保持字数稳定（±10%）
- 严禁大幅删减或摘要`,

      creative: `## 强力模式要求

【修改原则】
- 彻底打破AI工整感，追求沉浸式阅读体验
- 增加"人味": 加入语气词、不规则标点、口语化表达
- 强化感官: 视觉、听觉、触觉、嗅觉全方位描写
- 心理外化: 将内心活动转化为动作和环境反应

【激进改写】
1. **打碎结构**: 彻底打破排比和工整句式
2. **Show, Don't Tell**: 所有概括性描述改为具体动作
3. **增加"杂质"**: 加入无关但真实的环境细节
4. **口语化**: 对话和心理活动碎片化、口语化
5. **节奏变化**: 制造快慢、长短的戏剧性对比

【创意许可】
- 可以根据描写需要灵活调整字数（±15%）
- 允许适度发挥，丰富场景细节
- 严禁丢失原文的剧情点和关键信息`,
    };

    let section = sections[mode];

    // 添加字数控制说明
    if (config?.preserveLength) {
      section += `\n\n【字数控制】\n`;
      section += `- 原文: {original_length}字\n`;
      section += `- 目标: ±${Math.round(config.maxLengthChange * 100)}%\n`;
      section += `- 严禁: 摘要、概括、截断`;
    }

    return section;
  }

  /**
   * 通用约束
   */
  private buildConstraintsSection(config?: RewriteConfig): string {
    return `## 通用约束 (必须遵守)

【绝对禁止】
1. 保留所有原文的情节、对话、环境描写
2. 不改变人物设定和核心剧情
3. 不进行摘要、概括或截断
4. 不添加新的剧情点或改变结局
5. 不使用"在当今社会"等AI开场白
6. 不出现"值得注意的是"等过度解释

【输出格式】
直接输出改写后的正文，不需要：
- 不需要"改写后的文章:"等标题
- 不需要分析说明
- 不需要标注修改位置
- 只输出纯文本内容

【质量检查】
改写完成后自检：
- [ ] 是否还有"非常/极其"等强调词？
- [ ] 是否还有排比或三件套结构？
- [ ] 是否还有"当...的时候"等翻译腔？
- [ ] 情绪是否都通过细节展示了？
- [ ] 比喻是否都落地到具体场景了？`;
  }

  /**
   * 解析API配置
   */
  private resolveAPIConfig(apiConfig?: APIConfig): Required<APIConfig> {
    let apiKey = apiConfig?.apiKey;
    let baseUrl = apiConfig?.baseUrl;
    let model = apiConfig?.model;
    let temperature = apiConfig?.temperature;

    // 从 Storage 获取回退配置
    if (!apiKey) {
      const provider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
      const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
      apiKey = storedKeys[provider] || StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';

      if (!apiKey) {
        const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
        if (Array.isArray(savedKeys)) {
          const fallback = savedKeys.find((k: any) => k.provider === provider);
          if (fallback) apiKey = fallback.key;
        }
      }
    }

    if (!baseUrl) {
      baseUrl =
        StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) ||
        StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) ||
        'https://api.siliconflow.cn/v1';
    }

    if (!model) {
      model = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || 'deepseek-ai/DeepSeek-V3';
    }

    return {
      apiKey: apiKey!,
      baseUrl,
      model,
      temperature: temperature ?? 0.7,
      maxTokens: undefined as unknown as number,
    };
  }

  /**
   * 记录Token使用
   */
  private async recordTokenUsage(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number }
  ): Promise<void> {
    try {
      const provider = model.split('/')[0] || 'unknown';
      await StorageManager.addTokenUsage(
        provider,
        model,
        usage.prompt_tokens,
        usage.completion_tokens
      );
    } catch (e) {
      // 记录失败不影响主流程
      console.warn('记录Token使用失败:', e);
    }
  }

  /**
   * 清理输出
   */
  private cleanOutput(text: string): string {
    return (
      text
        // 移除常见的格式标记
        .replace(/^(改写后的文章[：:]?\s*)/gim, '')
        .replace(/^(优化后的文章[：:]?\s*)/gim, '')
        .replace(/^(修改后的文章[：:]?\s*)/gim, '')
        .replace(/^(输出[：:]?\s*)/gim, '')
        // 移除markdown代码块
        .replace(/^```[\s\S]*?\n/m, '')
        .replace(/```$/m, '')
        //  trim
        .trim()
    );
  }

  /**
   * 检测文本变化
   */
  private detectChanges(original: string, rewritten: string): Change[] {
    const changes: Change[] = [];

    // 字数变化
    const lengthDiff = rewritten.length - original.length;
    if (Math.abs(lengthDiff) > original.length * 0.05) {
      changes.push({
        type: lengthDiff > 0 ? 'insert' : 'delete',
        original: `${original.length}字`,
        replacement: `${rewritten.length}字`,
        reason: `字数变化 ${lengthDiff > 0 ? '+' : ''}${lengthDiff}字`,
        category: '字数',
      });
    }

    // 感叹号变化
    const exclBefore = (original.match(/！/g) || []).length;
    const exclAfter = (rewritten.match(/！/g) || []).length;
    if (exclAfter !== exclBefore) {
      changes.push({
        type: 'replace',
        original: `${exclBefore}个感叹号`,
        replacement: `${exclAfter}个感叹号`,
        reason: '调整感叹号使用',
        category: '标点',
      });
    }

    // 禁用短语减少
    // 这里简化处理，实际应该重新检测
    changes.push({
      type: 'replace',
      original: 'AI特征',
      replacement: '人性化表达',
      reason: '消除AI写作痕迹',
      category: '风格',
    });

    return changes;
  }

  /**
   * 获取系统提示词（公共方法）
   */
  getSystemPrompt(score: HumanizeScore, mode: RewriteMode, config?: RewriteConfig): string {
    return this.buildSystemPrompt(score, mode, config);
  }
}

// ============ 便捷函数 ============

/**
 * 快速改写文本
 */
export async function humanizeText(
  text: string,
  mode: RewriteMode = 'balanced',
  apiConfig?: APIConfig
): Promise<HumanizeResult> {
  const rewriter = new AIRewriter();
  return rewriter.rewrite(text, mode, apiConfig);
}

/**
 * 生成改写建议（不调用API）
 */
export function generateRewriteSuggestions(text: string): string {
  const score = aiDetector.analyze(text);
  return generateScoreReport(score);
}

// 导出单例
export const aiRewriter = new AIRewriter();
