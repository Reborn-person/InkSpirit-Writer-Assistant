/**
 * 改写示例库 - Before/After 对比
 * 用于训练模型理解改写标准
 */

export interface RewriteExample {
  id: string;
  category: string;
  title: string;
  description: string;
  before: string;
  after: string;
  keyChanges: string[];
  techniques: string[];
}

// ============ 开场白类 ============
export const OPENER_EXAMPLES: RewriteExample[] = [
  {
    id: 'opener-1',
    category: '开场白',
    title: '删除 throat-clearing',
    description: '直接切入主题，删除无意义的铺垫',
    before: '在当今社会，随着科技的发展，人们的生活方式发生了巨大的变化。不可否认的是，这种变化对我们的日常生活产生了深远的影响。',
    after: '手机响的时候，他正在吃饭。看了一眼屏幕，他把筷子放下了。',
    keyChanges: ['删除"在当今社会"等开场白', '删除"不可否认的是"', '用具体场景替代抽象陈述'],
    techniques: ['in_medias_res', 'specific_detail'],
  },
  {
    id: 'opener-2',
    category: '开场白',
    title: '直接进入场景',
    description: '用动作和细节开场，而非概括性陈述',
    before: '众所周知，战争是残酷的。在这场战争中，无数人流离失所，家破人亡。',
    after: '炮弹落在东边，震得窗玻璃嗡嗡响。他数了数，还剩三包烟。',
    keyChanges: ['删除"众所周知"', '用感官细节替代概括', '具体化场景'],
    techniques: ['sensory_detail', 'specific_object'],
  },
];

// ============ 句式结构类 ============
export const STRUCTURE_EXAMPLES: RewriteExample[] = [
  {
    id: 'structure-1',
    category: '句式结构',
    title: '打破排比',
    description: '将工整的排比句改为长短不一的自然句式',
    before: '他走进了房间，他打开了灯，他坐在了椅子上。他看着窗外，他想着心事，他叹了一口气。',
    after: '他推门进去，灯还亮着。椅子在等他。窗外是黑的，只有远处一盏路灯。他坐下，叹了口气。',
    keyChanges: ['删除重复主语', '长短句交替', '添加具体细节'],
    techniques: ['sentence_variety', 'ellipsis', 'specific_detail'],
  },
  {
    id: 'structure-2',
    category: '句式结构',
    title: '打破二元对比',
    description: '用具体场景替代抽象的二元对立',
    before: '他不是懦夫，而是智者。一方面他想战斗，另一方面他知道时机未到。',
    after: '他握紧拳头又松开，转身走向暗处——不是怯懦，是在等一个更好的时机。',
    keyChanges: ['用动作替代判断', '删除"一方面...另一方面"', '具体化心理活动'],
    techniques: ['action_over_statement', 'specific_detail'],
  },
];

// ============ 情感表达类 ============
export const EMOTION_EXAMPLES: RewriteExample[] = [
  {
    id: 'emotion-1',
    category: '情感表达',
    title: '展示而非讲述',
    description: '用细节展示情绪，而非直接说出情绪词',
    before: '他非常难过，感到无比绝望。他觉得自己失去了一切，生活没有了意义。',
    after: '肩膀一抽一抽的，眼泪砸在地上，洇出一小片深色的痕迹。他盯着那片痕迹，看了很久。',
    keyChanges: ['删除"非常难过"等情绪词', '用身体反应展示情绪', '用具体动作替代概括'],
    techniques: ['show_dont_tell', 'physical_reaction', 'specific_detail'],
  },
  {
    id: 'emotion-2',
    category: '情感表达',
    title: '用环境映射情绪',
    description: '通过环境描写暗示人物情绪',
    before: '她感到孤独和寂寞，内心空虚得可怕。她觉得自己被世界遗忘了。',
    after: '冰箱的嗡鸣声突然停了。她抬头看了一眼，又低下头。 silence 比声音更吵。',
    keyChanges: ['删除直接情绪描述', '用环境声音暗示孤独', '用对比强化感受'],
    techniques: ['environmental_mirror', 'contrast', 'implication'],
  },
];

// ============ 比喻修辞类 ============
export const METAPHOR_EXAMPLES: RewriteExample[] = [
  {
    id: 'metaphor-1',
    category: '比喻修辞',
    title: '让比喻落地',
    description: '用具体可感的比喻替代抽象宏大比喻',
    before: '他的目光像深渊一样深不可测，仿佛能看穿人的灵魂，直达宇宙的本质。',
    after: '他的目光像浸了冰的铁，冷得刺骨。你不敢看太久，会冻伤。',
    keyChanges: ['删除"深渊""宇宙"等抽象词', '用具体事物作比', '添加感官细节'],
    techniques: ['concrete_metaphor', 'sensory_detail', 'grounded_comparison'],
  },
  {
    id: 'metaphor-2',
    category: '比喻修辞',
    title: '场景化比喻',
    description: '比喻要绑定具体场景',
    before: '时间像流水一样逝去，岁月如梭，人生如梦。',
    after: '烟灰缸满了，他倒了一次。又满了，又倒了一次。天还没亮。',
    keyChanges: ['删除陈词滥调比喻', '用具体动作暗示时间流逝', '场景化呈现'],
    techniques: ['implicit_metaphor', 'action_sequence', 'scene_based'],
  },
];

