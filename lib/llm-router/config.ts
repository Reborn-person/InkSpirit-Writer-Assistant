// LLM Routing 配置
// 预定义的模型配置和路由规则

import { ModelConfig, RoutingRule, TaskType } from './types';

// ==================== 默认模型配置 ====================

export const DEFAULT_MODELS: ModelConfig[] = [
  // DeepSeek 系列
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'siliconflow',
    modelId: 'deepseek-ai/DeepSeek-V3',
    baseUrl: 'https://api.siliconflow.cn/v1',
    capabilities: {
      creativity: 8,
      reasoning: 8,
      speed: 7,
      costEfficiency: 9,
      contextLength: 64000,
      chineseQuality: 9,
      instructionFollowing: 8,
    },
    costPer1KTokens: {
      input: 0.001,
      output: 0.002,
    },
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    enabled: true,
    priority: 1,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'siliconflow',
    modelId: 'deepseek-ai/DeepSeek-R1',
    baseUrl: 'https://api.siliconflow.cn/v1',
    capabilities: {
      creativity: 9,
      reasoning: 10,
      speed: 6,
      costEfficiency: 8,
      contextLength: 64000,
      chineseQuality: 9,
      instructionFollowing: 9,
    },
    costPer1KTokens: {
      input: 0.002,
      output: 0.004,
    },
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    enabled: true,
    priority: 2,
  },
  // OpenAI 系列
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    capabilities: {
      creativity: 9,
      reasoning: 9,
      speed: 8,
      costEfficiency: 6,
      contextLength: 128000,
      chineseQuality: 8,
      instructionFollowing: 9,
    },
    costPer1KTokens: {
      input: 0.005,
      output: 0.015,
    },
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    enabled: true,
    priority: 3,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    capabilities: {
      creativity: 7,
      reasoning: 7,
      speed: 9,
      costEfficiency: 10,
      contextLength: 128000,
      chineseQuality: 7,
      instructionFollowing: 8,
    },
    costPer1KTokens: {
      input: 0.00015,
      output: 0.0006,
    },
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    enabled: true,
    priority: 4,
  },
  // Claude 系列
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com/v1',
    capabilities: {
      creativity: 10,
      reasoning: 9,
      speed: 7,
      costEfficiency: 7,
      contextLength: 200000,
      chineseQuality: 8,
      instructionFollowing: 10,
    },
    costPer1KTokens: {
      input: 0.003,
      output: 0.015,
    },
    maxTokens: 8192,
    temperature: {
      min: 0,
      max: 1,
      default: 0.7,
    },
    enabled: true,
    priority: 5,
  },
  // 轻量级模型
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    provider: 'alibaba',
    modelId: 'qwen-turbo',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    capabilities: {
      creativity: 6,
      reasoning: 6,
      speed: 10,
      costEfficiency: 10,
      contextLength: 8000,
      chineseQuality: 8,
      instructionFollowing: 7,
    },
    costPer1KTokens: {
      input: 0.0005,
      output: 0.001,
    },
    maxTokens: 2048,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    enabled: true,
    priority: 6,
  },
];

// ==================== 默认路由规则 ====================

