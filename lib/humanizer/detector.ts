/**
 * AI特征检测器 - 全面升级版本
 * 基于规则文件的模块化检测系统
 */

import {
  HumanizeScore,
  Issue,
  IssueType,
  IssueSeverity,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
  STRICT_DETECTION_CONFIG,
  LENIENT_DETECTION_CONFIG,
} from './types';
import { SlopScorer } from './scorer';
import {
  PHRASE_CATEGORIES,
  BANNED_OPENERS,
  BANNED_EMPHASIS,
  BANNED_JARGON,
  BANNED_TRANSITIONS,
  AI_CLICHES,
  EXAGGERATION_WORDS,
  TEMPORAL_ADVERBS,
  SURPRISE_WORDS,
  REDUNDANT_MODIFIERS,
} from './rules/phrases';
import {
  ALL_STRUCTURAL_PATTERNS,
  StructuralPattern,
} from './rules/structures';
import {
  ALL_PATTERNS,
  AIPattern,
} from './rules/patterns';
import {
  BANNED_BEIJING_ACCENTS,
  BANNED_TRANSLATIONESE,
  BANNED_FALSE_INTIMACY,
  AI_CLICHES_CHINESE,
  TOUR_GUIDE_OPENERS,
  TOUR_GUIDE_ENDINGS,
  MECHANICAL_TRANSITIONS,
  FALSE_OBJECTIVITY,
  WEIRD_SINGLE_CHAR_ADJECTIVES,
} from './rules/writer-style';

/**
 * AI 检测器 - 全面升级版本
 */
