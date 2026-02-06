// 根据当前写作内容动态检索相关记忆

import {
  CharacterMemory,
  ChapterEvent,
  WorldBuildingMemory,
  PlotMemory,
  StyleMemory,
  BookMemory,
} from './types';

// ==================== 查询定义 ====================

export interface ContextQuery {
  text: string;              // 查询文本
  currentChapterId?: string; // 当前章节ID
  currentScene?: string;     // 当前场景描述
  involvedCharacters?: string[]; // 涉及的角色名称
  queryType: 'writing' | 'question' | 'continuation' | 'polish';
  recentContent?: string;    // 最近写作的内容（用于continuation）
}

// ==================== 检索结果 ====================

export interface RetrievedContext {
  source: 'character' | 'event' | 'world' | 'style' | 'plot';
  id: string;
  title: string;
  content: string;
  relevanceScore: number;    // 相关性分数 0-1
  importance: number;        // 重要性 0-1
  lastAccessed: number;      // 最后访问时间
  accessCount: number;       // 访问次数
  metadata?: Record<string, any>;
}

// ==================== 动态上下文 ====================

export interface DynamicContext {
  characters: RetrievedContext[];
  events: RetrievedContext[];
  worldBuilding: RetrievedContext[];
  style: RetrievedContext[];
  plots: RetrievedContext[];
  totalTokens: number;
  query: ContextQuery;
}

// ==================== 上下文发现引擎 ====================

export class ContextDiscoveryEngine {
  private bookMemory: BookMemory;
  private accessHistory: Map<string, { count: number; lastTime: number }> = new Map();

  constructor(bookMemory: BookMemory) {
    this.bookMemory = bookMemory;
  }

  // ==================== 主入口：发现上下文 ====================

  async discoverContext(query: ContextQuery): Promise<DynamicContext> {
    // 1. 分析查询，提取关键信息
    const analysis = this.analyzeQuery(query);

    // 2. 并行检索各个维度的记忆
    const [
      characters,
      events,
      worldBuilding,
      style,
      plots,
    ] = await Promise.all([
      this.retrieveCharacters(query, analysis),
      this.retrieveEvents(query, analysis),
      this.retrieveWorldBuilding(query, analysis),
      this.retrieveStyle(query, analysis),
      this.retrievePlots(query, analysis),
    ]);

    // 3. 计算预估token数
    const totalTokens = this.estimateTokens([
      ...characters,
      ...events,
      ...worldBuilding,
      ...style,
      ...plots,
    ]);

    // 4. 如果超出限制，进行智能截断
    const maxTokens = 2000; // 最大上下文token数
    let finalContext: DynamicContext = {
      characters,
      events,
      worldBuilding,
      style,
      plots,
      totalTokens,
      query,
    };

    if (totalTokens > maxTokens) {
      finalContext = this.truncateContext(finalContext, maxTokens);
    }

    // 5. 更新访问历史
    this.updateAccessHistory(finalContext);

    return finalContext;
  }

  // ==================== 查询分析 ====================

  private analyzeQuery(query: ContextQuery): QueryAnalysis {
    const text = query.text.toLowerCase();

    // 提取提到的角色名
    const mentionedCharacters = this.bookMemory.characters
      .filter(c =>
        text.includes(c.name.toLowerCase()) ||
        c.aliases.some(a => text.includes(a.toLowerCase()))
      )
      .map(c => c.name);

    // 提取关键词（简单实现，可以用更复杂的NLP）
    const keywords = this.extractKeywords(text);

    // 检测场景类型
    const sceneType = this.detectSceneType(text);

    // 检测情绪基调
    const emotionTone = this.detectEmotionTone(text);

    return {
      mentionedCharacters,
      keywords,
      sceneType,
      emotionTone,
      hasAction: /战斗|打|杀|逃|追/.test(query.text),
      hasDialogue: /对话|说|问|答/.test(query.text),
      hasDescription: /描写|场景|环境/.test(query.text),
    };
  }

  private extractKeywords(text: string): string[] {
    // 简单的关键词提取，实际可以用TF-IDF或更复杂的方法
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    return words.filter(w => !stopWords.has(w) && w.length >= 2).slice(0, 10);
  }

