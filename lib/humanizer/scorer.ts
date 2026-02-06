/**
 * 5维评分系统 - 参考 stop-slop 设计
 * 实现 Directness, Rhythm, Trust, Authenticity, Density 五个维度的评分
 */

import {
  SlopDimensions,
  SlopScore,
  Issue,
  IssueType,
  HumanizeScore,
  LegacyBreakdown,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
} from './types';
import {
  ALL_BANNED_PHRASES,
  PHRASE_CATEGORIES,
  BANNED_OPENERS,
  BANNED_EMPHASIS,
  AI_CLICHES,
} from './rules/phrases';
import { ALL_STRUCTURAL_PATTERNS } from './rules/structures';
import { ALL_PATTERNS } from './rules/patterns';

/**
 * 5维评分计算器
 */
export class SlopScorer {
  private config: DetectionConfig;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_DETECTION_CONFIG, ...config };
  }

  /**
   * 计算完整的 5维评分
   */
  calculateScore(text: string, issues: Issue[]): SlopScore {
    const dimensions = this.calculateDimensions(text, issues);
    const total = Object.values(dimensions).reduce((sum, score) => sum + score, 0);
    
    return {
      dimensions,
      total,
      threshold: this.config.slopThreshold,
      needsRevision: total < this.config.slopThreshold,
    };
  }

  /**
   * 分别计算5个维度
   */
  private calculateDimensions(text: string, issues: Issue[]): SlopDimensions {
    return {
      directness: this.scoreDirectness(text, issues),
      rhythm: this.scoreRhythm(text, issues),
      trust: this.scoreTrust(text, issues),
      authenticity: this.scoreAuthenticity(text, issues),
      density: this.scoreDensity(text, issues),
    };
  }

  /**
   * 直接性评分 (0-10)
   * 评估：是否直接陈述，而非宣告/铺垫
   * 扣分项：开场白、过度解释、总结性陈述
   */
  private scoreDirectness(text: string, issues: Issue[]): number {
    let score = 10;
    const sentences = this.splitSentences(text);
    
    // 检测开场白（开头50字内）
    const openerIssues = issues.filter(i => 
      i.type === 'banned_opener' && i.position.start < 50
    );
    score -= openerIssues.length * 2;

    // 检测过度总结
    const summaryIssues = issues.filter(i => 
      i.type === 'over_summary' || i.type === 'summary'
    );
    score -= summaryIssues.length * 1.5;

    // 检测修辞性设问
    const qaIssues = issues.filter(i => i.type === 'qa_setup');
    score -= qaIssues.length * 1;

    // 检测列表式叙述
    const listIssues = issues.filter(i => i.type === 'list_narrative');
    score -= listIssues.length * 2;

    // 检测开头是否直接切入场景
    const firstSentence = sentences[0] || '';
    const hasDirectOpening = !BANNED_OPENERS.some(opener => 
      firstSentence.includes(opener)
    );
    if (!hasDirectOpening) score -= 2;

    // 检测是否使用"让我们"等引导词
    const guideWords = (text.match(/让我们|让我们一起|让我们共同/g) || []).length;
    score -= guideWords * 0.5;

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 节奏多样性评分 (0-10)
   * 评估：句式是否多样，避免机械节奏
   * 扣分项：排比、句长一致、节拍化结尾
   */
  private scoreRhythm(text: string, issues: Issue[]): number {
    let score = 10;
    const sentences = this.splitSentences(text);
    
    // 检测排比结构
    const parallelIssues = issues.filter(i => 
      i.type === 'triple_pattern' || 
      i.type === 'parallel_structure' ||
      i.type === 'parallelism'
    );
    score -= parallelIssues.length * 2;

    // 检测句长一致性
    const lengths = sentences.map(s => s.length);
    const variance = this.calculateVariance(lengths);
    if (variance < 50) score -= 2; // 句长过于相似

    // 检测节拍化结尾
    const endingIssues = issues.filter(i => i.type === 'metronomic_ending');
    score -= endingIssues.length * 1.5;

    // 检测戏剧化断句
    const fragmentIssues = issues.filter(i => i.type === 'dramatic_fragments');
    score -= fragmentIssues.length * 1;

    // 检测逗号节奏
    const commaRhythmIssues = issues.filter(i => i.type === 'comma_rhythm');
    score -= commaRhythmIssues.length * 1;

    // 计算长短句交替程度
    let alternationScore = 0;
    for (let i = 1; i < lengths.length; i++) {
      const diff = Math.abs(lengths[i] - lengths[i - 1]);
      if (diff > 10) alternationScore++;
    }
    const alternationRate = alternationScore / Math.max(lengths.length - 1, 1);
    score += alternationRate * 2; // 长短交替加分

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 读者信任度评分 (0-10)
   * 评估：是否尊重读者智商，避免过度解释
   * 扣分项：强调词、过滤词、过度总结
   */
  private scoreTrust(text: string, issues: Issue[]): number {
    let score = 10;

    // 检测强调拐杖
    const emphasisIssues = issues.filter(i => i.type === 'banned_emphasis');
    score -= emphasisIssues.length * 0.5;

    // 检测过滤词（削弱叙述的词）
    const filterIssues = issues.filter(i => 
      i.type === 'filter_words' || i.type === 'telling_not_showing'
    );
    score -= filterIssues.length * 1.5;

    // 检测"值得注意的是"等不信任读者的表达
    const distrustPhrases = [...AI_CLICHES].filter(phrase => 
      text.includes(phrase)
    );
    score -= distrustPhrases.length * 0.3;

    // 检测反问句（试图引导读者）
    const rhetoricalIssues = issues.filter(i => i.type === 'rhetorical_question');
    score -= rhetoricalIssues.length * 0.5;

    // 检测"显而易见"等居高临下的表达
    const condescendingPatterns = /显而易见|不言而喻|理所当然|毋庸置疑/g;
    const condescendingCount = (text.match(condescendingPatterns) || []).length;
    score -= condescendingCount * 0.5;

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 真实感评分 (0-10)
   * 评估：是否像真人写作，而非AI生成
   * 扣分项：AI陈词、翻译腔、情绪直给、中文风格问题
   */
  private scoreAuthenticity(text: string, issues: Issue[]): number {
    let score = 10;

    // 检测AI陈词滥调
    const clicheIssues = issues.filter(i => i.type === 'ai_cliche');
    score -= clicheIssues.length * 1;

    // 检测翻译腔
    const translationIssues = issues.filter(i => i.type === 'translationese');
    score -= translationIssues.length * 1.5;

    // 检测情绪直给
    const emotionIssues = issues.filter(i => 
      i.type === 'direct_emotion' || i.type === 'emotion_floating'
    );
    score -= emotionIssues.length * 1.5;

    // 检测抽象比喻
    const metaphorIssues = issues.filter(i => i.type === 'abstract_metaphor');
    score -= metaphorIssues.length * 1;

    // 检测商业术语
    const jargonIssues = issues.filter(i => i.type === 'banned_jargon');
    score -= jargonIssues.length * 1;

    // 检测形容词堆砌
    const adjIssues = issues.filter(i => i.type === 'adjective_stacking');
    score -= adjIssues.length * 0.5;

    // 检测副词滥用
    const adverbIssues = issues.filter(i => i.type === 'adverb_overuse');
    score -= adverbIssues.length * 0.3;

    // 检测中文风格问题（新增）
    const chineseStyleIssues = issues.filter(i => 
      i.type === 'beijing_accent' ||
      i.type === 'translationese_cn' ||
      i.type === 'false_intimacy' ||
      i.type === 'ai_cliche_cn' ||
      i.type === 'tour_guide_opener' ||
      i.type === 'tour_guide_ending' ||
      i.type === 'mechanical_transition_cn' ||
      i.type === 'false_objectivity' ||
      i.type === 'weird_single_char'
    );
    score -= chineseStyleIssues.length * 0.8;

    // 检测是否有"人味"特征（如口语化、不完美）
    const humanMarkers = [
      /[嗯啊哦呢吧嘛]/g,  // 语气词
      /[…~—]/g,          // 不规则标点
      /[^，。！？]{1,5}[，。]/g, // 超短句
    ];
    let humanScore = 0;
    humanMarkers.forEach(pattern => {
      humanScore += (text.match(pattern) || []).length * 0.1;
    });
    score += Math.min(humanScore, 2); // 最多加2分

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 信息密度评分 (0-10)
   * 评估：是否有废话，信息是否紧凑
   * 扣分项：冗余修饰、重复、被动语态
   */
  private scoreDensity(text: string, issues: Issue[]): number {
    let score = 10;
    const words = this.extractWords(text);
    
    // 检测冗余修饰
    const redundantIssues = issues.filter(i => 
      i.type === 'redundant_modifier' || i.type === 'redundant_words'
    );
    score -= redundantIssues.length * 1;

    // 检测重复
    const repetitionIssues = issues.filter(i => 
      i.type === 'repetition'
    );
    score -= repetitionIssues.length * 1;

    // 检测被动语态
    const passiveIssues = issues.filter(i => i.type === 'passive_voice');
    score -= passiveIssues.length * 0.5;

    // 检测"的地得"密度（中文写作冗余指标）
    const deCount = (text.match(/[的地得]/g) || []).length;
    const deRatio = deCount / Math.max(text.length, 1);
    if (deRatio > 0.08) score -= (deRatio - 0.08) * 50;

    // 检测虚词密度
    const functionWords = (text.match(/[了的着是就在都把被而但]/g) || []).length;
    const functionRatio = functionWords / Math.max(words.length, 1);
    if (functionRatio > 0.25) score -= (functionRatio - 0.25) * 20;

    // 计算信息密度（实词比例）
    const contentWords = words.filter(w => w.length >= 2 && !this.isFunctionWord(w));
    const density = contentWords.length / Math.max(words.length, 1);
    score += (density - 0.5) * 4; // 以0.5为基准调整

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 计算传统5维评分（向后兼容）
   */
  calculateLegacyBreakdown(text: string, issues: Issue[]): LegacyBreakdown {
    // 重复度
    const repetitionIssues = issues.filter(i => 
      i.type === 'repetition' || i.type === 'adjective_stacking'
    );
    const repetition = Math.max(0, 100 - repetitionIssues.length * 15);

    // 结构自然度
    const structureIssues = issues.filter(i => 
      i.type === 'triple_pattern' || 
      i.type === 'parallel_structure' ||
      i.type === 'binary_contrast' ||
      i.type === 'long_sentence'
    );
    const structure = Math.max(0, 100 - structureIssues.length * 15);

    // 词汇丰富度
    const vocabIssues = issues.filter(i => 
      i.type === 'banned_emphasis' || 
      i.type === 'exaggeration' ||
      i.type === 'temporal_adverb'
    );
    const vocabulary = Math.max(0, 100 - vocabIssues.length * 10);

    // 情感真实度
    const emotionIssues = issues.filter(i => 
      i.type === 'direct_emotion' || 
      i.type === 'emotion_floating' ||
      i.type === 'exclamation_overuse'
    );
    const emotion = Math.max(0, 100 - emotionIssues.length * 15);

    // 细节丰富度
    const detailIssues = issues.filter(i => 
      i.type === 'abstract_metaphor' || 
      i.type === 'telling_not_showing' ||
      i.type === 'lack_detail'
    );
    const detail = Math.max(0, 100 - detailIssues.length * 20);

    return { repetition, structure, vocabulary, emotion, detail };
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(slopScore: SlopScore, breakdown: LegacyBreakdown): number {
    // 5维评分占60%，传统评分占40%
    const slopComponent = (slopScore.total / 50) * 60;
    
    const legacyAvg = Object.values(breakdown).reduce((a, b) => a + b, 0) / 5;
    const legacyComponent = (legacyAvg / 100) * 40;
    
    return Math.round(slopComponent + legacyComponent);
  }

  // ============ 辅助方法 ============

  private splitSentences(text: string): string[] {
    return text.split(/[。！？]/).filter(s => s.trim().length > 0);
  }

  private extractWords(text: string): string[] {
    return text.split(/[\s，。！？、；：""''【】（）《》\n]+/)
      .filter(w => w.length >= 1);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length < 2) return 0;
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / numbers.length;
  }

  private isFunctionWord(word: string): boolean {
    const functionWords = new Set([
      '的', '了', '着', '是', '就', '在', '都', '把', '被', 
      '而', '但', '与', '和', '或', '及', '等', '之', '所',
      '这', '那', '我', '你', '他', '她', '它', '们',
    ]);
    return functionWords.has(word);
  }
}

// ============ 便捷函数 ============

/**
 * 快速计算5维评分
 */
export function calculateSlopScore(text: string, issues: Issue[]): SlopScore {
  const scorer = new SlopScorer();
  return scorer.calculateScore(text, issues);
}

/**
 * 生成详细报告
 */
export function generateScoreReport(score: HumanizeScore): string {
  const { slopScore, overall, issues, stats } = score;
  const { dimensions, total, needsRevision } = slopScore;

  let report = `\n========== AI 检测报告 ==========\n\n`;
  
  // 总体评分
  report += `【总体评分】${overall}/100\n`;
  report += `【5维评分】${total}/50 ${needsRevision ? '⚠️ 需要重写' : '✓ 通过'}\n\n`;
  
  // 5维详情
  report += `【5维详情】\n`;
  report += `  直接性(Directness):     ${dimensions.directness}/10\n`;
  report += `  节奏多样性(Rhythm):     ${dimensions.rhythm}/10\n`;
  report += `  读者信任度(Trust):      ${dimensions.trust}/10\n`;
  report += `  真实感(Authenticity):   ${dimensions.authenticity}/10\n`;
  report += `  信息密度(Density):      ${dimensions.density}/10\n\n`;
  
  // 统计信息
  report += `【统计信息】\n`;
  report += `  禁用短语: ${stats.bannedPhrases}个\n`;
  report += `  结构问题: ${stats.structuralIssues}个\n`;
  report += `  模式匹配: ${stats.patternMatches}个\n`;
  report += `  严重问题: ${stats.highSeverityIssues}个\n\n`;
  
  // 问题列表
  if (issues.length > 0) {
    report += `【发现问题】\n`;
    issues.slice(0, 10).forEach((issue, i) => {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      report += `  ${icon} [${issue.category}] ${issue.title}\n`;
    });
    if (issues.length > 10) {
      report += `  ... 还有 ${issues.length - 10} 个问题\n`;
    }
  }
  
  report += `\n================================\n`;
  
  return report;
}

// 导出单例
export const slopScorer = new SlopScorer();
