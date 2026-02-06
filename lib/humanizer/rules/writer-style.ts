/**
 * 中文写作风格规则库
 * 基于 "去AI味提示词-作家增强-SKILL" 项目
 * 目标：去除AI写作痕迹，让文本更像人类专栏作家
 */

// ============ 严禁行为 - 儿化音 ============
export const BANNED_BEIJING_ACCENTS = [
  '那儿',
  '这儿',
  '一点儿',
  '玩儿',
  '今儿',
  '明儿',
  '昨儿',
  '后儿',
  '前儿',
  '昨儿个',
  '今儿个',
  '明儿个',
  '压根儿',
  '一会儿',
  '一块儿',
  '一点儿',
];

// ============ 严禁行为 - 翻译腔 ============
export const BANNED_TRANSLATIONESE = [
  '当……时',
  '当……的时候',
  '在……的时候',
  '当……之际',
  '被……所',
  '将……给',
  '对……进行',
  '为……所',
  '以……为',
  '从……出发',
  '就……而言',
  '在……基础上',
  '在……指导下',
  '在……领导下',
  '在……支持下',
  '在……帮助下',
  '在……框架下',
  '在……过程中',
];

// ============ 严禁行为 - 虚假亲昵 ============
export const BANNED_FALSE_INTIMACY = [
  '咱们',
  '咱',
  '大家伙儿',
  '大家',
  '各位',
];

// ============ AI高频陈词滥调 - 中文特供版 ============
export const AI_CLICHES_CHINESE = [
  // 总结性陈词
  '总而言之',
  '综上所述',
  '总的来说',
  '总的来看',
  '归根结底',
  '说到底',
  '说白了',
  '一言以蔽之',
  // 过渡性陈词
  '值得注意的是',
  '不难发现',
  '可以看到',
  '可以看出',
  '显而易见',
  '不言而喻',
  '理所当然',
  '顺理成章',
  // 套话
  '双刃剑',
  '多面性',
  '织就',
  '画卷',
  '蓝图',
  '篇章',
  '浓墨重彩',
  '浓墨重彩的一笔',
  '不可或缺',
  '至关重要',
  '举足轻重',
  '不容忽视',
  '毋庸置疑',
  '毫无疑问',
  '不可否认',
  // 蹩脚比喻
  '像一把扫帚',
  '像房间里的大象',
  '像折叠的迷宫',
  '像划破夜空的闪电',
  '像一盏明灯',
  '像一面镜子',
  '像一把尺子',
  '像一座灯塔',
  '像一把钥匙',
  '像一扇窗户',
  '像一座桥梁',
  '像一块基石',
  '像一颗种子',
  '像一团火焰',
  '像一股清流',
  '像一阵春风',
  '像一场及时雨',
  // AI惯用虚词堆砌
  '不仅……而且',
  '既……又',
  '虽然……但是',
  '因为……所以',
  '如果……那么',
  '只有……才',
  '只要……就',
  '无论……都',
  '不管……也',
  '即使……也',
  '尽管……还是',
  '与其……不如',
  '宁可……也不',
];

// ============ 导游式结构 - 开场白 ============
export const TOUR_GUIDE_OPENERS = [
  '是一个历史悠久的话题',
  '是一个古老的话题',
  '是一个永恒的话题',
  '是一个复杂的话题',
  '是一个值得深思的话题',
  '是一个备受关注的话题',
  '是一个热点话题',
  '随着时代的发展',
  '随着社会的进步',
  '随着科技的进步',
  '在当今社会',
  '在当今时代',
  '在现代社会',
  '在当代社会',
  '在这个信息爆炸的时代',
  '在这个快节奏的时代',
  '在这个充满变革的时代',
];

// ============ 导游式结构 - 结尾升华 ============
export const TOUR_GUIDE_ENDINGS = [
  '让我们共同努力',
  '让我们携手共进',
  '让我们共同期待',
  '让我们拭目以待',
  '让我们为之奋斗',
  '让我们不忘初心',
  '让我们砥砺前行',
  '让我们携手同行',
  '让我们共同创造',
  '让我们共同见证',
  '让我们共同守护',
  '让我们共同追求',
  '让我们共同探索',
  '让我们共同思考',
  '让我们共同面对',
  '让我们共同解决',
  '只有这样',
  '唯有如此',
  '方能',
  '才能',
  '才会',
  '必将',
  '注定',
  '终将',
];

// ============ 生硬连接词 ============
export const MECHANICAL_TRANSITIONS = [
  '此外',
  '另外',
  '其次',
  '再次',
  '最后',
  '总之',
  '综上所述',
  '总而言之',
  '因此',
  '所以',
  '于是',
  '因而',
  '从而',
  '由此',
  '由此可知',
  '由此可见',
  '由此可以看出',
  '由此可以得出',
  '基于此',
  '在此基础上',
  '有鉴于此',
  '鉴于此',
];

// ============ 虚假客观表达 ============
export const FALSE_OBJECTIVITY = [
  '有人认为',
  '有人说',
  '相关专家表示',
  '专家指出',
  '业内人士认为',
  '分析人士指出',
  '观察人士认为',
  '评论家认为',
  '有评论认为',
  '有媒体指出',
  '据报道',
  '据悉',
  '据了解',
  '有消息称',
  '有数据显示',
  '研究表明',
  '调查显示',
  '实验证明',
  '事实证明',
  '历史证明',
  '实践表明',
  '经验表明',
  '数据表明',
  '事实表明',
  '结果表明',
  '这说明了',
  '这证明了',
  '这反映了',
  '这体现了',
  '这显示了',
  '这揭示了',
  '这暗示了',
  '这象征着',
  '这代表着',
  '这意味着',
  '这表明',
];

