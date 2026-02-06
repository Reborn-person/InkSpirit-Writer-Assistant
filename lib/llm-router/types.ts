// LLM Routing 类型定义

// ==================== 任务类型 ====================

export type TaskType = 
  | 'creative_writing'      // 创意写作（小说、故事）
  | 'technical_writing'     // 技术写作（说明文、报告）
  | 'dialogue_generation'   // 对话生成
  | 'scene_description'     // 场景描写
  | 'plot_planning'         // 剧情规划
  | 'character_design'      // 角色设计
  | 'world_building'        // 世界观构建
  | 'style_polish'          // 文风润色
  | 'grammar_check'         // 语法检查
  | 'fact_check'            // 事实核查
  | 'summarization'         // 摘要总结
  | 'translation'           // 翻译
  | 'code_generation'       // 代码生成
  | 'simple_qa'             // 简单问答
  | 'complex_reasoning';    // 复杂推理

// ==================== 模型能力 ====================

export interface ModelCapabilities {
  creativity: number;       // 创意能力 0-10
  reasoning: number;        // 推理能力 0-10
  speed: number;            // 响应速度 0-10
  costEfficiency: number;   // 成本效率 0-10
  contextLength: number;    // 上下文长度（token数）
  chineseQuality: number;   // 中文质量 0-10
  instructionFollowing: number; // 指令遵循能力 0-10
}

// ==================== 模型配置 ====================

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;          // 实际的模型ID
  baseUrl: string;
  apiKey?: string;
  capabilities: ModelCapabilities;
  costPer1KTokens: {        // 每1000 token的成本（美元）
    input: number;
    output: number;
  };
  maxTokens: number;
  temperature: {
    min: number;
    max: number;
    default: number;
  };
  enabled: boolean;
  priority: number;         // 优先级，数字越小优先级越高
}

// ==================== 路由规则 ====================

export interface RoutingRule {
  taskType: TaskType;
  preferredModels: string[]; // 按优先级排序的模型ID列表
  fallbackModels: string[];  // 备用模型
  requirements: {
    minCreativity?: number;
    minReasoning?: number;
    minContextLength?: number;
    maxCostPer1K?: number;
    requireChinese?: boolean;
  };
  temperature: number;
  maxTokens: number;
}

// ==================== 路由请求 ====================

export interface RoutingRequest {
  taskType: TaskType;
  content: string;
  systemPrompt?: string;
  preferredProvider?: string;  // 用户偏好的提供商
  maxCost?: number;            // 最大成本限制
  requireStreaming?: boolean;  // 是否需要流式输出
  contextLength?: number;      // 上下文长度预估
  priority?: 'speed' | 'quality' | 'cost'; // 优先级
}

// ==================== 路由结果 ====================

export interface RoutingResult {
  selectedModel: ModelConfig;
  fallbackModels: ModelConfig[];
  reasoning: string;           // 选择理由
  estimatedCost: number;       // 预估成本
  estimatedTokens: number;     // 预估token数
  confidence: number;          // 选择置信度 0-1
}

// ==================== 路由策略 ====================

export type RoutingStrategy = 
  | 'quality_first'      // 质量优先
  | 'cost_first'         // 成本优先
  | 'speed_first'        // 速度优先
  | 'balanced'           // 平衡模式
  | 'auto';              // 自动选择

// ==================== 使用记录 ====================

export interface ModelUsageRecord {
  modelId: string;
  taskType: TaskType;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;         // 响应时间（毫秒）
  quality: number;         // 质量评分 0-10
  success: boolean;
  errorMessage?: string;
}

// ==================== 性能指标 ====================

export interface ModelPerformance {
  modelId: string;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  avgCost: number;
  avgQuality: number;
  lastUsed: number;
}
