// 记忆系统类型定义

// ==================== 角色记忆 ====================

export interface CharacterMemory {
  id: string;
  name: string;
  aliases: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  personality: {
    traits: string[];
    strengths: string[];
    weaknesses: string[];
    values: string[];
  };
  appearance: {
    description: string;
    distinctiveFeatures: string[];
  };
  background: {
    origin: string;
    motivation: string;
    goals: string[];
    fears: string[];
  };
  relationships: Array<{
    characterId: string;
    characterName: string;
    relationship: string;
    dynamic: string;
  }>;
  development: {
    arc: string;
    currentState: string;
    keyEvents: string[];
  };
  createdAt: number;
  updatedAt: number;
}

// ==================== 世界观记忆 ====================

export interface WorldBuildingMemory {
  id: string;
  category: 'cultivation_system' | 'geography' | 'history' | 'politics' | 'culture' | 'rules' | 'other';
  name: string;
  description: string;
  details: Record<string, any>;
  relatedChapters: string[];
}

// ==================== 剧情记忆 ====================

export interface PlotMemory {
  id: string;
  type: 'main_plot' | 'sub_plot' | 'side_story';
  title: string;
  description: string;
  status: 'ongoing' | 'completed' | 'pending';
  involvedCharacters: string[];
  keyEvents: Array<{
    event: string;
    chapter: string;
    timestamp: number;
  }>;
}

// ==================== 风格记忆 ====================

export interface StyleMemory {
  id: string;
  category: 'tone' | 'pacing' | 'description_style' | 'dialogue_style' | 'vocabulary';
  preference: string;
  examples: string[];
  strength: number;
}

// ==================== 事件历史 ====================

export interface ChapterEvent {
  chapterId: string;
  chapterName: string;
  summary: string;
  keyEvents: string[];
  timestamp: number;
}

// ==================== 工作记忆 ====================

export interface SceneState {
  location: string;
  characters: string[];
  mood: string;
  time: string;
}

export interface EmotionalState {
  current: string;
  target: string;
  progression: string;
}

export interface WorkingMemory {
  chapterId: string;
  chapterName: string;
  chapterGoal: string;
  sceneStack: SceneState[];
  activePlots: string[];
  pendingQuestions: string[];
  emotionalState: EmotionalState;
}

// ==================== 理解上下文 ====================

export interface UnderstandingContext {
  plot?: {
    currentSituation?: string;
    goal?: string;
    conflict?: string;
    twist?: string;
  };
  character?: {
    protagonistState?: string;
    motivation?: string;
    emotion?: string;
  };
  scene?: {
    setting?: string;
    atmosphere?: string;
    pacing?: 'fast' | 'slow' | 'mixed';
  };
  style?: {
    tone?: string;
    perspective?: 'first' | 'third';
    detailLevel?: 'concise' | 'detailed' | 'vivid';
  };
}

// ==================== 书籍记忆容器 ====================

export interface BookMemory {
  bookId: string;
  bookTitle: string;
  characters: CharacterMemory[];
  worldBuilding: WorldBuildingMemory[];
  plots: PlotMemory[];
  styles: StyleMemory[];
  eventHistory: ChapterEvent[];
  workingMemory: WorkingMemory | null;
  understanding: UnderstandingContext;
  lastUpdated: number;
}

// ==================== Agent 响应类型 ====================

export interface AgentResponse {
  type: 'question' | 'writing' | 'clarification' | 'confirmation';
  content: string;
  progress?: {
    understandingScore: number;
    knownCharacters: number;
    knownSettings: number;
  };
  suggestions?: string[];
}

// ==================== 对话历史 ====================

export interface DialogueEntry {
  role: 'user' | 'agent';
  type: 'question' | 'answer' | 'clarification' | 'writing';
  content: string;
  timestamp: number;
}