// ============ 单字形容词（诡异用法） ============
export const WEIRD_SINGLE_CHAR_ADJECTIVES = [
  { pattern: /训练成乖[^\u4e00-\u9fa5]/, suggestion: '训练得只会卖乖' },
  { pattern: /变得乖[^\u4e00-\u9fa5]/, suggestion: '变得很乖/变得乖巧' },
  { pattern: /表现乖[^\u4e00-\u9fa5]/, suggestion: '表现得很乖' },
  { pattern: /长得乖[^\u4e00-\u9fa5]/, suggestion: '长得很乖/长得乖巧' },
];

// ============ 写作风格原则 ============
export interface WritingPrinciple {
  id: string;
  name: string;
  description: string;
  banned: string[];
  encouraged: string[];
  examples?: {
    bad: string;
    good: string;
  };
}

export const WRITING_PRINCIPLES: WritingPrinciple[] = [
  {
    id: 'no_tour_guide',
    name: '拒绝导游式结构',
    description: '不要背景综述开头，不要升华结尾',
    banned: ['XX是一个历史悠久的话题', '让我们共同努力'],
    encouraged: ['切片式切入', '从具体事件开始', '戛然而止的结尾'],
    examples: {
      bad: '脱发是一个历史悠久的话题。从古至今，人们都在为脱发困扰。让我们共同努力，找到解决脱发的方法。',
      good: '别人嘲笑我秃头的时候，我才意识到问题的严重性。',
    },
  },
  {
    id: 'adversary',
    name: '建立假想敌',
    description: '每一篇文章都在反驳某种观点，大量使用"我"',
    banned: ['有人认为', '相关专家表示', '我们'],
    encouraged: ['我', '我的观点是', '我觉得这是胡说八道'],
    examples: {
      bad: '有人认为，中医是中华文化的瑰宝。相关专家表示，应该大力发展中医药。',
      good: '我觉得这是胡说八道。《批评中医》这里最绝的地方在于：不陪你玩文化身份那套。',
    },
  },
  {
    id: 'rhythm',
    name: '语流呼吸感',
    description: '长短句交替，活用破折号和问号',
    banned: ['此外', '另外', '最后', '综上所述'],
    encouraged: ['长句层层递进', '短句判断', '破折号转折', '连续反问'],
    examples: {
      bad: '此外，中医缺乏科学依据。另外，中药的副作用也不容忽视。最后，我们应该理性看待中医。',
      good: '中医没有科学依据——这不是我说的，这是他们自己的问题。你信吗？我不信。',
    },
  },
  {
    id: 'vocabulary_mixing',
    name: '词汇杂糅美学',
    description: '专业术语+口语+古文虚词混合',
    banned: ['总而言之', '综上所述', '像一把扫帚', '像房间里的大象'],
    encouraged: ['呜呼', '诚心诚意', '盖', '瞎扯', '没品', '药罐子'],
    examples: {
      bad: '总而言之，像一把扫帚一样，清理了这些错误观念。',
      good: '呜呼，这简直就是瞎扯。',
    },
  },
];

// ============ 风格检测配置 ============
export interface StyleCheckConfig {
  checkBeijingAccent: boolean;
  checkTranslationese: boolean;
  checkFalseIntimacy: boolean;
  checkAICliches: boolean;
  checkTourGuideStructure: boolean;
  checkMechanicalTransitions: boolean;
  checkFalseObjectivity: boolean;
  checkSingleCharAdjectives: boolean;
}

export const DEFAULT_STYLE_CHECK_CONFIG: StyleCheckConfig = {
  checkBeijingAccent: true,
  checkTranslationese: true,
  checkFalseIntimacy: true,
  checkAICliches: true,
  checkTourGuideStructure: true,
  checkMechanicalTransitions: true,
  checkFalseObjectivity: true,
  checkSingleCharAdjectives: true,
};

// ============ 所有禁用短语的合并列表 ============
export const ALL_BANNED_CHINESE_PHRASES = [
  ...BANNED_BEIJING_ACCENTS,
  ...BANNED_TRANSLATIONESE,
  ...BANNED_FALSE_INTIMACY,
  ...AI_CLICHES_CHINESE,
  ...TOUR_GUIDE_OPENERS,
  ...TOUR_GUIDE_ENDINGS,
  ...MECHANICAL_TRANSITIONS,
  ...FALSE_OBJECTIVITY,
];

// ============ 短语分类映射 ============
export const CHINESE_PHRASE_CATEGORIES: Record<string, string[]> = {
  '儿化音': BANNED_BEIJING_ACCENTS,
  '翻译腔': BANNED_TRANSLATIONESE,
  '虚假亲昵': BANNED_FALSE_INTIMACY,
  'AI陈词': AI_CLICHES_CHINESE,
  '导游式开场': TOUR_GUIDE_OPENERS,
  '导游式结尾': TOUR_GUIDE_ENDINGS,
  '生硬过渡': MECHANICAL_TRANSITIONS,
  '虚假客观': FALSE_OBJECTIVITY,
};

// ============ 风格评分权重 ============
export const STYLE_SCORE_WEIGHTS = {
  beijingAccent: 2,      // 儿化音扣分权重
  translationese: 3,     // 翻译腔扣分权重
  falseIntimacy: 2,      // 虚假亲昵扣分权重
  aiCliches: 1,          // AI陈词扣分权重
  tourGuideOpener: 2,    // 导游式开场扣分权重
  tourGuideEnding: 2,    // 导游式结尾扣分权重
  mechanicalTransition: 1, // 生硬过渡扣分权重
  falseObjectivity: 1.5, // 虚假客观扣分权重
};
