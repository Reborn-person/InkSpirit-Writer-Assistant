// 一致性检查器 - 类型定义

// ============ 数据库结构 ============

export interface CharacterProfile {
    id: string;
    name: string;
    appearance: string[];      // 外貌特征列表
    personality: string[];     // 性格特征列表
    abilities: string[];       // 能力列表
    relationships: Relationship[];
    firstAppearance?: number;   // 首次出现章节号
    mentions: ChapterMention[]; // 所有提及记录
    nodeId?: string;            // God Mode 节点 ID
}

export interface Relationship {
    targetId: string;
    targetName: string;
    type: 'ally' | 'enemy' | 'family' | 'friend' | 'neutral';
    description: string;
}

export interface ChapterMention {
    chapterNumber: number;
    chapterTitle?: string;
    excerpt: string;           // 相关文本片段
    context: string;           // 上下文（前后各50字）
    position: number;          // 在章节中的位置（字符偏移）
}

export interface WorldSetting {
    id: string;
    type: 'power' | 'geography' | 'faction' | 'economy' | 'culture';
    name: string;
    description: string;
    rules: string[];           // 规则/设定列表
    mentions: ChapterMention[];
    nodeId?: string;           // God Mode 节点 ID
}

export interface TimelineEvent {
    id: string;
    chapter: number;
    worldDate: string;         // 世界时间
    era: string;               // 时代
    event: string;             // 事件描述
    involvedCharacters: string[]; // 涉及人物 ID
    nodeId?: string;           // God Mode 节点 ID
}

export interface ConsistencyDatabase {
    characters: CharacterProfile[];
    worldSettings: WorldSetting[];
    timeline: TimelineEvent[];
    chapters: ChapterData[];
    characterTracking?: any;   // 实时角色状态追踪数据
    lastUpdated: number;       // 最后更新时间戳
}

export interface ChapterData {
    number: number;
    title: string;
    content: string;
    wordCount: number;
    createdAt: number;
    updatedAt: number;
}

// ============ 一致性检查结果 ============

export type ConsistencyType = 'character' | 'world' | 'timeline';
export type SeverityLevel = 'error' | 'warning' | 'info';

export interface ConsistencyCheck {
    id: string;
    type: ConsistencyType;
    severity: SeverityLevel;
    title: string;
    description: string;
    evidence: Evidence[];
    suggestion?: string;
    createdAt: number;
}

export interface Evidence {
    chapterNumber: number;
    chapterTitle?: string;
    excerpt: string;           // 相关文本片段
    location: string;          // 章节内位置描述
    highlightStart?: number;   // 高亮起始位置
    highlightEnd?: number;     // 高亮结束位置
}

export interface ConsistencyReport {
    checks: ConsistencyCheck[];
    summary: {
        total: number;
        errors: number;
        warnings: number;
        info: number;
    };
    generatedAt: number;
    scope: {
        characterIds?: string[];
        chapterRange?: [number, number];
        types?: ConsistencyType[];
    };
}

// ============ 检查配置 ============

export interface CheckOptions {
    scope?: 'all' | 'character' | 'world' | 'timeline';
    characterIds?: string[];   // 指定检查的人物
    chapterRange?: [number, number]; // 章节范围
    targetChapter?: number;    // 指定检查的特定章节 (以此章节为目标，此前章节为参考)
    includeCards?: boolean;    // 是否包含卡片库内容作为参考
    skipCache?: boolean;       // 跳过缓存，强制重新检查
}
