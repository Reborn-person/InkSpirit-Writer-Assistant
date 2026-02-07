// 网文写作专用模型路由
// 每个步骤使用指定的硅基流动模型

import { generateAIContentStream, generateAIContent } from './ai';
import { StorageManager, STORAGE_KEYS } from './storage';

// 网文写作步骤类型
export type NovelWritingStep = 
  | 'extract_information'    // 信息提取
  | 'assess_understanding'   // 理解评估
  | 'ask_question'           // 智能提问
  | 'context_discovery'      // 动态上下文发现（本地处理）
  | 'generate_writing';      // 正文写作

// 步骤模型配置
interface StepModelConfig {
  step: NovelWritingStep;
  modelId: string;
  baseUrl: string;
  description: string;
  maxTokens: number;
  temperature: number;
}

// 硅基流动专用配置
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';

// 步骤模型映射
const STEP_MODELS: Record<NovelWritingStep, StepModelConfig> = {
  extract_information: {
    step: 'extract_information',
    modelId: 'Qwen/Qwen3-8B',
    baseUrl: SILICONFLOW_BASE_URL,
    description: '信息提取 - 从章节内容提取角色、剧情、场景',
    maxTokens: 2000,
    temperature: 0.3,
  },
  assess_understanding: {
    step: 'assess_understanding',
    modelId: 'Pro/deepseek-ai/DeepSeek-V3.2',
    baseUrl: SILICONFLOW_BASE_URL,
    description: '理解评估 - 评估理解程度',
    maxTokens: 1000,
    temperature: 0.5,
  },
  ask_question: {
    step: 'ask_question',
    modelId: 'Pro/deepseek-ai/DeepSeek-V3.2',
    baseUrl: SILICONFLOW_BASE_URL,
    description: '智能提问 - 向用户提问完善理解',
    maxTokens: 1500,
    temperature: 0.7,
  },
  context_discovery: {
    step: 'context_discovery',
    modelId: 'local', // 本地处理，不使用LLM
    baseUrl: '',
    description: '动态上下文发现 - 本地向量检索',
    maxTokens: 0,
    temperature: 0,
  },
  generate_writing: {
    step: 'generate_writing',
    modelId: 'Pro/zai-org/GLM-4.7',
    baseUrl: SILICONFLOW_BASE_URL,
    description: '正文写作 - 生成完整章节',
    maxTokens: 8000,
    temperature: 0.8,
  },
};

// 路由选项
export interface NovelRouterOptions {
  step: NovelWritingStep;
  systemPrompt: string;
  userPrompt: string;
  onUpdate?: (content: string) => void;
  signal?: AbortSignal;
}

// 路由结果
export interface NovelRouterResult {
  content: string;
  step: NovelWritingStep;
  modelUsed: string;
  latency: number;
}

/**
 * 网文写作模型路由
 * 根据步骤自动选择对应的模型
 */
export async function routeNovelWriting(
  options: NovelRouterOptions
): Promise<NovelRouterResult> {
  const startTime = Date.now();
  const config = STEP_MODELS[options.step];

  // 本地处理的步骤直接返回
  if (config.modelId === 'local') {
    return {
      content: '',
      step: options.step,
      modelUsed: 'local',
      latency: 0,
    };
  }

  // 获取API Key
  const apiKey = getSiliconFlowApiKey();
  if (!apiKey) {
    throw new Error('请在设置中配置 SiliconFlow API Key');
  }

  console.log(`[NovelRouter] 步骤: ${config.description}`);
  console.log(`[NovelRouter] 模型: ${config.modelId}`);

  let content = '';

  try {
    if (options.onUpdate) {
      // 流式生成
      await generateAIContentStream(
        apiKey,
        options.systemPrompt,
        options.userPrompt,
        config.baseUrl,
        config.modelId,
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
        config.baseUrl,
        config.modelId,
        config.maxTokens
      ) || '';
    }

    const latency = Date.now() - startTime;

    console.log(`[NovelRouter] 完成，耗时: ${latency}ms`);

    return {
      content,
      step: options.step,
      modelUsed: config.modelId,
      latency,
    };

  } catch (error) {
    console.error(`[NovelRouter] 步骤 ${options.step} 失败:`, error);
    throw error;
  }
}

/**
 * 获取指定步骤的模型配置
 */
export function getStepModelConfig(step: NovelWritingStep): StepModelConfig {
  return STEP_MODELS[step];
}

/**
 * 获取所有步骤配置
 */
export function getAllStepConfigs(): StepModelConfig[] {
  return Object.values(STEP_MODELS);
}

/**
 * 修改步骤模型（高级用户）
 */
export function updateStepModel(
  step: NovelWritingStep,
  modelId: string,
  maxTokens?: number,
  temperature?: number
): void {
  if (STEP_MODELS[step]) {
    STEP_MODELS[step].modelId = modelId;
    if (maxTokens !== undefined) STEP_MODELS[step].maxTokens = maxTokens;
    if (temperature !== undefined) STEP_MODELS[step].temperature = temperature;
  }
}

/**
 * 获取 SiliconFlow API Key
 */
function getSiliconFlowApiKey(): string | null {
  return StorageManager.get('SILICONFLOW_API_KEY') ||
         StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) ||
         StorageManager.get('novel_writer_api_key') ||
         StorageManager.get('writing_api_key') ||
         null;
}

// 兼容旧版导入
export { StorageManager };
