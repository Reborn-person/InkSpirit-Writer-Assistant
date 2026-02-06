/**
 * 结构模式库 - AI 写作的典型结构模式
 * 参考 stop-slop 设计
 */

export interface StructuralPattern {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  // 正则表达式或检测函数
  pattern: RegExp | ((text: string) => boolean);
  // 严重程度
  severity: 'high' | 'medium' | 'low';
  // 改写建议
  suggestion: string;
  // 示例
  example?: {
    bad: string;
    good: string;
  };
}

// ============ 二元对比模式 ============
export const BINARY_CONTRAST: StructuralPattern = {
  id: 'binary_contrast',
  name: 'Binary Contrast',
  nameZh: '二元对比',
  description: '使用"不是...而是"、"一方面...另一方面"等二元对立结构',
  pattern: /(不是[^，。！？]{2,20}而是|一方面[^，。！？]{2,30}另一方面)/g,
  severity: 'medium',
  suggestion: '用具体场景替代抽象对比，避免非黑即白的思维模式',
  example: {
    bad: '他不是懦夫，而是智者。一方面他想战斗，另一方面他知道时机未到。',
    good: '他握紧拳头又松开，转身走向暗处——不是怯懦，是在等一个更好的时机。',
  },
};

// ============ 三件套排比模式 ============
export const TRIPLE_PATTERN: StructuralPattern = {
  id: 'triple_pattern',
  name: 'Triple Pattern',
  nameZh: '三件套排比',
  description: '连续三个结构相似的句子，形成工整的排比',
  pattern: /([^，。！？]{3,25}[，]){2}[^，。！？]{3,25}[。！]/g,
  severity: 'high',
  suggestion: '打破工整感，长短句交替，避免机械的节奏',
  example: {
    bad: '他走进了房间，他打开了灯，他坐在了椅子上。',
    good: '他推门进去，灯还亮着。椅子在等他。',
  },
};

// ============ 自问自答模式 ============
export const QA_SETUP: StructuralPattern = {
  id: 'qa_setup',
  name: 'Question-Answer Setup',
  nameZh: '自问自答',
  description: '先提出问题，然后立即回答，形成修辞性设问',
  pattern: /([^？]{5,30}\?[^，。！？]{5,30}[。！])/g,
  severity: 'low',
  suggestion: '直接陈述观点，删除修辞性设问，让叙述更自然',
  example: {
    bad: '他为什么要这样做？因为他别无选择。',
    good: '他别无选择，只能这样做。',
  },
};

// ============ 戏剧化断句模式 ============
export const DRAMATIC_FRAGMENTS: StructuralPattern = {
  id: 'dramatic_fragments',
  name: 'Dramatic Fragments',
  nameZh: '戏剧化断句',
  description: '过度使用短句和断句制造戏剧效果',
  pattern: (text: string) => {
    const sentences = text.split(/[。！？]/).filter(s => s.trim());
    const shortSentences = sentences.filter(s => s.length <= 8);
    return shortSentences.length >= 5 && shortSentences.length / sentences.length > 0.4;
  },
  severity: 'medium',
  suggestion: '长短句结合，避免过度碎片化的叙述',
};

// ============ 节拍化结尾模式 ============
export const METRONOMIC_ENDING: StructuralPattern = {
  id: 'metronomic_ending',
  name: 'Metronomic Ending',
  nameZh: '节拍化结尾',
  description: '段落或章节结尾使用相同长度的句子，形成机械节拍',
  pattern: (text: string) => {
    const paragraphs = text.split('\n').filter(p => p.trim());
    if (paragraphs.length < 3) return false;
    
    // 检查每段最后一句的长度是否过于相似
    const lastSentences = paragraphs
      .map(p => {
        const sentences = p.split(/[。！？]/).filter(s => s.trim());
        return sentences[sentences.length - 1]?.length || 0;
      })
      .filter(len => len > 0);
    
    if (lastSentences.length < 3) return false;
    
    const avg = lastSentences.reduce((a, b) => a + b, 0) / lastSentences.length;
    const variance = lastSentences.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lastSentences.length;
    
    // 方差小说明长度相似
    return variance < 10;
  },
  severity: 'low',
  suggestion: '让结尾句长度自然变化，避免刻意的整齐感',
};

