// 储存优化工具
// 使用 IndexedDB 存储大文本数据，LocalStorage 仅存储小数据和元数据
export class StorageOptimizer {
  private static readonly DB_NAME = 'ai-novel-writer-db';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'large-data';

  // 打开 IndexedDB 数据库
  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  // 存储数据到 IndexedDB
  static async set(key: string, value: any): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB set error:', e);
    }
  }

  // 从 IndexedDB 获取数据
  static async get(key: string): Promise<any | null> {
    if (typeof window === 'undefined') return null;
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      return await new Promise<any>((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB get error:', e);
      return null;
    }
  }

  // 从 IndexedDB 删除数据
  static async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await this.openDB();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB remove error:', e);
    }
  }

  static cleanupExpiredData(): void {
    // Placeholder for cleanup logic
    console.log('Cleanup expired data called');
  }

  static compressLargeData(): { compressed: number; savedSpace: number } {
    // Placeholder for compression logic
    console.log('Compress large data called');
    return { compressed: 0, savedSpace: 0 };
  }
}

export class EnhancedStorageManager {
  // 智能保存：大文件走 IndexedDB，小文件走 LocalStorage (兼容旧接口)
  // 注意：此方法现在是异步的，但为了兼容旧代码，可能需要调整调用方
  static async smartSave(key: string, data: any): Promise<void> {
    // 假设大于 100KB 的数据为“大文本”，或者特定的 Key (如 module7 内容, 书架)
    const isLarge = (typeof data === 'string' && data.length > 50000) || 
                    (Array.isArray(data) && JSON.stringify(data).length > 50000) ||
                    key.includes('module7') || 
                    key.includes('novel_projects');

    if (isLarge) {
      await StorageOptimizer.set(key, data);
      // 标记该 Key 存储在 IndexedDB 中，以便读取时识别
      localStorage.setItem(`${key}_is_indexeddb`, 'true');
    } else {
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      localStorage.setItem(key, str);
      localStorage.removeItem(`${key}_is_indexeddb`); // 确保清理标记
    }
  }

  // 智能加载
  static async smartLoad(key: string): Promise<any | null> {
    if (typeof window === 'undefined') return null;

    const isIndexedDB = localStorage.getItem(`${key}_is_indexeddb`) === 'true';
    if (isIndexedDB) {
      return await StorageOptimizer.get(key);
    } else {
      const val = localStorage.getItem(key);
      try {
        return val ? JSON.parse(val) : val; // 尝试解析 JSON，如果失败返回原字符串? 
        // 实际上旧的 StorageManager.get 返回 string, getJSON 返回 any. 
        // 这里为了统一，我们尽量返回原始值或对象。
        // 调用方需自行处理类型。
      } catch {
        return val;
      }
    }
  }

  static getOptimizedStorageStats() {
    if (typeof window === 'undefined') {
        return {
            used: 0,
            total: 0,
            percentage: 0,
            analysis: {
                totalKeys: 0,
                compressedKeys: 0,
                largeKeys: 0,
                expiredKeys: 0,
                totalSize: 0,
                compressedSize: 0,
                largeSize: 0,
                potentialSavings: 0,
                expiredSize: 0,
                compressionOpportunities: 0
            }
        };
    }

    let totalSize = 0;
    let largeKeys = 0;
    let largeSize = 0;
    let compressedKeys = 0; // Items in IndexedDB (marked)
    
    // Scan LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const value = localStorage.getItem(key) || '';
        const size = value.length * 2; // Approx bytes
        totalSize += size;
        
        if (key.endsWith('_is_indexeddb')) {
            compressedKeys++;
            continue;
        }
        
        // Check if item is large (> 50KB) and not yet in IndexedDB
        if (size > 50 * 1024 && !localStorage.getItem(`${key}_is_indexeddb`)) {
            largeKeys++;
            largeSize += size;
        }
    }
    
    const totalLimit = 5 * 1024 * 1024; // 5MB typical limit
    
    return {
        used: totalSize,
        total: totalLimit,
        percentage: Math.min((totalSize / totalLimit) * 100, 100),
        analysis: {
            totalKeys: localStorage.length,
            compressedKeys,
            largeKeys,
            expiredKeys: 0, // Not implemented
            totalSize,
            compressedSize: 0, // Unknown without async
            largeSize,
            potentialSavings: largeSize, // Assuming all large keys can be moved
            expiredSize: 0,
            compressionOpportunities: largeKeys
        }
    };
  }
}