  private detectSceneType(text: string): string {
    if (/战斗|打|杀|斗|战/.test(text)) return 'action';
    if (/对话|谈|聊|说/.test(text)) return 'dialogue';
    if (/突破|修炼|练功/.test(text)) return 'cultivation';
    if (/感情|爱|喜欢|表白/.test(text)) return 'romance';
    if (/阴谋|算计|谋划/.test(text)) return 'intrigue';
    return 'general';
  }

  private detectEmotionTone(text: string): string {
    if (/紧张|危险|危机|急/.test(text)) return 'tense';
    if (/悲伤|哭|泪|痛/.test(text)) return 'sad';
    if (/开心|笑|喜|乐/.test(text)) return 'happy';
    if (/愤怒|恨|怒|气/.test(text)) return 'angry';
    if (/恐怖|怕|吓|恐惧/.test(text)) return 'fear';
    return 'neutral';
  }

  // ==================== 角色检索 ====================

  private async retrieveCharacters(
    query: ContextQuery,
    analysis: QueryAnalysis
  ): Promise<RetrievedContext[]> {
    const results: RetrievedContext[] = [];

    for (const char of this.bookMemory.characters) {
      let score = 0;
      const reasons: string[] = [];

      // 1. 直接提及（最高权重）
      if (analysis.mentionedCharacters.includes(char.name)) {
        score += 1.0;
        reasons.push('直接提及');
      }

      // 2. 角色关系
      if (query.involvedCharacters?.some(name =>
        char.relationships.some(r => r.characterName === name)
      )) {
        score += 0.7;
        reasons.push('关系角色');
      }

      // 3. 主角/反派优先级
      if (char.role === 'protagonist') {
        score += 0.3;
        reasons.push('主角');
      } else if (char.role === 'antagonist') {
        score += 0.25;
        reasons.push('反派');
      }

      // 4. 访问频率（最近常用的角色更相关）
      const access = this.accessHistory.get(char.id);
      if (access) {
        const recency = Math.exp(-(Date.now() - access.lastTime) / (1000 * 60 * 60)); // 1小时衰减
        score += recency * 0.2;
      }

      // 5. 关键词匹配
      const charText = `${char.name} ${char.personality.traits.join(' ')} ${char.background.motivation}`;
      const keywordMatch = analysis.keywords.filter(k => charText.includes(k)).length;
      score += keywordMatch * 0.1;

      if (score > 0.2) {
        results.push({
          source: 'character',
          id: char.id,
          title: char.name,
          content: this.formatCharacterContent(char),
          relevanceScore: Math.min(score, 1.0),
          importance: char.role === 'protagonist' ? 1.0 : 0.7,
          lastAccessed: access?.lastTime || 0,
          accessCount: access?.count || 0,
          metadata: { role: char.role, reasons },
        });
      }
    }

    // 按分数排序，取前5个
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  private formatCharacterContent(char: CharacterMemory): string {
    const parts: string[] = [
      `姓名: ${char.name}`,
      `角色: ${char.role === 'protagonist' ? '主角' : char.role === 'antagonist' ? '反派' : '配角'}`,
    ];

    if (char.aliases.length > 0) {
      parts.push(`别名: ${char.aliases.join(', ')}`);
    }

    if (char.personality.traits.length > 0) {
      parts.push(`性格: ${char.personality.traits.join('、')}`);
    }

    if (char.background.motivation) {
      parts.push(`动机: ${char.background.motivation}`);
    }

    if (char.development.currentState) {
      parts.push(`当前状态: ${char.development.currentState}`);
    }

    if (char.relationships.length > 0) {
      parts.push(`关系: ${char.relationships.map(r => `${r.characterName}(${r.relationship})`).join(', ')}`);
    }

    return parts.join('\n');
  }

  // ==================== 事件检索 ====================

  private async retrieveEvents(
    query: ContextQuery,
    analysis: QueryAnalysis
  ): Promise<RetrievedContext[]> {
    const results: RetrievedContext[] = [];

    // 获取最近的事件
    const recentEvents = this.bookMemory.eventHistory.slice(-10);

    for (const event of recentEvents) {
      let score = 0;

      // 1. 时间衰减（越近的事件越重要）
      const index = recentEvents.indexOf(event);
      score += (1 - index / recentEvents.length) * 0.5;

      // 2. 角色关联
      const eventChars = event.keyEvents.join(' ');
      if (analysis.mentionedCharacters.some(name => eventChars.includes(name))) {
        score += 0.4;
      }

      // 3. 关键词匹配
      const keywordMatch = analysis.keywords.filter(k =>
        event.summary.includes(k) || event.keyEvents.some(e => e.includes(k))
      ).length;
      score += keywordMatch * 0.15;

      // 4. 当前章节关联
      if (query.currentChapterId && event.chapterId === query.currentChapterId) {
        score += 0.3;
      }

      if (score > 0.3) {
        const access = this.accessHistory.get(event.chapterId);
        results.push({
          source: 'event',
          id: event.chapterId,
          title: event.chapterName,
          content: `${event.summary}\n关键事件: ${event.keyEvents.join('; ')}`,
          relevanceScore: Math.min(score, 1.0),
          importance: 0.8,
          lastAccessed: access?.lastTime || 0,
          accessCount: access?.count || 0,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
  }

  // ==================== 世界观检索 ====================

  private async retrieveWorldBuilding(
    query: ContextQuery,
    analysis: QueryAnalysis
  ): Promise<RetrievedContext[]> {
    const results: RetrievedContext[] = [];

    for (const wb of this.bookMemory.worldBuilding) {
      let score = 0;

      // 1. 关键词匹配
      const keywordMatch = analysis.keywords.filter(k =>
        wb.name.includes(k) || wb.description.includes(k)
      ).length;
      score += keywordMatch * 0.3;

      // 2. 场景类型匹配
      if (analysis.sceneType === 'cultivation' && wb.category === 'cultivation_system') {
        score += 0.5;
      }

      // 3. 访问频率
      const access = this.accessHistory.get(wb.id);
      if (access) {
        score += Math.min(access.count * 0.05, 0.2);
      }

      if (score > 0.2) {
        results.push({
          source: 'world',
          id: wb.id,
          title: wb.name,
          content: `${wb.description}\n${JSON.stringify(wb.details, null, 2)}`,
          relevanceScore: Math.min(score, 1.0),
          importance: 0.6,
          lastAccessed: access?.lastTime || 0,
          accessCount: access?.count || 0,
          metadata: { category: wb.category },
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
  }

  // ==================== 风格检索 ====================

  private async retrieveStyle(
    query: ContextQuery,
    analysis: QueryAnalysis
  ): Promise<RetrievedContext[]> {
    const results: RetrievedContext[] = [];

    for (const style of this.bookMemory.styles) {
      let score = 0;

      // 1. 情绪基调匹配
      if (style.category === 'tone' && style.preference.includes(analysis.emotionTone)) {
        score += 0.6;
      }

      // 2. 查询类型匹配
      if (query.queryType === 'dialogue' && style.category === 'dialogue_style') {
        score += 0.5;
      }

      // 3. 重要性权重
      score += style.strength * 0.1;

      if (score > 0.3) {
        const access = this.accessHistory.get(style.id);
        results.push({
          source: 'style',
          id: style.id,
          title: `${style.category}: ${style.preference}`,
          content: `风格: ${style.preference}\n示例: ${style.examples.slice(0, 2).join('\n')}`,
          relevanceScore: Math.min(score, 1.0),
          importance: style.strength / 10,
          lastAccessed: access?.lastTime || 0,
          accessCount: access?.count || 0,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 2);
  }

  // ==================== 剧情检索 ====================

  private async retrievePlots(
    query: ContextQuery,
    analysis: QueryAnalysis
  ): Promise<RetrievedContext[]> {
    const results: RetrievedContext[] = [];

    for (const plot of this.bookMemory.plots) {
      if (plot.status !== 'ongoing') continue;

      let score = 0;

      // 1. 角色关联
      if (analysis.mentionedCharacters.some(name =>
        plot.involvedCharacters.includes(name)
      )) {
        score += 0.6;
      }

      // 2. 关键词匹配
      const keywordMatch = analysis.keywords.filter(k =>
        plot.title.includes(k) || plot.description.includes(k)
      ).length;
      score += keywordMatch * 0.2;

      // 3. 活跃剧情优先
      score += 0.3;

      if (score > 0.3) {
        const access = this.accessHistory.get(plot.id);
        results.push({
          source: 'plot',
          id: plot.id,
          title: plot.title,
          content: `${plot.description}\n涉及角色: ${plot.involvedCharacters.join(', ')}`,
          relevanceScore: Math.min(score, 1.0),
          importance: 0.9,
          lastAccessed: access?.lastTime || 0,
          accessCount: access?.count || 0,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 2);
  }

  // ==================== 上下文截断 ====================

  private truncateContext(context: DynamicContext, maxTokens: number): DynamicContext {
    // 按重要性排序所有上下文
    const allContexts: RetrievedContext[] = [
      ...context.characters,
      ...context.events,
      ...context.worldBuilding,
      ...context.style,
      ...context.plots,
    ].sort((a, b) => {
      // 综合分数 = 相关性 * 重要性
      const scoreA = a.relevanceScore * a.importance;
      const scoreB = b.relevanceScore * b.importance;
      return scoreB - scoreA;
    });

    // 逐步移除低分上下文直到满足token限制
    let currentTokens = context.totalTokens;
    const toRemove = new Set<string>();

    for (const ctx of allContexts.reverse()) {
      if (currentTokens <= maxTokens) break;
      const ctxTokens = this.estimateTokens([ctx]);
      toRemove.add(ctx.id);
      currentTokens -= ctxTokens;
    }

    return {
      characters: context.characters.filter(c => !toRemove.has(c.id)),
      events: context.events.filter(e => !toRemove.has(e.id)),
      worldBuilding: context.worldBuilding.filter(w => !toRemove.has(w.id)),
      style: context.style.filter(s => !toRemove.has(s.id)),
      plots: context.plots.filter(p => !toRemove.has(p.id)),
      totalTokens: currentTokens,
      query: context.query,
    };
  }

  // ==================== Token估算 ====================

  private estimateTokens(contexts: RetrievedContext[]): number {
    // 简单估算：中文字符数 / 2 + 英文单词数
    let totalChars = 0;
    for (const ctx of contexts) {
      totalChars += ctx.content.length;
    }
    return Math.ceil(totalChars / 2);
  }

  // ==================== 访问历史更新 ====================

  private updateAccessHistory(context: DynamicContext): void {
    const now = Date.now();
    const allContexts = [
      ...context.characters,
      ...context.events,
      ...context.worldBuilding,
      ...context.style,
      ...context.plots,
    ];

    for (const ctx of allContexts) {
      const existing = this.accessHistory.get(ctx.id);
      this.accessHistory.set(ctx.id, {
        count: (existing?.count || 0) + 1,
        lastTime: now,
      });
    }
  }

  // ==================== 提示词构建 ====================

  buildPrompt(context: DynamicContext): string {
    const sections: string[] = [];

    // 角色信息
    if (context.characters.length > 0) {
      sections.push(`【相关角色】
${context.characters.map(c =>
        `${c.title} (相关度: ${Math.round(c.relevanceScore * 100)}%)
${c.content}`
      ).join('\n\n')}`);
    }

    // 前文事件
    if (context.events.length > 0) {
      sections.push(`【前文回顾】
${context.events.map(e =>
        `${e.title}: ${e.content.split('\n')[0]}`
      ).join('\n')}`);
    }

    // 世界观设定
    if (context.worldBuilding.length > 0) {
      sections.push(`【相关设定】
${context.worldBuilding.map(w =>
        `${w.title}: ${w.content.split('\n')[0]}`
      ).join('\n')}`);
    }

    // 活跃剧情
    if (context.plots.length > 0) {
      sections.push(`【剧情线索】
${context.plots.map(p =>
        `${p.title}: ${p.content}`
      ).join('\n\n')}`);
    }

    // 风格指导
    if (context.style.length > 0) {
      sections.push(`【风格指导】
${context.style.map(s => s.content).join('\n')}`);
    }

    return sections.join('\n\n');
  }
}

// ==================== 辅助类型 ====================

interface QueryAnalysis {
  mentionedCharacters: string[];
  keywords: string[];
  sceneType: string;
  emotionTone: string;
  hasAction: boolean;
  hasDialogue: boolean;
  hasDescription: boolean;
}
