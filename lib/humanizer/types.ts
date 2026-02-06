/**
 * Humanizer 类型定义 - 参考 stop-slop 设计
 * 全面升级 AI 检测和人性化改写系统
 */

// ============ Stop-Slop 5维评分系统 ============

/**
 * 5维评分维度（参考 stop-slop）
 * - directness: 直接性（陈述 vs 宣告）
 * - rhythm: 节奏多样性
 * - trust: 读者信任度（是否过度解释）
 * - authenticity: 真实感
 * - density: 信息密度（是否有废话）
 */
export interface SlopDimensions {
  directness: number;    // 0-10，越高越直接
  rhythm: number;        // 0-10，越高节奏越多样
  trust: number;         // 0-10，越高越信任读者
  authenticity: number;  // 0-10，越高越像人写
  density: number;       // 0-10，越高信息密度越高
}

/**
 * 5维评分结果
 */
export interface SlopScore {
  dimensions: SlopDimensions;
  total: number;         // 总分 0-50
  threshold: number;     // 阈值，默认 35
  needsRevision: boolean; // 是否需要重写
}

// ============ 问题检测系统 ============

export type IssueSeverity = 'high' | 'medium' | 'low';

export type IssueType =
  // 短语类问题
  | 'banned_opener'      // 禁用开场白
  | 'banned_emphasis'    // 强调拐杖
  | 'banned_jargon'      // 商业术语
  | 'banned_transition'  // 生硬过渡
  | 'ai_cliche'          // AI陈词滥调
  | 'exaggeration'       // 浮夸表达
  | 'temporal_adverb'    // 时间副词滥用
  | 'surprise_word'      // 惊讶词滥用
  | 'redundant_modifier' // 冗余修饰
  // 结构类问题
  | 'binary_contrast'    // 二元对比
  | 'triple_pattern'     // 三件套排比
  | 'qa_setup'           // 自问自答
  | 'dramatic_fragments' // 戏剧化断句
  | 'metronomic_ending'  // 节拍化结尾
  | 'list_narrative'     // 列表式叙述
  | 'over_summary'       // 过度总结
  | 'abstract_metaphor'  // 抽象比喻
  | 'translationese'     // 翻译腔
  | 'direct_emotion'     // 情绪直给
  // 模式类问题
  | 'parallel_structure' // 排比结构
  | 'uniform_length'     // 句长一致
  | 'rhetorical_question'// 修辞问句
  | 'adjective_stacking' // 形容词堆砌
  | 'adverb_overuse'     // 副词滥用
  | 'exclamation_overuse'// 感叹号滥用
  | 'ellipsis_overuse'   // 省略号滥用
  | 'comma_rhythm'       // 逗号节奏
  | 'passive_voice'      // 被动语态
  | 'filter_words'       // 过滤词
  | 'telling_not_showing'// 直接讲述
  // 中文风格问题（新增）
  | 'beijing_accent'     // 儿化音
  | 'translationese_cn'  // 翻译腔（中文）
  | 'false_intimacy'     // 虚假亲昵
  | 'ai_cliche_cn'       // AI陈词（中文特供）
  | 'tour_guide_opener'  // 导游式开场
  | 'tour_guide_ending'  // 导游式结尾
  | 'mechanical_transition_cn' // 生硬过渡（中文）
  | 'false_objectivity'  // 虚假客观
  | 'weird_single_char'  // 诡异单字形容词
  // 传统问题类型（向后兼容）
  | 'parallelism'        // 排比句过多（旧）
  | 'repetition'         // 词汇重复（旧）
  | 'exclamation'        // 感叹号滥用（旧）
  | 'summary'            // 过度总结（旧）
  | 'lack_detail'        // 缺乏细节（旧）
  | 'long_sentence'      // 长句堆砌（旧）
  | 'emotion_floating'   // 情绪悬浮（旧）
  | 'redundant_words';   // 冗余词汇（旧）

/**
 * 检测到的问题
 */
export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  position: {
    start: number;
    end: number;
  };
  excerpt: string;        // 问题片段
  suggestion: string;     // 改写建议
  category: string;       // 问题分类
}

// ============ 综合评分系统 ============

/**
 * 传统5维评分（向后兼容）
 */
export interface LegacyBreakdown {
  repetition: number;     // 重复度
  structure: number;      // 结构自然度
  vocabulary: number;     // 词汇丰富度
  emotion: number;        // 情感真实度
  detail: number;         // 细节丰富度
}

/**
 * 完整评分结果
 */
export interface HumanizeScore {
  // 总体评分 0-100
  overall: number;
  
  // Stop-Slop 5维评分（新）
  slopScore: SlopScore;
  
