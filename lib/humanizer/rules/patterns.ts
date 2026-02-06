/**
 * AI 特征模式库 - 更细粒度的文本模式检测
 */

export interface AIPattern {
  id: string;
  name: string;
  description: string;
  // 检测正则
  regex: RegExp;
  // 权重（影响分数计算）
  weight: number;
  // 是否区分严重程度（出现次数越多越严重）
  cumulative: boolean;
}

// ============ 句式模式 ============
export const SENTENCE_PATTERNS: AIPattern[] = [
  {
    id: 'parallel_structure',
    name: '排比结构',
    description: '连续使用相同句式开头',
    regex: /(^[^，。！？]{2,8}[，。]){3,}/gm,
    weight: 3,
    cumulative: true,
  },
  {
    id: 'uniform_sentence_length',
    name: '句长一致',
    description: '相邻句子长度过于相似',
    regex: /[^。！？]{18,22}[。！][^。！？]{18,22}[。！][^。！？]{18,22}[。！]/g,
    weight: 2,
    cumulative: false,
  },
  {
    id: 'rhetorical_question',
    name: '修辞问句',
    description: '使用修辞性问句',
    regex: /[^？]{10,40}\?/g,
    weight: 1,
    cumulative: true,
  },
];

// ============ 词汇模式 ============
export const VOCABULARY_PATTERNS: AIPattern[] = [
  {
    id: 'adjective_stacking',
    name: '形容词堆砌',
    description: '连续使用多个形容词修饰',
    regex: /[很非常极其特别十分相当]{0,1}[美丽漂亮好看优秀杰出卓越非凡]{1,2}的/g,
    weight: 2,
    cumulative: true,
  },
  {
    id: 'adverb_overuse',
    name: '副词滥用',
    description: '过度使用副词修饰动词',
    regex: /[很非常极其特别十分相当格外过于][^，。！？]{1,4}[地]/g,
    weight: 2,
    cumulative: true,
  },
  {
    id: 'four_char_idiom',
    name: '成语堆砌',
    description: '过度使用四字成语',
    regex: /[一-龥]{4}[，。！]/g,
    weight: 1,
    cumulative: true,
  },
];

// ============ 标点模式 ============
export const PUNCTUATION_PATTERNS: AIPattern[] = [
  {
    id: 'exclamation_overuse',
    name: '感叹号滥用',
    description: '感叹号使用频率过高',
    regex: /！/g,
    weight: 2,
    cumulative: true,
  },
  {
    id: 'ellipsis_overuse',
    name: '省略号滥用',
    description: '过度使用省略号制造悬念',
    regex: /……|\.\.\./g,
    weight: 1,
    cumulative: true,
  },
  {
    id: 'dash_overuse',
    name: '破折号滥用',
    description: '过度使用破折号',
    regex: /——/g,
    weight: 1,
    cumulative: true,
  },
];

// ============ 节奏模式 ============
export const RHYTHM_PATTERNS: AIPattern[] = [
  {
    id: 'comma_rhythm',
    name: '逗号节奏',
    description: '使用逗号制造机械节奏',
    regex: /[^，]{4,6}，[^，]{4,6}，[^，]{4,6}，/g,
    weight: 2,
    cumulative: false,
  },
  {
    id: 'periodic_rhythm',
    name: '句号节奏',
    description: '短句机械断句',
    regex: /[^。！？]{6,10}[。][^。！？]{6,10}[。][^。！？]{6,10}[。]/g,
    weight: 2,
    cumulative: false,
  },
];

// ============ 叙事模式 ============
export const NARRATIVE_PATTERNS: AIPattern[] = [
  {
    id: 'passive_voice',
    name: '被动语态',
    description: '过度使用被动句式',
    regex: /被[^，。！？]{2,10}[所给让叫]/g,
    weight: 2,
    cumulative: true,
  },
  {
    id: 'filter_words',
    name: '过滤词',
    description: '使用过滤词削弱叙述',
    regex: /(他看到|他听到|他感觉到|他意识到|他认为|他觉得|他想)[^，。！？]{5,30}/g,
    weight: 2,
    cumulative: true,
  },
  {
    id: 'telling_not_showing',
    name: '直接讲述',
    description: '直接讲述而非展示',
    regex: /(是|显得|看起来|似乎|好像|仿佛)[^，。！？]{2,10}(的|得)/g,
    weight: 3,
    cumulative: true,
  },
];

// ============ 所有模式汇总 ============
export const ALL_PATTERNS: AIPattern[] = [
  ...SENTENCE_PATTERNS,
  ...VOCABULARY_PATTERNS,
  ...PUNCTUATION_PATTERNS,
  ...RHYTHM_PATTERNS,
  ...NARRATIVE_PATTERNS,
];

// ============ 模式分类映射 ============
export const PATTERNS_BY_CATEGORY = {
  sentence: SENTENCE_PATTERNS,
  vocabulary: VOCABULARY_PATTERNS,
  punctuation: PUNCTUATION_PATTERNS,
  rhythm: RHYTHM_PATTERNS,
  narrative: NARRATIVE_PATTERNS,
};
