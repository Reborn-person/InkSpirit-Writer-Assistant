import JSZip from 'jszip';

// 储存管理工具
export const STORAGE_KEYS = {
  // 设置相关
  RAG_PROVIDER: 'novel_writer_rag_provider',
  RAG_API_KEY: 'novel_writer_rag_api_key',
  RAG_BASE_URL: 'novel_writer_rag_base_url',
  RAG_MODEL: 'novel_writer_rag_model',

  VECTOR_PROVIDER: 'novel_writer_vector_provider',
  VECTOR_API_KEY: 'novel_writer_vector_api_key',
  VECTOR_BASE_URL: 'novel_writer_vector_base_url',
  VECTOR_MODEL: 'novel_writer_vector_model',

  BIG_MODEL_PROVIDER: 'novel_writer_big_model_provider',
  BIG_MODEL_API_KEY: 'novel_writer_big_model_api_key',
  BIG_MODEL_BASE_URL: 'novel_writer_big_model_base_url',
  BIG_MODEL_MODEL: 'novel_writer_big_model_model',

  WRITING_PROVIDER: 'novel_writer_writing_provider',
  WRITING_API_KEY: 'novel_writer_writing_api_key',
  WRITING_BASE_URL: 'novel_writer_writing_base_url',
  WRITING_MODEL: 'novel_writer_writing_model',

  // 墨灵助手设置
  CHAT_PROVIDER: 'novel_writer_chat_provider',
  CHAT_API_KEY: 'novel_writer_chat_api_key',
  CHAT_BASE_URL: 'novel_writer_chat_base_url',
  CHAT_MODEL: 'novel_writer_chat_model',

  // 生图设置 (Image Generation)
  IMAGE_PROVIDER: 'novel_writer_image_provider',
  IMAGE_API_KEY: 'novel_writer_image_api_key',
  IMAGE_BASE_URL: 'novel_writer_image_base_url',
  IMAGE_MODEL: 'novel_writer_image_model',

  // Key Management
  SAVED_KEYS: 'novel_writer_saved_keys',
  CUSTOM_MODELS: 'novel_writer_custom_models',

  // MAX Mode Setting
  ENABLE_MAX_MODE: 'novel_writer_enable_max_mode',

  // 模块数据
  MODULE_INPUT: (id: string) => `novel_writer_${id}_input`,
  MODULE_OUTPUT: (id: string) => `novel_writer_${id}_output`,

  // 模块7内容
  MODULE7_CONTENT: 'novel_writer_module7_content',
  MODULE7_SUGGESTION: 'novel_writer_module7_suggestion',
  NOVEL_PROJECTS: 'novel_writer_novel_projects', // New key for book collections
  MAX_POLISH_EVAL_TEMPLATE: 'novel_writer_max_polish_eval_template',
  MAX_POLISH_STATE: 'novel_writer_max_polish_state',
  MAX_POLISH_PROMPT_STATE: 'novel_writer_max_polish_prompt_state',
  FLOATING_AI_MESSAGES: 'novel_writer_floating_ai_messages',

  // 项目备份
  PROJECT_BACKUP: 'novel_writer_project_backup',
  LAST_SAVE_TIME: 'novel_writer_last_save_time',
  USER_AVATAR: 'novel_writer_user_avatar',
  USER_NAME: 'novel_writer_user_name',

  // Token Statistics
  TOKEN_USAGE: 'novel_writer_token_usage',
} as const;

export interface TokenUsageRecord {
  date: string; // ISO String
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

import { EnhancedStorageManager, StorageOptimizer } from './storage-optimizer';

// 储存管理类
export class StorageManager {
  // 获取数据
  static get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    // 优先尝试从 LocalStorage 同步读取（为了兼容旧代码）
    // 但如果数据在 IndexedDB，这里会返回 null 或标记，这可能导致同步代码失效。
    // 这是一个重大变更，我们需要让关键路径支持异步，或者在这里抛出警告。
    // 临时方案：小数据仍然同步读取，大数据（IndexedDB）需要使用 getAsync
    return localStorage.getItem(key);
  }

  // 异步获取数据 (推荐)
  static async getAsync(key: string): Promise<any | null> {
    return await EnhancedStorageManager.smartLoad(key);
  }

  // 设置数据
  static set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    // 异步保存，不阻塞 UI
    EnhancedStorageManager.smartSave(key, value).catch(console.error);

