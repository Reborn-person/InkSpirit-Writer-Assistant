/**
 * 全局内存监控和管理器
 * 用于监控应用内存使用情况并提供清理接口
 */

import { vectorMemoryManager } from './vector-memory-manager';
import { nodeVirtualizationManager } from './node-virtualization';

interface MemoryStats {
  timestamp: number;
  jsHeapSize: number;
  jsHeapSizeLimit: number;
  usedJSHeapSize: number;
  vectorMemoryMB: number;
  nodeCacheCount: number;
}

interface CleanupOptions {
  clearVectorCache?: boolean;
  clearNodeCache?: boolean;
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
  aggressive?: boolean;
}

class MemoryMonitor {
  private stats: MemoryStats[] = [];
  private maxStatsHistory: number = 100;
  private warningThreshold: number = 0.8; // 80% 内存使用率警告
  private criticalThreshold: number = 0.9; // 90% 内存使用率紧急清理

  /**
   * 获取当前内存使用情况
   */
  getMemoryStats(): MemoryStats {
    const memory = (performance as any).memory;
    const vectorStats = vectorMemoryManager.getMemoryStats();
    const nodeStats = nodeVirtualizationManager.getMemoryStats();

    const stats: MemoryStats = {
      timestamp: Date.now(),
      jsHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      vectorMemoryMB: vectorStats.memoryMB,
      nodeCacheCount: nodeStats.total
    };

    // 保存历史记录
    this.stats.push(stats);
    if (this.stats.length > this.maxStatsHistory) {
      this.stats.shift();
    }

    return stats;
  }

  /**
   * 检查内存是否超过阈值
   */
  checkMemoryThreshold(): { warning: boolean; critical: boolean; usage: number } {
    const stats = this.getMemoryStats();
    if (!stats.jsHeapSizeLimit) return { warning: false, critical: false, usage: 0 };

    const usage = stats.usedJSHeapSize / stats.jsHeapSizeLimit;
    return {
      warning: usage > this.warningThreshold,
      critical: usage > this.criticalThreshold,
      usage
    };
  }

  /**
   * 执行内存清理
   */
  cleanup(options: CleanupOptions = {}): { freed: number; details: Record<string, number> } {
    const before = this.getMemoryStats();
    const details: Record<string, number> = {};

    // 清理向量缓存
    if (options.clearVectorCache || options.aggressive) {
      const vectorBefore = vectorMemoryManager.getMemoryStats().memoryBytes;
      vectorMemoryManager.cleanupExpired(0); // 清理所有
      if (options.aggressive) {
        vectorMemoryManager.clear();
      }
      const vectorAfter = vectorMemoryManager.getMemoryStats().memoryBytes;
      details.vectorCache = Math.round((vectorBefore - vectorAfter) / 1024 / 1024 * 100) / 100;
    }

    // 清理节点缓存
    if (options.clearNodeCache || options.aggressive) {
      const nodeBefore = nodeVirtualizationManager.getMemoryStats().total;
      nodeVirtualizationManager.clear();
      const nodeAfter = nodeVirtualizationManager.getMemoryStats().total;
      details.nodeCache = nodeBefore - nodeAfter;
    }

    // 清理 LocalStorage
    if (options.clearLocalStorage || options.aggressive) {
      const lsBefore = this.getStorageSize(localStorage);
      this.cleanupStorage(localStorage, options.aggressive);
      const lsAfter = this.getStorageSize(localStorage);
      details.localStorage = Math.round((lsBefore - lsAfter) / 1024 * 100) / 100;
    }

    // 清理 SessionStorage
    if (options.clearSessionStorage || options.aggressive) {
      const ssBefore = this.getStorageSize(sessionStorage);
      this.cleanupStorage(sessionStorage, options.aggressive);
      const ssAfter = this.getStorageSize(sessionStorage);
      details.sessionStorage = Math.round((ssBefore - ssAfter) / 1024 * 100) / 100;
    }

    // 触发垃圾回收提示（仅Chrome）
    if ((window as any).gc) {
      (window as any).gc();
    }

    const after = this.getMemoryStats();
    const freed = Math.max(0, before.usedJSHeapSize - after.usedJSHeapSize);

    return {
      freed: Math.round(freed / 1024 / 1024 * 100) / 100,
      details
    };
  }

