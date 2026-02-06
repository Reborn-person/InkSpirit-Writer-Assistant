/**
 * 向量存储内存管理器
 * 实现 LRU 淘汰策略和内存限制
 */

interface VectorEntry {
  id: string;
  text: string;
  embedding: Float32Array;  // 使用 Float32Array 替代 number[] 节省内存
  metadata?: Record<string, any>;
  lastAccessed: number;
}

interface VectorMemoryConfig {
  maxEntries: number;
  maxMemoryMB: number;
  embeddingDimension: number;
}

const DEFAULT_CONFIG: VectorMemoryConfig = {
  maxEntries: 1000,        // 最多保留1000条向量
  maxMemoryMB: 100,        // 最大内存占用100MB
  embeddingDimension: 1536 // 默认嵌入维度
};

export class VectorMemoryManager {
  private config: VectorMemoryConfig;
  private cache: Map<string, VectorEntry> = new Map();
  private currentMemoryBytes: number = 0;

  constructor(config: Partial<VectorMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加向量到缓存
   */
  addVector(id: string, text: string, embedding: number[], metadata?: Record<string, any>): void {
    // 如果已存在，先删除旧数据
    if (this.cache.has(id)) {
      this.deleteVector(id);
    }

    // 检查是否需要清理
    while (this.shouldEvict()) {
      this.evictLRU();
    }

    // 转换为 Float32Array 节省内存
    const floatArray = new Float32Array(embedding);
    
    const entry: VectorEntry = {
      id,
      text: this.truncateText(text),
      embedding: floatArray,
      metadata,
      lastAccessed: Date.now()
    };

    this.cache.set(id, entry);
    this.currentMemoryBytes += this.calculateEntrySize(entry);
  }

  /**
   * 获取向量
   */
  getVector(id: string): VectorEntry | undefined {
    const entry = this.cache.get(id);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
    return entry;
  }

  /**
   * 搜索相似向量（简化版，实际应使用向量数据库）
   */
  searchSimilar(queryEmbedding: number[], topK: number = 5): VectorEntry[] {
    const query = new Float32Array(queryEmbedding);
    const scores: { entry: VectorEntry; score: number }[] = [];

    for (const entry of this.cache.values()) {
      const score = this.cosineSimilarity(query, entry.embedding);
      scores.push({ entry, score });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.entry);
  }

  /**
   * 删除向量
   */
  deleteVector(id: string): void {
    const entry = this.cache.get(id);
    if (entry) {
      this.currentMemoryBytes -= this.calculateEntrySize(entry);
      this.cache.delete(id);
    }
  }

  /**
   * 批量添加向量
   */
  addVectorsBatch(entries: { id: string; text: string; embedding: number[]; metadata?: Record<string, any> }[]): void {
    // 分批处理，避免内存峰值
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      batch.forEach(entry => {
        this.addVector(entry.id, entry.text, entry.embedding, entry.metadata);
      });
      
      // 每批处理后让出事件循环
      if (i + batchSize < entries.length) {
        this.yieldToEventLoop();
      }
    }
  }

  /**
   * 清理过期数据（超过24小时未访问）
   */
  cleanupExpired(maxAgeHours: number = 24): number {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, entry] of this.cache) {
      if (now - entry.lastAccessed > maxAge) {
        this.deleteVector(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取内存统计
   */
  getMemoryStats(): {
    entries: number;
    memoryBytes: number;
    memoryMB: number;
    maxMemoryMB: number;
  } {
    return {
      entries: this.cache.size,
      memoryBytes: this.currentMemoryBytes,
      memoryMB: Math.round(this.currentMemoryBytes / 1024 / 1024 * 100) / 100,
      maxMemoryMB: this.config.maxMemoryMB
    };
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
  }

  /**
   * 是否需要淘汰
   */
  private shouldEvict(): boolean {
    return this.cache.size >= this.config.maxEntries ||
           this.currentMemoryBytes >= this.config.maxMemoryMB * 1024 * 1024;
  }

  /**
   * 淘汰最久未访问的条目
   */
  private evictLRU(): void {
    let lruId: string | null = null;
    let lruTime = Infinity;

    for (const [id, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruId = id;
      }
    }

    if (lruId) {
      this.deleteVector(lruId);
    }
  }

  /**
   * 计算条目大小
   */
  private calculateEntrySize(entry: VectorEntry): number {
    const textBytes = new Blob([entry.text]).size;
    const embeddingBytes = entry.embedding.byteLength;
    const metadataBytes = entry.metadata ? new Blob([JSON.stringify(entry.metadata)]).size : 0;
    return textBytes + embeddingBytes + metadataBytes + 100; // 100 bytes overhead
  }

  /**
   * 截断长文本
   */
  private truncateText(text: string, maxLength: number = 5000): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 余弦相似度计算
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 让出事件循环
   */
  private yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

// 全局单例
export const vectorMemoryManager = new VectorMemoryManager();

/**
 * 定期清理过期向量数据
 */
export function startVectorCleanupInterval(intervalHours: number = 1): () => void {
  const intervalId = setInterval(() => {
    const cleaned = vectorMemoryManager.cleanupExpired(24);
    if (cleaned > 0) {
      console.log(`[VectorMemory] Cleaned up ${cleaned} expired vectors`);
    }
    
    const stats = vectorMemoryManager.getMemoryStats();
    console.log(`[VectorMemory] Current usage: ${stats.memoryMB}MB / ${stats.maxMemoryMB}MB`);
  }, intervalHours * 60 * 60 * 1000);

  return () => clearInterval(intervalId);
}
