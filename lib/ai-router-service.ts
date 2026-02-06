// AI 路由服务
// 集成 LLM Router 与 AI 生成功能

import { generateAIContentStream, generateAIContent } from './ai';
import { getLLMRouter, RoutingRequest, TaskType, ModelUsageRecord } from './llm-router';
import { StorageManager } from './storage';

export interface AIRouterOptions {
  taskType?: TaskType;
  systemPrompt: string;
  userPrompt: string;
  onUpdate?: (content: string) => void;
  signal?: AbortSignal;
  priority?: 'speed' | 'quality' | 'cost';
  maxCost?: number;
  requireStreaming?: boolean;
}

export interface AIRouterResult {
  content: string;
  modelUsed: string;
  modelName: string;
  cost: number;
  latency: number;
  reasoning: string;
}

/**
 * 使用路由的AI生成（流式）
 */
export async function generateWithRouter(
  options: AIRouterOptions
): Promise<AIRouterResult> {
  const router = getLLMRouter();
  const startTime = Date.now();

  // 1. 检测任务类型（如果没有指定）
  const taskType = options.taskType || router.detectTaskType(options.userPrompt);

  // 2. 构建路由请求
  const routingRequest: RoutingRequest = {
    taskType,
    content: options.userPrompt,
    systemPrompt: options.systemPrompt,
    priority: options.priority,
    maxCost: options.maxCost,
    requireStreaming: options.requireStreaming ?? true,
    contextLength: estimateTokens(options.systemPrompt + options.userPrompt),
  };

  // 3. 路由决策
  const routingResult = await router.route(routingRequest);
  const selectedModel = routingResult.selectedModel;

  console.log(`[AI Router] 选择模型: ${selectedModel.name}`);
  console.log(`[AI Router] 理由: ${routingResult.reasoning}`);
  console.log(`[AI Router] 预估成本: $${routingResult.estimatedCost.toFixed(4)}`);

  // 4. 准备API调用
  const apiKey = getModelApiKey(selectedModel.provider);
  const baseUrl = selectedModel.baseUrl;
  const modelId = selectedModel.modelId;

  if (!apiKey) {
    // 如果没有API Key，尝试使用备用模型
    console.warn(`[AI Router] ${selectedModel.name} 没有配置API Key，尝试备用模型`);
    for (const fallback of routingResult.fallbackModels) {
      const fallbackKey = getModelApiKey(fallback.provider);
      if (fallbackKey) {
        console.log(`[AI Router] 切换到备用模型: ${fallback.name}`);
        return generateWithModel(fallback, options, startTime, routingResult.reasoning);
      }
    }
    throw new Error('没有可用的API Key，请在设置中配置');
  }

  // 5. 执行生成
  return generateWithModel(selectedModel, options, startTime, routingResult.reasoning);
}

/**
 * 使用指定模型生成
 */
async function generateWithModel(
  model: { id: string; name: string; modelId: string; baseUrl: string; capabilities: any },
  options: AIRouterOptions,
  startTime: number,
  reasoning: string
): Promise<AIRouterResult> {
  const router = getLLMRouter();
  const apiKey = getModelApiKey(model.id.split('-')[0]) || '';
  
  let content = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    if (options.onUpdate) {
      // 流式生成
      await generateAIContentStream(
        apiKey,
        options.systemPrompt,
        options.userPrompt,
        model.baseUrl,
        model.modelId,
        (chunk) => {
          content = chunk;
          options.onUpdate!(chunk);
        },
        options.signal
      );
    } else {
      // 非流式生成
      content = await generateAIContent(
        apiKey,
        options.systemPrompt,
        options.userPrompt,
        model.baseUrl,
        model.modelId
      ) || '';
    }

    // 估算token数
    inputTokens = estimateTokens(options.systemPrompt + options.userPrompt);
    outputTokens = estimateTokens(content);

    const latency = Date.now() - startTime;
    const cost = calculateCost(model, inputTokens, outputTokens);

    // 记录使用情况
    const usageRecord: ModelUsageRecord = {
      modelId: model.id,
      taskType: options.taskType || 'creative_writing',
      timestamp: Date.now(),
      inputTokens,
      outputTokens,
      cost,
      latency,
      quality: 8, // 默认质量分，实际可以通过评估获得
      success: true,
    };
    router.recordUsage(usageRecord);

    return {
      content,
      modelUsed: model.id,
      modelName: model.name,
      cost,
      latency,
      reasoning,
    };

  } catch (error) {
    const latency = Date.now() - startTime;
    
    // 记录失败
    const usageRecord: ModelUsageRecord = {
      modelId: model.id,
      taskType: options.taskType || 'creative_writing',
      timestamp: Date.now(),
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      latency,
      quality: 0,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
    router.recordUsage(usageRecord);

    throw error;
  }
}

/**
 * 获取模型的API Key
 */
function getModelApiKey(provider: string): string | null {
  const keyMap: Record<string, string[]> = {
    'siliconflow': ['SILICONFLOW_API_KEY', 'novel_writer_api_key'],
    'openai': ['OPENAI_API_KEY'],
    'anthropic': ['ANTHROPIC_API_KEY'],
    'alibaba': ['DASHSCOPE_API_KEY'],
    'deepseek': ['DEEPSEEK_API_KEY'],
  };

  const keys = keyMap[provider] || [];
  for (const key of keys) {
    const value = StorageManager.get(key);
    if (value) return value;
  }

  // 尝试通用key
  return StorageManager.get('novel_writer_api_key') || 
         StorageManager.get('writing_api_key') ||
         null;
}

/**
 * 估算token数
 */
function estimateTokens(text: string): number {
  // 简单估算：中文字符数 / 2 + 英文单词数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return Math.ceil(chineseChars / 2 + englishWords);
}

/**
 * 计算成本
 */
function calculateCost(
  model: { capabilities: any },
  inputTokens: number,
  outputTokens: number
): number {
  // 从模型配置获取成本，这里简化处理
  const costPer1K = 0.002; // 默认成本
  return ((inputTokens + outputTokens) / 1000) * costPer1K;
}

/**
 * 获取路由统计信息
 */
export function getRouterStats() {
  const router = getLLMRouter();
  return {
    strategy: router.getStrategy(),
    usage: router.getUsageStats(),
    models: router.getModels().map(m => ({
      id: m.id,
      name: m.name,
      enabled: m.enabled,
      performance: router.getModelPerformance(m.id),
    })),
  };
}

/**
 * 设置路由策略
 */
export function setRouterStrategy(strategy: 'speed' | 'quality' | 'cost' | 'balanced' | 'auto') {
  const router = getLLMRouter();
  router.setStrategy(strategy);
}

/**
 * 启用/禁用模型
 */
export function enableModel(modelId: string, enabled: boolean) {
  const router = getLLMRouter();
  router.enableModel(modelId, enabled);
}