export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  // 创意写作 - 使用创意能力强的模型
  {
    taskType: 'creative_writing',
    preferredModels: ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o', 'deepseek-v3'],
    fallbackModels: ['gpt-4o-mini', 'qwen-turbo'],
    requirements: {
      minCreativity: 8,
      minContextLength: 4000,
      requireChinese: true,
    },
    temperature: 0.8,
    maxTokens: 4000,
  },
  // 对话生成 - 需要好的指令遵循能力
  {
    taskType: 'dialogue_generation',
    preferredModels: ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o'],
    fallbackModels: ['deepseek-v3', 'gpt-4o-mini'],
    requirements: {
      minCreativity: 7,
      minContextLength: 4000,
      requireChinese: true,
    },
    temperature: 0.75,
    maxTokens: 3000,
  },
  // 场景描写 - 需要好的创意和中文能力
  {
    taskType: 'scene_description',
    preferredModels: ['deepseek-r1', 'claude-3-5-sonnet', 'deepseek-v3'],
    fallbackModels: ['gpt-4o', 'gpt-4o-mini'],
    requirements: {
      minCreativity: 8,
      requireChinese: true,
    },
    temperature: 0.8,
    maxTokens: 3000,
  },
  // 剧情规划 - 需要强推理能力
  {
    taskType: 'plot_planning',
    preferredModels: ['deepseek-r1', 'claude-3-5-sonnet', 'gpt-4o'],
    fallbackModels: ['deepseek-v3'],
    requirements: {
      minReasoning: 8,
      minCreativity: 7,
      requireChinese: true,
    },
    temperature: 0.7,
    maxTokens: 4000,
  },
  // 角色设计 - 需要创意和一致性
  {
    taskType: 'character_design',
    preferredModels: ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o'],
    fallbackModels: ['deepseek-v3', 'gpt-4o-mini'],
    requirements: {
      minCreativity: 8,
      minContextLength: 4000,
      requireChinese: true,
    },
    temperature: 0.75,
    maxTokens: 3000,
  },
  // 世界观构建 - 需要强推理和长上下文
  {
    taskType: 'world_building',
    preferredModels: ['claude-3-5-sonnet', 'deepseek-r1'],
    fallbackModels: ['gpt-4o', 'deepseek-v3'],
    requirements: {
      minReasoning: 8,
      minContextLength: 8000,
      requireChinese: true,
    },
    temperature: 0.7,
    maxTokens: 4000,
  },
  // 文风润色 - 需要好的语言质量
  {
    taskType: 'style_polish',
    preferredModels: ['claude-3-5-sonnet', 'deepseek-r1', 'gpt-4o'],
    fallbackModels: ['deepseek-v3'],
    requirements: {
      minCreativity: 7,
      requireChinese: true,
    },
    temperature: 0.6,
    maxTokens: 3000,
  },
  // 语法检查 - 轻量级任务
  {
    taskType: 'grammar_check',
    preferredModels: ['gpt-4o-mini', 'deepseek-v3', 'qwen-turbo'],
    fallbackModels: ['gpt-4o'],
    requirements: {
      minReasoning: 6,
      maxCostPer1K: 0.001,
    },
    temperature: 0.3,
    maxTokens: 1000,
  },
  // 事实核查 - 需要推理能力
  {
    taskType: 'fact_check',
    preferredModels: ['deepseek-r1', 'gpt-4o', 'claude-3-5-sonnet'],
    fallbackModels: ['deepseek-v3'],
    requirements: {
      minReasoning: 8,
    },
    temperature: 0.3,
    maxTokens: 1000,
  },
  // 摘要总结 - 轻量级任务
  {
    taskType: 'summarization',
    preferredModels: ['gpt-4o-mini', 'deepseek-v3', 'qwen-turbo'],
    fallbackModels: ['gpt-4o'],
    requirements: {
      minReasoning: 6,
      maxCostPer1K: 0.001,
    },
    temperature: 0.5,
    maxTokens: 1500,
  },
  // 翻译 - 需要好的双语能力
  {
    taskType: 'translation',
    preferredModels: ['claude-3-5-sonnet', 'gpt-4o', 'deepseek-v3'],
    fallbackModels: ['gpt-4o-mini'],
    requirements: {
      minCreativity: 6,
      requireChinese: true,
    },
    temperature: 0.5,
    maxTokens: 2000,
  },
  // 简单问答 - 使用最便宜的模型
  {
    taskType: 'simple_qa',
    preferredModels: ['qwen-turbo', 'gpt-4o-mini', 'deepseek-v3'],
    fallbackModels: ['gpt-4o'],
    requirements: {
      maxCostPer1K: 0.001,
    },
    temperature: 0.7,
    maxTokens: 1000,
  },
  // 复杂推理 - 使用最强模型
  {
    taskType: 'complex_reasoning',
    preferredModels: ['deepseek-r1', 'claude-3-5-sonnet', 'gpt-4o'],
    fallbackModels: ['deepseek-v3'],
    requirements: {
      minReasoning: 9,
      minContextLength: 4000,
    },
    temperature: 0.6,
    maxTokens: 4000,
  },
  // 技术写作
  {
    taskType: 'technical_writing',
    preferredModels: ['claude-3-5-sonnet', 'gpt-4o', 'deepseek-r1'],
    fallbackModels: ['deepseek-v3'],
    requirements: {
      minReasoning: 7,
      minCreativity: 6,
    },
    temperature: 0.6,
    maxTokens: 3000,
  },
  // 代码生成
  {
    taskType: 'code_generation',
    preferredModels: ['claude-3-5-sonnet', 'gpt-4o', 'deepseek-r1'],
    fallbackModels: ['deepseek-v3', 'gpt-4o-mini'],
    requirements: {
      minReasoning: 8,
      instructionFollowing: 8,
    },
    temperature: 0.3,
    maxTokens: 3000,
  },
];

// ==================== 任务类型检测关键词 ====================

export const TASK_TYPE_KEYWORDS: Record<TaskType, string[]> = {
  creative_writing: ['写', '创作', '故事', '小说', '章节', '情节', '正文'],
  technical_writing: ['说明', '报告', '文档', '介绍', '分析'],
  dialogue_generation: ['对话', '台词', '说话', '交谈', '聊天'],
  scene_description: ['场景', '描写', '环境', '画面', '氛围'],
  plot_planning: ['大纲', '剧情', '规划', '设计', '构思', '框架'],
  character_design: ['角色', '人物', '性格', '人设', '主角', '配角'],
  world_building: ['世界观', '设定', '背景', '体系', '规则'],
  style_polish: ['润色', '修改', '优化', '改进', '调整', '美化'],
  grammar_check: ['检查', '纠错', '语法', '错别字', '病句'],
  fact_check: ['核实', '查证', '确认', '对不对', '是否正确'],
  summarization: ['总结', '摘要', '概括', '提炼', '简述'],
  translation: ['翻译', '转成', '译成', '英文', '中文'],
  code_generation: ['代码', '程序', '函数', '脚本', '算法'],
  simple_qa: ['是什么', '为什么', '怎么', '如何', '吗？', '？'],
  complex_reasoning: ['推理', '分析', '思考', '逻辑', '论证'],
};
