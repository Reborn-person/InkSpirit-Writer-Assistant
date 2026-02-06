// LLM Routing 核心引擎

import {
  TaskType,
  ModelConfig,
  RoutingRule,
  RoutingRequest,
  RoutingResult,
  RoutingStrategy,
  ModelUsageRecord,
  ModelPerformance,
} from './types';
import { DEFAULT_MODELS, DEFAULT_ROUTING_RULES, TASK_TYPE_KEYWORDS } from './config';
import { StorageManager } from '@/lib/storage';

const ROUTER_STORAGE_KEY = 'llm_router_config';
const USAGE_HISTORY_KEY = 'llm_router_usage';

export class LLMRouter {
  private models: Map<string, ModelConfig> = new Map();
  private rules: Map<TaskType, RoutingRule> = new Map();
  private usageHistory: ModelUsageRecord[] = [];
  private strategy: RoutingStrategy = 'balanced';

  constructor() {
    this.loadConfig();
    this.loadUsageHistory();
  }

  // ==================== 配置管理 ====================

  private loadConfig(): void {
    const saved = StorageManager.getJSON(ROUTER_STORAGE_KEY);
    if (saved) {
      // 加载保存的配置
      if (saved.models) {
        saved.models.forEach((m: ModelConfig) => this.models.set(m.id, m));
      }
      if (saved.rules) {
        saved.rules.forEach((r: RoutingRule) => this.rules.set(r.taskType, r));
      }
      if (saved.strategy) {
        this.strategy = saved.strategy;
      }
    } else {
      // 使用默认配置
      this.resetToDefault();
    }
  }

  private saveConfig(): void {
    StorageManager.setJSON(ROUTER_STORAGE_KEY, {
      models: Array.from(this.models.values()),
      rules: Array.from(this.rules.values()),
      strategy: this.strategy,
    });
  }

  private loadUsageHistory(): void {
    const saved = StorageManager.getJSON(USAGE_HISTORY_KEY);
    if (Array.isArray(saved)) {
      this.usageHistory = saved.slice(-1000); // 只保留最近1000条
    }
  }

  private saveUsageHistory(): void {
    StorageManager.setJSON(USAGE_HISTORY_KEY, this.usageHistory);
  }

  resetToDefault(): void {
    this.models.clear();
    DEFAULT_MODELS.forEach(m => this.models.set(m.id, m));
    this.rules.clear();
    DEFAULT_ROUTING_RULES.forEach(r => this.rules.set(r.taskType, r));
    this.strategy = 'balanced';
    this.saveConfig();
  }

  // ==================== 任务类型检测 ====================