// ============ 翻译腔类 ============
export const TRANSLATIONESE_EXAMPLES: RewriteExample[] = [
  {
    id: 'trans-1',
    category: '翻译腔',
    title: '去除翻译腔',
    description: '改为地道中文表达',
    before: '当他走进房间的时候，他被眼前的景象所震撼。他无法相信自己的眼睛。',
    after: '他走进房间，愣住了。眼前的景象让他挪不开眼。',
    keyChanges: ['删除"当...的时候"', '删除"被...所"', '简化句式'],
    techniques: ['natural_chinese', 'simplification'],
  },
  {
    id: 'trans-2',
    category: '翻译腔',
    title: '删除冗余结构',
    description: '删除"进行了""展开了"等冗余表达',
    before: '他对这个问题进行了深入的分析，并对各种可能性进行了全面的评估。',
    after: '他琢磨这个问题，把所有可能都想了一遍。',
    keyChanges: ['删除"进行了"', '用口语化表达', '简化动词结构'],
    techniques: ['colloquialism', 'verb_simplification'],
  },
];

// ============ 词汇选择类 ============
export const VOCABULARY_EXAMPLES: RewriteExample[] = [
  {
    id: 'vocab-1',
    category: '词汇选择',
    title: '删除强调词',
    description: '删除"非常""极其"等强调副词',
    before: '这是一个非常极其重要的决定，将会产生十分深远的影响。',
    after: '这个决定，一旦做了，就回不去了。',
    keyChanges: ['删除所有强调词', '用后果暗示重要性', '留白'],
    techniques: ['implication', 'consequence', 'understatement'],
  },
  {
    id: 'vocab-2',
    category: '词汇选择',
    title: '用动词替代形容词',
    description: '多用动词，少用形容词堆砌',
    before: '他非常愤怒，脸色极其难看，眼神十分可怕。',
    after: '他把杯子摔了。瓷片溅了一地，像炸开的花。',
    keyChanges: ['用动作替代情绪描述', '删除形容词', '用比喻强化画面'],
    techniques: ['verb_focus', 'action_over_description', 'metaphor'],
  },
];

// ============ 节奏控制类 ============
export const RHYTHM_EXAMPLES: RewriteExample[] = [
  {
    id: 'rhythm-1',
    category: '节奏控制',
    title: '长短句交替',
    description: '打破匀速叙述，制造节奏变化',
    before: '他站了起来。他走向门口。他打开了门。他走了出去。外面很冷。他缩了缩脖子。',
    after: '他站起来，走向门口，推门出去。冷风灌进来，他缩了缩脖子。',
    keyChanges: ['合并短句', '用逗号连接动作', '保留关键断点'],
    techniques: ['sentence_combining', 'flow_control'],
  },
  {
    id: 'rhythm-2',
    category: '节奏控制',
    title: '制造停顿',
    description: '用段落和留白制造节奏',
    before: '他看着她，想要说些什么，但是说不出口。他知道这是最后一次见面了。他心里很难过。',
    after: `他看着她。

想说点什么。嘴张了张，又闭上。

这是最后一次了。他知道。`,
    keyChanges: ['分段制造停顿', '用动作替代心理描述', '留白'],
    techniques: ['paragraph_break', 'ellipsis', 'white_space'],
  },
];

