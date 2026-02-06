/**
 * Humanizer 模块 - 全面升级版本
 * AI 文本检测和人性化改写系统
 * 
 * 参考 stop-slop 设计，实现5维评分系统：
 * - Directness: 直接性
 * - Rhythm: 节奏多样性
 * - Trust: 读者信任度
 * - Authenticity: 真实感
 * - Density: 信息密度
 */

// ============ 核心类 ============
export { AIDetector, aiDetector, analyzeText, analyzeBatch } from './detector';
export { AIRewriter, aiRewriter, humanizeText, generateRewriteSuggestions } from './rewriter';
export { SlopScorer, slopScorer, calculateSlopScore, generateScoreReport } from './scorer';

// ============ 规则库 ============
export * from './rules';

// ============ 类型定义 ============
export * from './types';

// ============ 便捷使用示例 ============

/**
 * 快速检测文本AI率
 * @example
 * ```typescript
 * import { quickCheck } from '@/lib/humanizer';
 * 
 * const result = quickCheck('在当今社会，科技的发展日新月异...');
 * console.log(result.needsRevision); // true
 * console.log(result.score); // 45
 * ```
 */
export { quickCheck } from './detector';

/**
 * 完整分析文本
 * @example
 * ```typescript
 * import { analyzeText } from '@/lib/humanizer';
 * 
 * const score = analyzeText(text, 'strict');
 * console.log(score.slopScore.total); // 5维总分
 * console.log(score.overall); // 总体评分
 * console.log(score.issues); // 问题列表
 * ```
 */

/**
 * 人性化改写
 * @example
 * ```typescript
 * import { humanizeText } from '@/lib/humanizer';
 * 
 * const result = await humanizeText(text, 'creative', {
 *   apiKey: 'your-api-key',
 *   model: 'deepseek-ai/DeepSeek-V3'
 * });
 * 
 * console.log(result.rewritten); // 改写后的文本
 * console.log(result.improvement); // 改进幅度
 * ```
 */

/**
 * 生成评分报告
 * @example
 * ```typescript
 * import { generateScoreReport, analyzeText } from '@/lib/humanizer';
 * 
 * const score = analyzeText(text);
 * const report = generateScoreReport(score);
 * console.log(report);
 * // ========== AI 检测报告 ==========
 * // 【总体评分】65/100
 * // 【5维评分】32/50 ⚠️ 需要重写
 * // ...
 * ```
 */
