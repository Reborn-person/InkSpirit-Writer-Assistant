// 去AI率/人性化改写 - 类型定义

// ============ 评分系统 ============

export interface HumanizeScore {
    overall: number;        // 总分 0-100，越高越像人写
    breakdown: {
        repetition: number;   // 重复度 (低=好)
        structure: number;    // 结构自然度
        vocabulary: number;   // 词汇丰富度
        emotion: number;      // 情感真实度
        detail: number;       // 细节丰富度
    };
    issues: Issue[];        // 具体问题列表
}

export interface Issue {
    id: string;
    type: IssueType;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    position: {
        start: number;
        end: number;
    };
    excerpt: string;        // 问题片段
    suggestion?: string;    // 改写建议
}

export type IssueType =
    | 'parallelism'        // 排比句过多
    | 'repetition'         // 词汇重复
    | 'exclamation'        // 感叹号滥用
    | 'exaggeration'       // 浮夸表达
    | 'summary'            // 过度总结
    | 'lack_detail'        // 缺乏细节
    | 'abstract_metaphor'  // 抽象比喻
    | 'long_sentence'      // 长句堆砌
    | 'emotion_floating'   // 情绪悬浮
    | 'redundant_words';   // 冗余词汇

// ============ 改写结果 ============

export interface HumanizeResult {
    original: string;
    rewritten: string;
    scoreBefore: HumanizeScore;
    scoreAfter: HumanizeScore;
    changes: Change[];
}

export interface Change {
    type: 'replace' | 'delete' | 'insert';
    original: string;
    replacement: string;
    reason: string;
}

// ============ 检测配置 ============

export interface DetectionConfig {
    // 排比句检测
    parallelismThreshold: number;   // 连续相似句式阈值 (默认 3)

    // 重复词检测
    repetitionWindow: number;       // 检测窗口大小 (默认 100字)
    repetitionThreshold: number;    // 同词出现次数阈值 (默认 3)

    // 感叹号检测
    exclamationRatio: number;       // 感叹号占标点比例阈值 (默认 0.3)

    // 浮夸词列表
    exaggerationWords: string[];
}

export const DEFAULT_CONFIG: DetectionConfig = {
    parallelismThreshold: 3,
    repetitionWindow: 100,
    repetitionThreshold: 3,
    exclamationRatio: 0.3,
    exaggerationWords: [
        '震撼', '惊天', '绝世', '无敌', '逆天', '恐怖', '可怕',
        '瞬间', '刹那', '霎时', '顿时', '登时', '立刻', '马上',
        '竟然', '居然', '没想到', '不可思议', '难以置信',
        '无比', '极其', '非常', '特别', '十分', '格外',
    ]
};

// ============ 扩展检测规则 ============

// 冗余词汇列表
export const REDUNDANT_WORDS = [
    '非常', '极其', '十分', '格外', '特别',
    '在……的时候', '充满……气息', '充满了',
    '的地得', '进行了', '开始了'
];

// 抽象比喻关键词（容易脱离场景）
export const ABSTRACT_METAPHOR_KEYWORDS = [
    '宇宙', '黑洞', '星辰', '深渊', '虚空',
    '灵魂', '命运', '永恒', '无限', '时空'
];

// 情绪词汇（需要替换为细节描写）
export const EMOTION_WORDS = [
    '开心', '难过', '伤心', '愤怒', '绝望',
    '高兴', '悲伤', '痛苦', '快乐', '恐惧',
    '激动', '兴奋', '紧张', '害怕', '担心'
];