  detectTaskType(content: string): TaskType {
    const text = content.toLowerCase();
    
    // 计算每种任务类型的匹配分数
    const scores: Record<TaskType, number> = {} as Record<TaskType, number>;
    
    for (const [taskType, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      scores[taskType as TaskType] = score;
    }

    // 找出分数最高的任务类型
    let bestTask: TaskType = 'creative_writing';
    let bestScore = 0;
    
    for (const [task, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestTask = task as TaskType;
      }
    }

    // 如果没有匹配到关键词，根据内容长度和复杂度判断
    if (bestScore === 0) {
      if (text.length < 50) return 'simple_qa';
      if (/[？?]/.test(content)) return 'complex_reasoning';
      return 'creative_writing';
    }

    return bestTask;
  }

  // ==================== 路由决策 ====================

  async route(request: RoutingRequest): Promise<RoutingResult> {
    const taskType = request.taskType;
    const rule = this.rules.get(taskType);
    
    if (!rule) {
      throw new Error(`No routing rule found for task type: ${taskType}`);
    }

    // 获取所有候选模型
    const candidateIds = [...rule.preferredModels, ...rule.fallbackModels];
    const candidates = candidateIds
      .map(id => this.models.get(id))
      .filter((m): m is ModelConfig => m !== undefined && m.enabled);

    if (candidates.length === 0) {
      throw new Error('No available models for this task');
    }

    // 根据策略选择模型
    let selectedModel: ModelConfig;
    
    switch (request.priority || this.strategy) {
      case 'quality_first':
        selectedModel = this.selectByQuality(candidates, rule);
        break;
      case 'cost_first':
        selectedModel = this.selectByCost(candidates, rule, request.maxCost);
        break;
      case 'speed_first':
        selectedModel = this.selectBySpeed(candidates);
        break;
      case 'balanced':
      case 'auto':
      default:
        selectedModel = this.selectBalanced(candidates, rule, request);
        break;
    }

    // 获取备用模型
    const fallbackModels = candidates
      .filter(m => m.id !== selectedModel.id)
      .slice(0, 2);

    // 计算预估成本
    const estimatedTokens = request.contextLength || 2000;
    const estimatedCost = this.estimateCost(selectedModel, estimatedTokens);

    // 生成选择理由
    const reasoning = this.generateReasoning(selectedModel, taskType, rule);

    return {
      selectedModel,
      fallbackModels,
      reasoning,
      estimatedCost,
      estimatedTokens,
      confidence: this.calculateConfidence(selectedModel, rule),
    };
  }

  // ==================== 模型选择策略 ====================

  private selectByQuality(candidates: ModelConfig[], rule: RoutingRule): ModelConfig {
    // 按综合能力排序
    return candidates.sort((a, b) => {
      const scoreA = this.calculateQualityScore(a, rule);
      const scoreB = this.calculateQualityScore(b, rule);
      return scoreB - scoreA;
    })[0];
  }

  private selectByCost(
    candidates: ModelConfig[],
    rule: RoutingRule,
    maxCost?: number
  ): ModelConfig {
    let filtered = candidates;
    
    if (maxCost !== undefined) {
      filtered = candidates.filter(m => {
        const avgCost = (m.costPer1KTokens.input + m.costPer1KTokens.output) / 2;
        return avgCost <= maxCost;
      });
    }

    if (filtered.length === 0) {
      filtered = candidates; // 如果没有满足条件的，使用全部
    }

    // 选择最便宜的
    return filtered.sort((a, b) => {
      const costA = a.costPer1KTokens.input + a.costPer1KTokens.output;
      const costB = b.costPer1KTokens.input + b.costPer1KTokens.output;
      return costA - costB;
    })[0];
  }

  private selectBySpeed(candidates: ModelConfig[]): ModelConfig {
    // 按速度排序
    return candidates.sort((a, b) => b.capabilities.speed - a.capabilities.speed)[0];
  }

  private selectBalanced(
    candidates: ModelConfig[],
    rule: RoutingRule,
    request: RoutingRequest
  ): ModelConfig {
    // 综合评分
    return candidates.sort((a, b) => {
      const scoreA = this.calculateBalancedScore(a, rule, request);
      const scoreB = this.calculateBalancedScore(b, rule, request);
      return scoreB - scoreA;
    })[0];
  }

  // ==================== 评分计算 ====================

  private calculateQualityScore(model: ModelConfig, rule: RoutingRule): number {
    let score = 0;
    const caps = model.capabilities;
    const reqs = rule.requirements;

    // 基础能力
    score += caps.creativity * 0.2;
    score += caps.reasoning * 0.2;
    score += caps.chineseQuality * 0.15;
    score += caps.instructionFollowing * 0.15;

    // 满足需求加分
    if (reqs.minCreativity && caps.creativity >= reqs.minCreativity) {
      score += 1;
    }
    if (reqs.minReasoning && caps.reasoning >= reqs.minReasoning) {
      score += 1;
    }
    if (reqs.minContextLength && caps.contextLength >= reqs.minContextLength) {
      score += 1;
    }
    if (reqs.requireChinese && caps.chineseQuality >= 7) {
      score += 1;
    }

    // 历史表现
    const performance = this.getModelPerformance(model.id);
    score += performance.avgQuality * 0.1;
    score += performance.successRate * 0.1;

    return score;
  }

  private calculateBalancedScore(
    model: ModelConfig,
    rule: RoutingRule,
    request: RoutingRequest
  ): number {
    const caps = model.capabilities;
    
    // 质量分 (40%)
    let qualityScore = 0;
    qualityScore += caps.creativity * 0.1;
    qualityScore += caps.reasoning * 0.1;
    qualityScore += caps.chineseQuality * 0.1;
    qualityScore += caps.instructionFollowing * 0.1;

    // 成本分 (30%) - 越便宜分越高
    const avgCost = (model.costPer1KTokens.input + model.costPer1KTokens.output) / 2;
    const costScore = Math.max(0, 1 - avgCost / 0.01) * 3; // 假设0.01为最高成本

    // 速度分 (20%)
    const speedScore = caps.speed * 0.2;

    // 可靠性分 (10%)
    const performance = this.getModelPerformance(model.id);
    const reliabilityScore = performance.successRate * 0.1;

    return qualityScore + costScore + speedScore + reliabilityScore;
  }

  private calculateConfidence(model: ModelConfig, rule: RoutingRule): number {
    let confidence = 0.7; // 基础置信度

    const caps = model.capabilities;
    const reqs = rule.requirements;

    // 如果完全满足所有要求，提高置信度
    if (reqs.minCreativity && caps.creativity >= reqs.minCreativity) {
      confidence += 0.05;
    }
    if (reqs.minReasoning && caps.reasoning >= reqs.minReasoning) {
      confidence += 0.05;
    }
    if (reqs.minContextLength && caps.contextLength >= reqs.minContextLength) {
      confidence += 0.05;
    }

    // 历史成功率影响
    const performance = this.getModelPerformance(model.id);
    confidence += performance.successRate * 0.1;

    return Math.min(confidence, 1.0);
  }

  // ==================== 成本估算 ====================

  private estimateCost(model: ModelConfig, estimatedTokens: number): number {
    const avgCost = (model.costPer1KTokens.input + model.costPer1KTokens.output) / 2;
    return (estimatedTokens / 1000) * avgCost;
  }

  // ==================== 理由生成 ====================

  private generateReasoning(model: ModelConfig, taskType: TaskType, rule: RoutingRule): string {
    const reasons: string[] = [];
    const caps = model.capabilities;

    reasons.push(`选择 ${model.name} 处理 ${taskType}`);

    if (caps.creativity >= 8) {
      reasons.push('创意能力强');
    }
    if (caps.reasoning >= 8) {
      reasons.push('推理能力优秀');
    }
    if (caps.chineseQuality >= 8) {
      reasons.push('中文质量高');
    }
    if (caps.costEfficiency >= 8) {
      reasons.push('成本效益好');
    }
    if (caps.speed >= 8) {
      reasons.push('响应速度快');
    }

    return reasons.join('，');
  }

  // ==================== 性能追踪 ====================

  recordUsage(record: ModelUsageRecord): void {
    this.usageHistory.push(record);
    this.saveUsageHistory();
  }

  getModelPerformance(modelId: string): ModelPerformance {
    const records = this.usageHistory.filter(r => r.modelId === modelId);
    
    if (records.length === 0) {
      return {
        modelId,
        totalRequests: 0,
        successRate: 1,
        avgLatency: 0,
        avgCost: 0,
        avgQuality: 5,
        lastUsed: 0,
      };
    }

    const successful = records.filter(r => r.success);
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalQuality = records.reduce((sum, r) => sum + r.quality, 0);
    const totalLatency = records.reduce((sum, r) => sum + r.latency, 0);

    return {
      modelId,
      totalRequests: records.length,
      successRate: successful.length / records.length,
      avgLatency: totalLatency / records.length,
      avgCost: totalCost / records.length,
      avgQuality: totalQuality / records.length,
      lastUsed: Math.max(...records.map(r => r.timestamp)),
    };
  }

  // ==================== 配置接口 ====================

  getModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  updateModel(model: ModelConfig): void {
    this.models.set(model.id, model);
    this.saveConfig();
  }

  enableModel(id: string, enabled: boolean): void {
    const model = this.models.get(id);
    if (model) {
      model.enabled = enabled;
      this.saveConfig();
    }
  }

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
    this.saveConfig();
  }

  getStrategy(): RoutingStrategy {
    return this.strategy;
  }

  getUsageStats(): {
    totalRequests: number;
    totalCost: number;
    avgLatency: number;
    modelBreakdown: Record<string, { requests: number; cost: number }>;
  } {
    const totalCost = this.usageHistory.reduce((sum, r) => sum + r.cost, 0);
    const totalLatency = this.usageHistory.reduce((sum, r) => sum + r.latency, 0);
    
    const modelBreakdown: Record<string, { requests: number; cost: number }> = {};
    for (const record of this.usageHistory) {
      if (!modelBreakdown[record.modelId]) {
        modelBreakdown[record.modelId] = { requests: 0, cost: 0 };
      }
      modelBreakdown[record.modelId].requests++;
      modelBreakdown[record.modelId].cost += record.cost;
    }

    return {
      totalRequests: this.usageHistory.length,
      totalCost,
      avgLatency: this.usageHistory.length > 0 ? totalLatency / this.usageHistory.length : 0,
      modelBreakdown,
    };
  }
}

// 单例实例
let routerInstance: LLMRouter | null = null;

export function getLLMRouter(): LLMRouter {
  if (!routerInstance) {
    routerInstance = new LLMRouter();
  }
  return routerInstance;
}