    // 避免循环调用：只在非LAST_SAVE_TIME键时更新保存时间
    if (key !== STORAGE_KEYS.LAST_SAVE_TIME) {
      this.updateLastSaveTime();
    }
  }

  // 获取JSON数据
  static getJSON(key: string): any | null {
    // 尝试同步读取，仅适用于 LocalStorage 数据
    const data = this.get(key);
    if (!data) {
      // 如果同步没读到，可能是因为在 IndexedDB，或者是真的空。
      // 旧代码依赖同步返回，这里无法立即返回 IndexedDB 数据。
      // 我们需要修改调用方为异步，或者接受初次渲染为空。
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // 异步获取 JSON
  static async getJSONAsync(key: string): Promise<any | null> {
    const data = await EnhancedStorageManager.smartLoad(key);
    // smartLoad 已经尝试 parse JSON (如果是 LocalStorage) 或者返回对象 (IndexedDB)
    // 但为了保险，检查类型
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return data; }
    }
    return data;
  }

  // 设置JSON数据
  static setJSON(key: string, value: any): void {
    // 异步保存
    EnhancedStorageManager.smartSave(key, value).catch(console.error);
    if (key !== STORAGE_KEYS.LAST_SAVE_TIME) {
      this.updateLastSaveTime();
    }
  }

  // 删除数据
  static remove(key: string): void {
    if (typeof window === 'undefined') return;
    const isIndexedDb = localStorage.getItem(`${key}_is_indexeddb`) === 'true';
    if (isIndexedDb) {
      StorageOptimizer.remove(key).catch(() => { });
      localStorage.removeItem(`${key}_is_indexeddb`);
    }
    localStorage.removeItem(key);
  }

  static async deleteWorkContext(workId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!workId) return;
    const contextKey = `novel_writer_max_context_${workId}`;
    await StorageOptimizer.remove(contextKey);
    localStorage.removeItem(`${contextKey}_is_indexeddb`);
    localStorage.removeItem(contextKey);
  }

  // 清空所有数据
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
      localStorage.clear();
    }
  }

  // 获取所有模块数据
  static getAllModulesData(): Record<string, any> {
    const modules = ['module1', 'module2', 'module2_5', 'module3', 'module4', 'module5', 'module6', 'module7'];
    const data: Record<string, any> = {};

    modules.forEach(moduleId => {
      const inputData = this.getJSON(STORAGE_KEYS.MODULE_INPUT(moduleId));
      const outputData = this.get(STORAGE_KEYS.MODULE_OUTPUT(moduleId));

      if (inputData || outputData) {
        data[moduleId] = {
          input: inputData,
          output: outputData,
          hasData: true
        };
      }
    });

    return data;
  }

  // 导出完整项目
  static async exportProject(): Promise<string | null> {
    const rawMaxWorks = await this.getJSONAsync('novel_writer_max_works');
    const maxWorks = Array.isArray(rawMaxWorks) ? rawMaxWorks : [];
    const maxActiveWorkId = this.get('novel_writer_max_active_work') || '';
    const maxContexts: Record<string, any> = {};
    for (const work of maxWorks) {
      if (work?.id) {
        maxContexts[work.id] = await this.getJSONAsync(`novel_writer_max_context_${work.id}`);
      }
    }
    const legacyMaxContext = await this.getJSONAsync('novel_writer_max_context');
    const projectData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      settings: this.getSettings(),
      modules: this.getAllModulesData(),
      module7Content: this.get(STORAGE_KEYS.MODULE7_CONTENT),
      module7Suggestion: this.get(STORAGE_KEYS.MODULE7_SUGGESTION),
      maxWorks: {
        works: maxWorks,
        activeWorkId: maxActiveWorkId,
        contexts: maxContexts,
        legacyContext: legacyMaxContext || null
      }
    };

    return JSON.stringify(projectData, null, 2);
  }

  // 导入项目
  static importProject(jsonString: string): boolean {
    try {
      const projectData = JSON.parse(jsonString);

      // 导入设置
      if (projectData.settings) {
        Object.entries(projectData.settings).forEach(([key, value]) => {
          if (value) this.set(key, value as string);
        });
      }

      // 导入模块数据
      if (projectData.modules) {
        Object.entries(projectData.modules).forEach(([moduleId, moduleData]: [string, any]) => {
          if (moduleData.input) {
            this.setJSON(STORAGE_KEYS.MODULE_INPUT(moduleId), moduleData.input);
          }
          if (moduleData.output) {
            this.set(STORAGE_KEYS.MODULE_OUTPUT(moduleId), moduleData.output);
          }
        });
      }

      // 导入模块7数据
      if (projectData.module7Content) {
        this.set(STORAGE_KEYS.MODULE7_CONTENT, projectData.module7Content);
      }
      if (projectData.module7Suggestion) {
        this.set(STORAGE_KEYS.MODULE7_SUGGESTION, projectData.module7Suggestion);
      }

      if (projectData.maxWorks) {
        const works = Array.isArray(projectData.maxWorks.works) ? projectData.maxWorks.works : [];
        if (works.length > 0) {
          this.setJSON('novel_writer_max_works', works);
        }
        const activeWorkId = projectData.maxWorks.activeWorkId || works[0]?.id || '';
        if (activeWorkId) {
          this.set('novel_writer_max_active_work', activeWorkId);
        }
        const contexts = projectData.maxWorks.contexts || {};
        Object.entries(contexts).forEach(([workId, context]) => {
          if (context) {
            this.setJSON(`novel_writer_max_context_${workId}`, context);
          }
        });
        if (projectData.maxWorks.legacyContext) {
          this.setJSON('novel_writer_max_context', projectData.maxWorks.legacyContext);
        }
      }

      // 直接设置最后保存时间，避免循环调用
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LAST_SAVE_TIME, new Date().toISOString());
      }
      return true;
    } catch {
      return false;
    }
  }

  // 获取设置
  static getSettings(): Record<string, string> {
    const settings: Record<string, string> = {};

    // RAG设置
    settings[STORAGE_KEYS.RAG_PROVIDER] = this.get(STORAGE_KEYS.RAG_PROVIDER) || '';
    settings[STORAGE_KEYS.RAG_API_KEY] = this.get(STORAGE_KEYS.RAG_API_KEY) || '';
    settings[STORAGE_KEYS.RAG_BASE_URL] = this.get(STORAGE_KEYS.RAG_BASE_URL) || '';
    settings[STORAGE_KEYS.RAG_MODEL] = this.get(STORAGE_KEYS.RAG_MODEL) || '';

    settings[STORAGE_KEYS.VECTOR_PROVIDER] = this.get(STORAGE_KEYS.VECTOR_PROVIDER) || '';
    settings[STORAGE_KEYS.VECTOR_API_KEY] = this.get(STORAGE_KEYS.VECTOR_API_KEY) || '';
    settings[STORAGE_KEYS.VECTOR_BASE_URL] = this.get(STORAGE_KEYS.VECTOR_BASE_URL) || '';
    settings[STORAGE_KEYS.VECTOR_MODEL] = this.get(STORAGE_KEYS.VECTOR_MODEL) || '';

    // 大模型设置
    settings[STORAGE_KEYS.BIG_MODEL_PROVIDER] = this.get(STORAGE_KEYS.BIG_MODEL_PROVIDER) || '';
    settings[STORAGE_KEYS.BIG_MODEL_API_KEY] = this.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || '';
    settings[STORAGE_KEYS.BIG_MODEL_BASE_URL] = this.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || '';
    settings[STORAGE_KEYS.BIG_MODEL_MODEL] = this.get(STORAGE_KEYS.BIG_MODEL_MODEL) || '';

    // Writing设置
    settings[STORAGE_KEYS.WRITING_PROVIDER] = this.get(STORAGE_KEYS.WRITING_PROVIDER) || '';
    settings[STORAGE_KEYS.WRITING_API_KEY] = this.get(STORAGE_KEYS.WRITING_API_KEY) || '';
    settings[STORAGE_KEYS.WRITING_BASE_URL] = this.get(STORAGE_KEYS.WRITING_BASE_URL) || '';
    settings[STORAGE_KEYS.WRITING_MODEL] = this.get(STORAGE_KEYS.WRITING_MODEL) || '';

    // Chat设置
    settings[STORAGE_KEYS.CHAT_PROVIDER] = this.get(STORAGE_KEYS.CHAT_PROVIDER) || '';
    settings[STORAGE_KEYS.CHAT_API_KEY] = this.get(STORAGE_KEYS.CHAT_API_KEY) || '';
    settings[STORAGE_KEYS.CHAT_BASE_URL] = this.get(STORAGE_KEYS.CHAT_BASE_URL) || '';
    settings[STORAGE_KEYS.CHAT_MODEL] = this.get(STORAGE_KEYS.CHAT_MODEL) || '';

    // Image设置
    settings[STORAGE_KEYS.IMAGE_PROVIDER] = this.get(STORAGE_KEYS.IMAGE_PROVIDER) || '';
    settings[STORAGE_KEYS.IMAGE_API_KEY] = this.get(STORAGE_KEYS.IMAGE_API_KEY) || '';
    settings[STORAGE_KEYS.IMAGE_BASE_URL] = this.get(STORAGE_KEYS.IMAGE_BASE_URL) || '';
    settings[STORAGE_KEYS.IMAGE_MODEL] = this.get(STORAGE_KEYS.IMAGE_MODEL) || '';

    return settings;
  }

  // 更新最后保存时间
  private static updateLastSaveTime(): void {
    this.set(STORAGE_KEYS.LAST_SAVE_TIME, new Date().toISOString());
  }

  // 获取最后保存时间
  static getLastSaveTime(): string | null {
    return this.get(STORAGE_KEYS.LAST_SAVE_TIME);
  }

  // 创建数据备份
  static async createBackup(): Promise<boolean> {
    const backupData = await this.exportProject();
    if (backupData) {
      this.set(STORAGE_KEYS.PROJECT_BACKUP, backupData);
      return true;
    }
    return false;
  }

  // 恢复备份
  static restoreBackup(): boolean {
    const backupData = this.get(STORAGE_KEYS.PROJECT_BACKUP);
    if (!backupData) return false;

    return this.importProject(backupData);
  }

  // 检查是否有数据
  static hasAnyData(): boolean {
    const modules = this.getAllModulesData();
    return Object.keys(modules).length > 0 ||
      !!this.get(STORAGE_KEYS.MODULE7_CONTENT) ||
      !!this.get(STORAGE_KEYS.RAG_API_KEY) ||
      !!this.get(STORAGE_KEYS.WRITING_API_KEY);
  }

  // 导出到结构化TXT文件夹 (ZIP)
  static async exportToTxtZip(): Promise<Blob | null> {
    const zip = new JSZip();

    // 1. 大纲 (Module 2)
    const outline = this.get(STORAGE_KEYS.MODULE_OUTPUT('module2'));
    if (outline) {
      zip.file("大纲/outline.txt", outline);
    }

    // 2. 细纲 (Module 2.5)
    const detailedOutline = this.get(STORAGE_KEYS.MODULE_OUTPUT('module2_5'));
    if (detailedOutline) {
      zip.file("细纲/detailed_outline.txt", detailedOutline);
    }

    // 3. 正文 (Module 3, 4, 7)
    // 收集所有可能的正文来源
    const contentSources = [
      { id: 'module3', name: '开篇' },
      { id: 'module4', name: '章节批量' },
      { id: 'module7', name: 'AI辅助写作', key: STORAGE_KEYS.MODULE7_CONTENT }
    ];

    const chapterFolder = zip.folder("正文");
    let chapterCount = 0;

    for (const source of contentSources) {
      const content = source.key ? this.get(source.key) : this.get(STORAGE_KEYS.MODULE_OUTPUT(source.id));
      if (!content) continue;

      // 尝试按章节分割
      // 匹配 "第x章", "第x节", "Chapter x", "### 第x章" 等
      const chapterRegex = /(?:^|\n)(?:#{1,6}\s+)?(第[一二三四五六七八九十百千万\d]+章|Chapter\s+\d+|第[一二三四五六七八九十百千万\d]+节)/gi;

      const parts = content.split(chapterRegex);

      if (parts.length > 1) {
        // 第一个部分可能是前言或空字符串
        if (parts[0].trim()) {
          chapterFolder?.file(`未命名片段_${++chapterCount}.txt`, parts[0].trim());
        }

        for (let i = 1; i < parts.length; i += 2) {
          const title = parts[i].trim();
          const body = parts[i + 1] ? parts[i + 1].trim() : "";
          const fileName = title.replace(/[\\/:*?"<>|]/g, "_") + ".txt";
          chapterFolder?.file(fileName, body);
        }
      } else {
        // 如果没有匹配到章节标识，则作为一个整体保存
        chapterFolder?.file(`${source.name}.txt`, content);
      }
    }

    if (Object.keys(zip.files).length === 0) return null;

    return await zip.generateAsync({ type: "blob" });
  }

  // 获取储存使用统计
  static getStorageStats(): { used: number; total: number; percentage: number } {
    if (typeof window === 'undefined') {
      return { used: 0, total: 0, percentage: 0 };
    }

    const used = JSON.stringify(localStorage).length;
    const total = 100 * 1024 * 1024; // 100MB 估算
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  }

  // 云端同步：上传设置
  static async syncToCloud(): Promise<boolean> {
    try {
      const settings = this.getSettings();
      // Also include MAX mode setting if it's considered a setting
      settings[STORAGE_KEYS.ENABLE_MAX_MODE] = this.get(STORAGE_KEYS.ENABLE_MAX_MODE) || 'false';

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });

      if (response.status === 401) return false; // Not logged in
      if (!response.ok) throw new Error('Failed to upload settings');

      return true;
    } catch (e) {
      console.error('Cloud sync upload failed:', e);
      return false;
    }
  }

  // 云端同步：下载设置
  static async syncFromCloud(): Promise<boolean> {
    try {
      const response = await fetch('/api/user/settings');
      if (response.status === 401) return false; // Not logged in
      if (!response.ok) throw new Error('Failed to download settings');

      const result = await response.json();
      if (result.data) {
        // Apply settings
        let changed = false;
        Object.entries(result.data).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            const current = this.get(key);
            if (current !== value) {
              this.set(key, value);
              changed = true;
            }
          }
        });

        if (changed) {
          // Trigger storage event for UI updates
          window.dispatchEvent(new Event('local-storage-update'));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Cloud sync download failed:', e);
      return false;
    }
  }

  // 记录Token使用
  static async addTokenUsage(provider: string, model: string, promptTokens: number, completionTokens: number): Promise<void> {
    if (typeof window === 'undefined') return;

    const record: TokenUsageRecord = {
      date: new Date().toISOString(),
      provider: provider || 'unknown',
      model: model || 'unknown',
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens: (promptTokens || 0) + (completionTokens || 0)
    };

    try {
      // 获取现有记录
      let history: TokenUsageRecord[] = await this.getJSONAsync(STORAGE_KEYS.TOKEN_USAGE) || [];
      if (!Array.isArray(history)) history = [];

      // 添加新记录
      history.push(record);

      // 限制历史记录数量 (保留最近 10000 条)
      if (history.length > 10000) {
        history = history.slice(-10000);
      }

      // 保存
      this.setJSON(STORAGE_KEYS.TOKEN_USAGE, history);
    } catch (e) {
      console.error('Failed to save token usage:', e);
    }
  }

  // 获取Token统计
  static async getTokenStats(): Promise<{
    total: number;
    today: number;
    byModel: Record<string, number>;
    history: TokenUsageRecord[];
  }> {
    if (typeof window === 'undefined') {
      return { total: 0, today: 0, byModel: {}, history: [] };
    }

    const history: TokenUsageRecord[] = await this.getJSONAsync(STORAGE_KEYS.TOKEN_USAGE) || [];

    const stats = {
      total: 0,
      today: 0,
      byModel: {} as Record<string, number>,
      history
    };

    const todayStr = new Date().toISOString().split('T')[0];

    for (const record of history) {
      stats.total += record.totalTokens;

      // 今日统计
      if (record.date.startsWith(todayStr)) {
        stats.today += record.totalTokens;
      }

      // 按模型统计
      const modelKey = `${record.provider}/${record.model}`;
      stats.byModel[modelKey] = (stats.byModel[modelKey] || 0) + record.totalTokens;
    }

    return stats;
  }
}

// 自动保存装饰器
export function autoSave(key: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);

      // 如果是Promise，等待完成后保存
      if (result instanceof Promise) {
        return result.then((data: any) => {
          StorageManager.set(key, JSON.stringify(data));
          return data;
        });
      } else {
        // 同步保存
        StorageManager.set(key, JSON.stringify(result));
        return result;
      }
    };

    return descriptor;
  };
}