  // 传统评分（向后兼容）
  breakdown: LegacyBreakdown;
  
  // 检测到的问题列表
  issues: Issue[];
  
  // 统计信息
  stats: {
    totalPhrases: number;      // 总短语数
    bannedPhrases: number;     // 禁用短语数
    structuralIssues: number;  // 结构问题数
    patternMatches: number;    // 模式匹配数
    highSeverityIssues: number;// 严重问题数
  };
}

// ============ 改写结果 ============

export interface Change {
  type: 'replace' | 'delete' | 'insert';
  original: string;
  replacement: string;
  reason: string;
  category?: string;
}

export interface HumanizeResult {
  original: string;
  rewritten: string;
  scoreBefore: HumanizeScore;
  scoreAfter: HumanizeScore;
  changes: Change[];
  improvement: number;      // 改进幅度
  processingTime: number;   // 处理时间(ms)
}

// ============ 配置选项 ============

export type DetectionMode = 'strict' | 'balanced' | 'lenient';
export type RewriteMode = 'conservative' | 'balanced' | 'creative';

export interface DetectionConfig {
  // 检测模式
  mode: DetectionMode;
  
  // 阈值设置
  slopThreshold: number;           // 5维评分阈值（默认35）
  minIssueSeverity: IssueSeverity; // 最小报告级别
  
  // 短语检测
  checkOpeners: boolean;
  checkEmphasis: boolean;
  checkJargon: boolean;
  checkTransitions: boolean;
  checkCliches: boolean;
  
  // 结构检测
  checkStructures: boolean;
  
  // 模式检测
  checkPatterns: boolean;
  
  // 中文风格检测（新增）
  checkChineseStyle: boolean;
  chineseStyleConfig: {
    checkBeijingAccent: boolean;
    checkTranslationese: boolean;
    checkFalseIntimacy: boolean;
    checkAICliches: boolean;
    checkTourGuideStructure: boolean;
    checkMechanicalTransitions: boolean;
    checkFalseObjectivity: boolean;
    checkSingleCharAdjectives: boolean;
  };
  
  // 统计权重
  weights: {
    phrases: number;      // 短语问题权重
    structures: number;   // 结构问题权重
    patterns: number;     // 模式问题权重
    chineseStyle: number; // 中文风格权重（新增）
  };
}

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  mode: 'balanced',
  slopThreshold: 35,
  minIssueSeverity: 'low',
  checkOpeners: true,
  checkEmphasis: true,
  checkJargon: true,
  checkTransitions: true,
  checkCliches: true,
  checkStructures: true,
  checkPatterns: true,
  checkChineseStyle: true,
  chineseStyleConfig: {
    checkBeijingAccent: true,
    checkTranslationese: true,
    checkFalseIntimacy: true,
    checkAICliches: true,
    checkTourGuideStructure: true,
    checkMechanicalTransitions: true,
    checkFalseObjectivity: true,
    checkSingleCharAdjectives: true,
  },
  weights: {
    phrases: 0.25,
    structures: 0.35,
    patterns: 0.25,
    chineseStyle: 0.15,
  },
};

export const STRICT_DETECTION_CONFIG: DetectionConfig = {
  ...DEFAULT_DETECTION_CONFIG,
  mode: 'strict',
  slopThreshold: 40,
  minIssueSeverity: 'medium',
};

export const LENIENT_DETECTION_CONFIG: DetectionConfig = {
  ...DEFAULT_DETECTION_CONFIG,
  mode: 'lenient',
  slopThreshold: 30,
  minIssueSeverity: 'high',
};

// ============ 改写配置 ============

export interface RewriteConfig {
  mode: RewriteMode;
  customPrompt?: string;
  systemPrompt?: string;
  preserveLength: boolean;      // 是否保持字数
  maxLengthChange: number;      // 最大字数变化比例（默认0.1）
  useExamples: boolean;         // 是否使用示例
  exampleCount: number;         // 示例数量
}

export const DEFAULT_REWRITE_CONFIG: RewriteConfig = {
  mode: 'balanced',
  preserveLength: true,
  maxLengthChange: 0.1,
  useExamples: true,
  exampleCount: 3,
};

// ============ API 配置 ============

export interface APIConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============ 检测结果详情 ============

export interface DetectionDetail {
  category: string;
  count: number;
  issues: Issue[];
  scoreImpact: number;
}

export interface DetailedReport {
  summary: {
    overallScore: number;
    slopScore: number;
    needsRevision: boolean;
    totalIssues: number;
  };
  dimensions: SlopDimensions;
  details: DetectionDetail[];
  suggestions: string[];
}