export class AIDetector {
  private config: DetectionConfig;
  private scorer: SlopScorer;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_DETECTION_CONFIG, ...config };
    this.scorer = new SlopScorer(this.config);
  }

  /**
   * 设置检测模式
   */
  setMode(mode: 'strict' | 'balanced' | 'lenient'): void {
    switch (mode) {
      case 'strict':
        this.config = { ...STRICT_DETECTION_CONFIG };
        break;
      case 'lenient':
        this.config = { ...LENIENT_DETECTION_CONFIG };
        break;
      default:
        this.config = { ...DEFAULT_DETECTION_CONFIG };
    }
    this.scorer = new SlopScorer(this.config);
  }

  /**
   * 分析文本并返回完整评分
   */
  analyze(text: string): HumanizeScore {
    const issues: Issue[] = [];

    // 1. 短语检测
    if (this.shouldCheckPhrases()) {
      issues.push(...this.detectPhrases(text));
    }

    // 2. 结构检测
    if (this.config.checkStructures) {
      issues.push(...this.detectStructures(text));
    }

    // 3. 模式检测
    if (this.config.checkPatterns) {
      issues.push(...this.detectPatterns(text));
    }

    // 4. 中文风格检测（新增）
    if (this.config.checkChineseStyle) {
      issues.push(...this.detectChineseStyle(text));
    }

    // 5. 传统检测（向后兼容）
    issues.push(...this.detectLegacyIssues(text));

    // 5. 计算评分
    const slopScore = this.scorer.calculateScore(text, issues);
    const breakdown = this.scorer.calculateLegacyBreakdown(text, issues);
    const overall = this.scorer.calculateOverallScore(slopScore, breakdown);

    // 6. 统计信息
    const stats = this.calculateStats(text, issues);

    return {
      overall,
      slopScore,
      breakdown,
      issues,
      stats,
    };
  }

  /**
   * 快速检测 - 只返回是否需要重写
   */
  quickCheck(text: string): { needsRevision: boolean; score: number } {
    const score = this.analyze(text);
    return {
      needsRevision: score.slopScore.needsRevision,
      score: score.overall,
    };
  }

  // ============ 短语检测 ============

  private shouldCheckPhrases(): boolean {
    return this.config.checkOpeners || 
           this.config.checkEmphasis || 
           this.config.checkJargon || 
           this.config.checkTransitions || 
           this.config.checkCliches;
  }

  private detectPhrases(text: string): Issue[] {
    const issues: Issue[] = [];

    // 开场白检测
    if (this.config.checkOpeners) {
      issues.push(...this.detectPhraseCategory(
        text, 
        'banned_opener', 
        BANNED_OPENERS, 
        '开场白',
        '删除 throat-clearing 开场白，直接切入场景'
      ));
    }

    // 强调词检测
    if (this.config.checkEmphasis) {
      issues.push(...this.detectPhraseCategory(
        text, 
        'banned_emphasis', 
        BANNED_EMPHASIS, 
        '强调词',
        '删除强调词，让事实自己说话'
      ));
    }

    // 术语检测
    if (this.config.checkJargon) {
      issues.push(...this.detectPhraseCategory(
        text, 
        'banned_jargon', 
        BANNED_JARGON, 
        '术语',
        '用通俗表达替代商业/学术术语'
      ));
    }

    // 过渡词检测
    if (this.config.checkTransitions) {
      issues.push(...this.detectPhraseCategory(
        text, 
        'banned_transition', 
        BANNED_TRANSITIONS, 
        '过渡词',
        '用自然叙述衔接替代生硬过渡'
      ));
    }

    // AI陈词检测
    if (this.config.checkCliches) {
      issues.push(...this.detectPhraseCategory(
        text, 
        'ai_cliche', 
        AI_CLICHES, 
        'AI陈词',
        '删除AI高频陈词，用原创表达'
      ));
    }

    // 其他类别（始终检测）
    issues.push(...this.detectPhraseCategory(
      text, 
      'exaggeration', 
      EXAGGERATION_WORDS, 
      '浮夸词',
      '用平实表达替代浮夸词汇'
    ));

    issues.push(...this.detectPhraseCategory(
      text, 
      'temporal_adverb', 
      TEMPORAL_ADVERBS, 
      '时间副词',
      '减少时间副词使用，让节奏自然'
    ));

    issues.push(...this.detectPhraseCategory(
      text, 
      'surprise_word', 
      SURPRISE_WORDS, 
      '惊讶词',
      '用细节展示惊讶，而非直接说出'
    ));

    issues.push(...this.detectPhraseCategory(
      text, 
      'redundant_modifier', 
      REDUNDANT_MODIFIERS, 
      '冗余修饰',
      '删除冗余结构，保留核心信息'
    ));

    return issues;
  }

  private detectPhraseCategory(
    text: string,
    type: IssueType,
    phrases: string[],
    category: string,
    suggestion: string,
    defaultSeverity?: IssueSeverity
  ): Issue[] {
    const issues: Issue[] = [];
    const detected = new Set<string>();

    for (const phrase of phrases) {
      // 处理包含...的模式
      const pattern = phrase.includes('……') 
        ? phrase.replace('……', '.+?')
        : phrase;
      
      const regex = new RegExp(pattern, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        // 避免重复报告同一短语
        if (detected.has(phrase)) continue;
        detected.add(phrase);

        const severity = defaultSeverity || this.calculatePhraseSeverity(phrase, type);
        
        if (this.shouldReportIssue(severity)) {
          issues.push({
            id: `${type}-${phrase}-${match.index}`,
            type,
            severity,
            title: `禁用${category}: "${phrase}"`,
            description: `检测到${category}类短语`,
            position: { start: match.index, end: match.index + match[0].length },
            excerpt: match[0],
            suggestion,
            category,
          });
        }
      }
    }

    return issues;
  }

  // ============ 结构检测 ============

  private detectStructures(text: string): Issue[] {
    const issues: Issue[] = [];

    for (const pattern of ALL_STRUCTURAL_PATTERNS) {
      const matches = this.matchStructuralPattern(text, pattern);
      
      for (const match of matches) {
        if (this.shouldReportIssue(pattern.severity)) {
          issues.push({
            id: `${pattern.id}-${match.index}`,
            type: pattern.id as IssueType,
            severity: pattern.severity,
            title: `${pattern.nameZh}: ${pattern.description}`,
            description: pattern.description,
            position: { start: match.index, end: match.index + match.length },
            excerpt: match.text,
            suggestion: pattern.suggestion,
            category: '结构问题',
          });
        }
      }
    }

    return issues;
  }

  private matchStructuralPattern(
    text: string, 
    pattern: StructuralPattern
  ): Array<{ index: number; length: number; text: string }> {
    const matches: Array<{ index: number; length: number; text: string }> = [];

    if (typeof pattern.pattern === 'function') {
      // 函数模式：返回布尔值，需要额外处理获取位置
      // 简化处理：如果匹配，报告整个文本
      if (pattern.pattern(text)) {
        matches.push({ index: 0, length: Math.min(100, text.length), text: text.slice(0, 100) });
      }
    } else {
      // 正则模式
      let match;
      const regex = new RegExp(pattern.pattern.source, 'g');
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[0],
        });
      }
    }

    return matches;
  }

  // ============ 模式检测 ============

  private detectPatterns(text: string): Issue[] {
    const issues: Issue[] = [];

    for (const pattern of ALL_PATTERNS) {
      const matches = [...text.matchAll(this.ensureMatchAllRegex(pattern.regex))];
      
      if (matches.length > 0) {
        // 对于累积型模式，根据匹配次数计算严重程度
        const severity = pattern.cumulative && matches.length > 3 
          ? 'high' 
          : pattern.cumulative && matches.length > 1 
            ? 'medium' 
            : 'low';

        if (this.shouldReportIssue(severity)) {
          // 只报告前3个匹配，避免过多重复
          matches.slice(0, 3).forEach((match, idx) => {
            issues.push({
              id: `${pattern.id}-${idx}`,
              type: pattern.id as IssueType,
              severity,
              title: `${pattern.name}${matches.length > 1 ? ` (${matches.length}次)` : ''}`,
              description: pattern.description,
              position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
              excerpt: match[0],
              suggestion: `减少${pattern.name}，让表达更自然`,
              category: '模式问题',
            });
          });
        }
      }
    }

    return issues;
  }

  // ============ 传统检测（向后兼容） ============

  private detectLegacyIssues(text: string): Issue[] {
    const issues: Issue[] = [];

    // 词汇重复检测
    issues.push(...this.detectRepetition(text));

    // 感叹号检测
    issues.push(...this.detectExclamation(text));

    return issues;
  }

  private detectRepetition(text: string): Issue[] {
    const issues: Issue[] = [];
    const words = this.extractWords(text);
    const windowSize = 100; // 检测窗口

    // 滑动窗口检测
    const wordPositions: Map<string, number[]> = new Map();

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.length < 2) continue;

      if (!wordPositions.has(word)) {
        wordPositions.set(word, []);
      }
      wordPositions.get(word)!.push(i);
    }

    // 检查重复词
    wordPositions.forEach((positions, word) => {
      if (positions.length >= 3) {
        // 检查是否在短距离内重复
        for (let i = 0; i < positions.length - 1; i++) {
          const distance = positions[i + 1] - positions[i];
          if (distance < 20) { // 20个词内重复
            issues.push({
              id: `repetition-${word}-${i}`,
              type: 'repetition',
              severity: 'medium',
              title: `词汇重复: "${word}"`,
              description: `该词在短距离内出现了${positions.length}次`,
              position: { start: 0, end: 0 },
              excerpt: word,
              suggestion: `使用同义词替换或省略`,
              category: '重复问题',
            });
            break;
          }
        }
      }
    });

    return issues;
  }

  private detectExclamation(text: string): Issue[] {
    const issues: Issue[] = [];

    const exclamations = (text.match(/！/g) || []).length;
    const allPunctuation = (text.match(/[。！？，、；：]/g) || []).length;

    if (allPunctuation === 0) return issues;

    const ratio = exclamations / allPunctuation;

    if (ratio > 0.3) {
      issues.push({
        id: 'exclamation-overall',
        type: 'exclamation',
        severity: ratio > 0.5 ? 'high' : 'medium',
        title: '感叹号使用过多',
        description: `感叹号占标点${(ratio * 100).toFixed(1)}%，正常人写作约为10-20%`,
        position: { start: 0, end: 0 },
        excerpt: '',
        suggestion: '将部分感叹号改为句号或逗号，保持语气平和',
        category: '标点问题',
      });
    }

    return issues;
  }

  // ============ 中文风格检测（新增） ============

  private detectChineseStyle(text: string): Issue[] {
    const issues: Issue[] = [];
    const config = this.config.chineseStyleConfig;

    // 1. 儿化音检测
    if (config.checkBeijingAccent) {
      issues.push(...this.detectPhraseCategory(
        text,
        'beijing_accent',
        BANNED_BEIJING_ACCENTS,
        '儿化音',
        '删除儿化音，使用标准表达（如"那儿"→"那里"）',
        'high'
      ));
    }

    // 2. 翻译腔检测
    if (config.checkTranslationese) {
      issues.push(...this.detectPhraseCategory(
        text,
        'translationese_cn',
        BANNED_TRANSLATIONESE,
        '翻译腔',
        '改为地道中文表达，删除"当……时"、"被……所"等结构',
        'high'
      ));
    }

    // 3. 虚假亲昵检测
    if (config.checkFalseIntimacy) {
      issues.push(...this.detectPhraseCategory(
        text,
        'false_intimacy',
        BANNED_FALSE_INTIMACY,
        '虚假亲昵',
        '删除"咱们"、"咱"等虚假亲昵词，保持观察者距离',
        'medium'
      ));
    }

    // 4. AI陈词检测（中文特供版）
    if (config.checkAICliches) {
      issues.push(...this.detectPhraseCategory(
        text,
        'ai_cliche_cn',
        AI_CLICHES_CHINESE,
        'AI陈词',
        '删除AI高频陈词，使用原创表达',
        'medium'
      ));
    }

    // 5. 导游式开场检测
    if (config.checkTourGuideStructure) {
      issues.push(...this.detectPhraseCategory(
        text,
        'tour_guide_opener',
        TOUR_GUIDE_OPENERS,
        '导游式开场',
        '拒绝背景综述，使用"切片式"切入，从具体事件开始',
        'medium'
      ));
    }

    // 6. 导游式结尾检测
    if (config.checkTourGuideStructure) {
      issues.push(...this.detectPhraseCategory(
        text,
        'tour_guide_ending',
        TOUR_GUIDE_ENDINGS,
        '导游式结尾',
        '删除升华和呼吁，使用戛然而止的冷峻判断或反问',
        'medium'
      ));
    }

    // 7. 生硬过渡检测
    if (config.checkMechanicalTransitions) {
      issues.push(...this.detectPhraseCategory(
        text,
        'mechanical_transition_cn',
        MECHANICAL_TRANSITIONS,
        '生硬过渡',
        '删除"此外"、"另外"等连接词，让逻辑自然流动',
        'low'
      ));
    }

    // 8. 虚假客观检测
    if (config.checkFalseObjectivity) {
      issues.push(...this.detectPhraseCategory(
        text,
        'false_objectivity',
        FALSE_OBJECTIVITY,
        '虚假客观',
        '删除"有人认为"、"专家表示"，直接使用"我"的观点',
        'low'
      ));
    }

    // 9. 诡异单字形容词检测
    if (config.checkSingleCharAdjectives) {
      issues.push(...this.detectWeirdSingleCharAdjectives(text));
    }

    return issues;
  }

  private detectWeirdSingleCharAdjectives(text: string): Issue[] {
    const issues: Issue[] = [];

    for (const item of WEIRD_SINGLE_CHAR_ADJECTIVES) {
      const matches = [...text.matchAll(this.ensureMatchAllRegex(item.pattern))];
      matches.forEach((match, idx) => {
        issues.push({
          id: `weird_single_char-${idx}`,
          type: 'weird_single_char',
          severity: 'medium',
          title: '诡异单字形容词',
          description: '单字形容词用法不符合中文习惯',
          position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
          excerpt: match[0],
          suggestion: `改为: ${item.suggestion}`,
          category: '用词问题',
        });
      });
    }

    return issues;
  }

  // ============ 辅助方法 ============

  private ensureMatchAllRegex(regex: RegExp): RegExp {
    if (regex.global || regex.sticky) return regex;
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    return new RegExp(regex.source, flags);
  }

  private calculatePhraseSeverity(phrase: string, type: IssueType): IssueSeverity {
    // 开场白和AI陈词通常更严重
    if (type === 'banned_opener' || type === 'ai_cliche') {
      return 'high';
    }
    // 强调词和过渡词中等
    if (type === 'banned_emphasis' || type === 'banned_transition') {
      return 'medium';
    }
    return 'low';
  }

  private shouldReportIssue(severity: IssueSeverity): boolean {
    const levels = { low: 1, medium: 2, high: 3 };
    const minLevel = levels[this.config.minIssueSeverity];
    const issueLevel = levels[severity];
    return issueLevel >= minLevel;
  }

  private calculateStats(text: string, issues: Issue[]): HumanizeScore['stats'] {
    const bannedPhrases = issues.filter(i => 
      i.type.startsWith('banned_') || 
      i.type === 'ai_cliche' ||
      i.type === 'exaggeration' ||
      i.type === 'temporal_adverb' ||
      i.type === 'surprise_word' ||
      i.type === 'redundant_modifier'
    ).length;

    const structuralIssues = issues.filter(i => 
      i.category === '结构问题'
    ).length;

    const patternMatches = issues.filter(i => 
      i.category === '模式问题'
    ).length;

    const highSeverityIssues = issues.filter(i => 
      i.severity === 'high'
    ).length;

    return {
      totalPhrases: this.extractWords(text).length,
      bannedPhrases,
      structuralIssues,
      patternMatches,
      highSeverityIssues,
    };
  }

  private extractWords(text: string): string[] {
    return text.split(/[\s，。！？、；：""''【】（）《》\n]+/)
      .filter(w => w.length >= 2);
  }
}

// ============ 便捷函数 ============

/**
 * 快速分析文本
 */
export function analyzeText(text: string, mode?: 'strict' | 'balanced' | 'lenient'): HumanizeScore {
  const detector = new AIDetector();
  if (mode) detector.setMode(mode);
  return detector.analyze(text);
}

/**
 * 批量分析多个文本
 */
export function analyzeBatch(texts: string[]): HumanizeScore[] {
  const detector = new AIDetector();
  return texts.map(text => detector.analyze(text));
}

/**
 * 快速检测 - 只返回是否需要重写
 */
export function quickCheck(text: string): { needsRevision: boolean; score: number } {
  const detector = new AIDetector();
  return detector.quickCheck(text);
}

// 导出单例
export const aiDetector = new AIDetector();