  /**
   * 自动清理策略
   */
  autoCleanup(): { action: string; freed: number } | null {
    const check = this.checkMemoryThreshold();

    if (check.critical) {
      // 紧急清理 - 清理所有缓存
      const result = this.cleanup({
        clearVectorCache: true,
        clearNodeCache: true,
        clearLocalStorage: false,
        aggressive: true
      });
      return { action: 'critical', freed: result.freed };
    }

    if (check.warning) {
      // 警告级别 - 清理过期数据
      const result = this.cleanup({
        clearVectorCache: true,
        clearNodeCache: false,
        aggressive: false
      });
      return { action: 'warning', freed: result.freed };
    }

    return null;
  }

  /**
   * 获取存储大小
   */
  private getStorageSize(storage: Storage): number {
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        size += storage.getItem(key)?.length || 0;
      }
    }
    return size * 2; // UTF-16 编码，每个字符2字节
  }

  /**
   * 清理存储
   */
  private cleanupStorage(storage: Storage, aggressive: boolean): void {
    const keysToRemove: string[] = [];
    const now = Date.now();

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;

      // 保留用户设置和重要数据
      if (key.includes('settings') || key.includes('config') || key.includes('user')) {
        continue;
      }

      // 清理临时数据
      if (key.includes('temp') || key.includes('cache') || key.includes('draft')) {
        keysToRemove.push(key);
        continue;
      }

      // 激进模式：清理历史记录和消息
      if (aggressive) {
        if (key.includes('history') || key.includes('messages') || key.includes('chat')) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => storage.removeItem(key));
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(): { increasing: boolean; averageUsage: number } {
    if (this.stats.length < 10) {
      return { increasing: false, averageUsage: 0 };
    }

    const recent = this.stats.slice(-10);
    const first = recent[0].usedJSHeapSize;
    const last = recent[recent.length - 1].usedJSHeapSize;
    const average = recent.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / recent.length;

    return {
      increasing: last > first * 1.1, // 增长超过10%
      averageUsage: Math.round(average / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * 导出内存报告
   */
  exportReport(): string {
    const stats = this.getMemoryStats();
    const trend = this.getMemoryTrend();
    const threshold = this.checkMemoryThreshold();

    return `
内存使用报告
============
时间: ${new Date().toLocaleString()}

当前内存使用:
- JS Heap: ${(stats.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB / ${(stats.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB (${(threshold.usage * 100).toFixed(1)}%)
- 向量缓存: ${stats.vectorMemoryMB} MB
- 节点缓存: ${stats.nodeCacheCount} 个

趋势分析:
- 内存趋势: ${trend.increasing ? '↗ 增长' : '→ 稳定'}
- 平均使用: ${trend.averageUsage} MB

建议:
${threshold.critical ? '⚠️ 内存使用过高，建议立即清理' : ''}
${threshold.warning ? '⚡ 内存使用接近上限，建议优化' : ''}
${!threshold.warning ? '✅ 内存使用正常' : ''}
    `.trim();
  }
}

// 全局单例
export const memoryMonitor = new MemoryMonitor();

/**
 * 启动内存监控
 */
export function startMemoryMonitoring(intervalMinutes: number = 5): () => void {
  // 立即执行一次检查
  const initialCheck = memoryMonitor.autoCleanup();
  if (initialCheck) {
    console.log(`[MemoryMonitor] Auto cleanup: ${initialCheck.action}, freed ${initialCheck.freed}MB`);
  }

  // 定期检查
  const intervalId = setInterval(() => {
    const check = memoryMonitor.autoCleanup();
    if (check) {
      console.log(`[MemoryMonitor] Auto cleanup: ${check.action}, freed ${check.freed}MB`);
    }

    // 每30分钟输出一次报告
    if (Date.now() % (30 * 60 * 1000) < intervalMinutes * 60 * 1000) {
      console.log(memoryMonitor.exportReport());
    }
  }, intervalMinutes * 60 * 1000);

  return () => clearInterval(intervalId);
}

/**
 * 手动触发内存清理
 */
export function triggerMemoryCleanup(level: 'light' | 'normal' | 'aggressive' = 'normal'): void {
  const options: CleanupOptions = {
    clearVectorCache: level !== 'light',
    clearNodeCache: level === 'aggressive',
    clearLocalStorage: level === 'aggressive',
    aggressive: level === 'aggressive'
  };

  const result = memoryMonitor.cleanup(options);
  console.log(`[MemoryMonitor] Manual cleanup (${level}): freed ${result.freed}MB`, result.details);
}

// 暴露到全局以便调试
if (typeof window !== 'undefined') {
  (window as any).memoryMonitor = memoryMonitor;
  (window as any).triggerMemoryCleanup = triggerMemoryCleanup;
}
