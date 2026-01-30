import { consistencyExtractor } from './extractor';
import { consistencyChecker } from './checker';
import { ConsistencyReport, CheckOptions } from './types';

/**
 * 一致性检查服务 - 统一入口
 */
export class ConsistencyService {

    /**
     * 执行完整的一致性检查流程
     * 1. 提取数据
     * 2. 执行检查
     * 3. 返回报告
     */
    async runCheck(options: CheckOptions = {}): Promise<ConsistencyReport> {
        // Step 1: 提取数据
        const database = await consistencyExtractor.extractDatabase();

        // Step 2: 执行检查
        const report = await consistencyChecker.performCheck(database, options);

        // Step 3: 缓存结果（可选）
        // await this.cacheReport(report);

        return report;
    }

    /**
     * 获取缓存的检查报告
     */
    async getCachedReport(): Promise<ConsistencyReport | null> {
        // TODO: 从 IndexedDB 获取缓存
        return null;
    }

    /**
     * 清除检查缓存
     */
    async clearCache(): Promise<void> {
        // TODO: 清除 IndexedDB 缓存
    }
}

// 导出单例
export const consistencyService = new ConsistencyService();

// 导出类型
export * from './types';