// ============ 中文风格类 (新增) ============
export const CHINESE_STYLE_EXAMPLES: RewriteExample[] = [
  {
    id: 'cn-style-1',
    category: '中文风格',
    title: '去除翻译腔',
    description: '删除"当……时"等典型翻译腔',
    before: '当你在手机屏幕上顺畅地敲下"川普又在搞滑稽戏"或者嘲讽赖清德是"台独金孙"时，既然能骂川普为什么不能聊聊身边人？',
    after: '你在手机上敲下"川普又在出洋相"或者嘲讽赖清德是"台独分子"时——既然敢骂川普，为什么不敢提及伏地魔？',
    keyChanges: ['删除"当……时"', '用破折号制造转折', '具体化"身边人"为"伏地魔"'],
    techniques: ['remove_translationese', 'use_dash', 'specific_reference'],
  },
  {
    id: 'cn-style-2',
    category: '中文风格',
    title: '去除儿化音',
    description: '将儿化音改为标准表达',
    before: '那儿的人都喜欢玩儿这个。',
    after: '那里的人都喜欢玩这个。',
    keyChanges: ['"那儿"→"那里"', '"玩儿"→"玩"'],
    techniques: ['remove_beijing_accent'],
  },
  {
    id: 'cn-style-3',
    category: '中文风格',
    title: '去除蹩脚比喻',
    description: '删除AI惯用的生硬比喻',
    before: '《批评中医》最像一把扫帚的地方就在这里：不陪你玩文化身份那套，盯着的只有一个问题——你说能治，那就拿得出可检验、可证伪、可重复的证据来。',
    after: '《批评中医》这里最绝的地方在于：不陪你玩文化身份那套……',
    keyChanges: ['删除"像一把扫帚"', '用"最绝的地方"代替'],
    techniques: ['remove_cliche_metaphor', 'direct_statement'],
  },
  {
    id: 'cn-style-4',
    category: '中文风格',
    title: '修复单字形容词',
    description: '将诡异单字形容词改为正常表达',
    before: '方舟子讲过"无神论的道德观"：道德规范不需要神背书，它是理性权衡后的产物。放到教育里，我的翻译更粗暴一点：别急着把孩子训练成乖，先把他训练成会判断。',
    after: '"别急着把孩子训练得只会卖乖，先帮他训练出判断力。"',
    keyChanges: ['"训练成乖"→"训练得只会卖乖"'],
    techniques: ['fix_single_char_adjective'],
  },
  {
    id: 'cn-style-5',
    category: '中文风格',
    title: '去除虚假亲昵',
    description: '删除"咱们"等虚假亲昵词',
    before: '咱们都知道，中医是中华文化的瑰宝。咱们应该共同努力，把中医发扬光大。',
    after: '我知道，中医是中华文化的瑰宝。但我还是要说：这简直是胡说八道。',
    keyChanges: ['删除"咱们"', '用"我"表达主观观点', '加入批判性态度'],
    techniques: ['remove_false_intimacy', 'subjective_voice', 'critical_attitude'],
  },
  {
    id: 'cn-style-6',
    category: '中文风格',
    title: '去除导游式结构',
    description: '拒绝背景综述开头和升华结尾',
    before: '脱发是一个历史悠久的话题。从古至今，人们都在为脱发困扰。让我们共同努力，找到解决脱发的方法。',
    after: '别人嘲笑我秃头的时候，我才意识到问题的严重性。',
    keyChanges: ['删除背景综述', '删除升华结尾', '切片式切入'],
    techniques: ['slice_entry', 'remove_tour_guide'],
  },
  {
    id: 'cn-style-7',
    category: '中文风格',
    title: '建立假想敌',
    description: '用"我"的观点反驳具体对象',
    before: '有人认为，中医是中华文化的瑰宝。相关专家表示，应该大力发展中医药。',
    after: '我觉得这是胡说八道。《批评中医》这里最绝的地方在于：不陪你玩文化身份那套。',
    keyChanges: ['删除"有人认为"', '用"我"表达', '具体化反驳对象'],
    techniques: ['adversary_method', 'subjective_voice'],
  },
  {
    id: 'cn-style-8',
    category: '中文风格',
    title: '语流呼吸感',
    description: '用破折号和问号制造节奏',
    before: '此外，中医缺乏科学依据。另外，中药的副作用也不容忽视。最后，我们应该理性看待中医。',
    after: '中医没有科学依据——这不是我说的，这是他们自己的问题。你信吗？我不信。',
    keyChanges: ['删除"此外/另外/最后"', '用破折号转折', '连续反问'],
    techniques: ['rhythm_flow', 'dash_usage', 'rhetorical_question'],
  },
];

// ============ 所有示例汇总 ============
export const ALL_EXAMPLES: RewriteExample[] = [
  ...OPENER_EXAMPLES,
  ...STRUCTURE_EXAMPLES,
  ...EMOTION_EXAMPLES,
  ...METAPHOR_EXAMPLES,
  ...TRANSLATIONESE_EXAMPLES,
  ...VOCABULARY_EXAMPLES,
  ...RHYTHM_EXAMPLES,
  ...CHINESE_STYLE_EXAMPLES,
];

// ============ 按分类获取示例 ============
export function getExamplesByCategory(category: string): RewriteExample[] {
  return ALL_EXAMPLES.filter(e => e.category === category);
}

// ============ 获取随机示例（用于提示词） ============
export function getRandomExamples(count: number = 3): RewriteExample[] {
  const shuffled = [...ALL_EXAMPLES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ============ 获取特定技术的示例 ============
export function getExamplesByTechnique(technique: string): RewriteExample[] {
  return ALL_EXAMPLES.filter(e => e.techniques.includes(technique));
}
