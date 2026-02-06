/**
 * 内存管理模块统一入口
 * 提供项目级别的内存优化和管理功能
 */

export { 
  vectorMemoryManager, 
  startVectorCleanupInterval,
  VectorMemoryManager 
} from './vector-memory-manager';

export { 
  nodeVirtualizationManager, 
  NodeVirtualizationManager 
} from './node-virtualization';

export { 
  memoryMonitor, 
  startMemoryMonitoring, 
  triggerMemoryCleanup 
} from './memory-monitor';

export { MemoryAwareAgent } from './agent';

export { ProgressiveContextManager } from './progressive-context';

/**
 * 初始化所有内存管理功能
 * 应在应用启动时调用
 */
export function initializeMemoryManagement(): () => void {
  // 启动向量缓存清理定时器（每小时）
  const stopVectorCleanup = startVectorCleanupInterval(1);
  
  // 启动内存监控（每5分钟检查一次）
  const stopMemoryMonitoring = startMemoryMonitoring(5);
  
  console.log('[MemoryManagement] Memory management initialized');
  
  // 返回清理函数
  return () => {
    stopVectorCleanup();
    stopMemoryMonitoring();
    console.log('[MemoryManagement] Memory management stopped');
  };
}

/**
 * 紧急内存清理
 * 当内存使用过高时调用
 */
export function emergencyCleanup(): { success: boolean; freedMB: number } {
  console.warn('[MemoryManagement] Emergency cleanup triggered');
  
  const result = memoryMonitor.cleanup({
    clearVectorCache: true,
    clearNodeCache: true,
    clearLocalStorage: true,
    clearSessionStorage: true,
    aggressive: true
  });
  
  return {
    success: true,
    freedMB: result.freed
  };
}

/**
 * 获取内存状态概览
 */
export function getMemoryOverview(): {
  jsHeapMB: number;
  jsHeapLimitMB: number;
  usage: number;
  vectorCacheMB: number;
  nodeCacheCount: number;
  status: 'normal' | 'warning' | 'critical';
} {
  const stats = memoryMonitor.getMemoryStats();
  const threshold = memoryMonitor.checkMemoryThreshold();
  
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  if (threshold.critical) status = 'critical';
  else if (threshold.warning) status = 'warning';
  
  return {
    jsHeapMB: Math.round(stats.usedJSHeapSize / 1024 / 1024 * 100) / 100,
    jsHeapLimitMB: Math.round(stats.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
    usage: Math.round(threshold.usage * 100),
    vectorCacheMB: stats.vectorMemoryMB,
    nodeCacheCount: stats.nodeCacheCount,
    status
  };
}