// ============ 列表式叙述模式 ============
export const LIST_NARRATIVE: StructuralPattern = {
  id: 'list_narrative',
  name: 'List Narrative',
  nameZh: '列表式叙述',
  description: '像清单一样罗列信息，缺乏有机连接',
  pattern: /([ Firstly,Secondly,Thirdly,First,Second,Third,首先，其次，最后，第一，第二，第三])/g,
  severity: 'high',
  suggestion: '用过渡和因果连接替代列表结构，让信息流动起来',
};

// ============ 过度总结模式 ============
export const OVER_SUMMARY: StructuralPattern = {
  id: 'over_summary',
  name: 'Over Summary',
  nameZh: '过度总结',
  description: '在每个段落或场景后都进行总结性陈述',
  pattern: /(总之|总而言之|综上所述|由此可见|因此|所以)[^，。！？]{5,30}[。！]/g,
  severity: 'medium',
  suggestion: '相信读者的理解能力，删除不必要的总结',
};

// ============ 抽象比喻模式 ============
export const ABSTRACT_METAPHOR: StructuralPattern = {
  id: 'abstract_metaphor',
  name: 'Abstract Metaphor',
  nameZh: '抽象比喻',
  description: '使用宇宙、深渊、灵魂等宏大抽象概念作比喻',
  pattern: /([^，。！？]{2,10})(像|如同|仿佛|好似|犹如)(宇宙|黑洞|星辰|深渊|虚空|灵魂|命运|永恒|无限|时空|洪荒|混沌|虚无)/g,
  severity: 'medium',
  suggestion: '用具体事物+感官细节+场景反馈替换抽象比喻',
  example: {
    bad: '他的目光像深渊一样深不可测。',
    good: '他的目光像浸了冰的铁，冷得刺骨。',
  },
};

// ============ 翻译腔模式 ============
export const TRANSLATIONESE: StructuralPattern = {
  id: 'translationese',
  name: 'Translationese',
  nameZh: '翻译腔',
  description: '带有明显翻译痕迹的句式，如"当...的时候"、"被..."',
  pattern: /(当[^，。！？]{3,20}的时候|被[^，。！？]{2,15}所|将[^，。！？]{2,15}给|对[^，。！？]{2,15}进行)/g,
  severity: 'medium',
  suggestion: '改为地道的中文表达，删除冗余结构',
  example: {
    bad: '当他走进房间的时候，他被眼前的景象所震撼。',
    good: '他走进房间，被眼前的景象震住了。',
  },
};

// ============ 情绪直给模式 ============
export const DIRECT_EMOTION: StructuralPattern = {
  id: 'direct_emotion',
  name: 'Direct Emotion',
  nameZh: '情绪直给',
  description: '直接说出情绪词，而不是通过细节展示',
  pattern: /(很|非常|十分|极其|特别)?(开心|难过|伤心|愤怒|绝望|高兴|悲伤|痛苦|快乐|恐惧|激动|兴奋|紧张|害怕|担心|焦虑|不安|沮丧|失落|孤独|寂寞|空虚|迷茫|困惑|无奈|无助|绝望)/g,
  severity: 'high',
  suggestion: '用"动作+感官+场景互动"替代直接喊情绪词',
  example: {
    bad: '他非常难过。',
    good: '肩膀一抽一抽的，眼泪砸在地上，洇出一小片深色的痕迹。',
  },
};

// ============ 所有结构模式列表 ============
export const ALL_STRUCTURAL_PATTERNS: StructuralPattern[] = [
  BINARY_CONTRAST,
  TRIPLE_PATTERN,
  QA_SETUP,
  DRAMATIC_FRAGMENTS,
  METRONOMIC_ENDING,
  LIST_NARRATIVE,
  OVER_SUMMARY,
  ABSTRACT_METAPHOR,
  TRANSLATIONESE,
  DIRECT_EMOTION,
];

// ============ 按严重程度分组 ============
export const PATTERNS_BY_SEVERITY = {
  high: ALL_STRUCTURAL_PATTERNS.filter(p => p.severity === 'high'),
  medium: ALL_STRUCTURAL_PATTERNS.filter(p => p.severity === 'medium'),
  low: ALL_STRUCTURAL_PATTERNS.filter(p => p.severity === 'low'),
};
