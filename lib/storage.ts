import JSZip from 'jszip';

// 储存管理工具
export const STORAGE_KEYS = {
  // 设置相关
  RAG_PROVIDER: 'novel_writer_rag_provider',
  RAG_API_KEY: 'novel_writer_rag_api_key',
  RAG_BASE_URL: 'novel_writer_rag_base_url',
  RAG_MODEL: 'novel_writer_rag_model',
  
  BIG_MODEL_PROVIDER: 'novel_writer_big_model_provider',
  BIG_MODEL_API_KEY: 'novel_writer_big_model_api_key',
  BIG_MODEL_BASE_URL: 'novel_writer_big_model_base_url',
  BIG_MODEL_MODEL: 'novel_writer_big_model_model',

  WRITING_PROVIDER: 'novel_writer_writing_provider',
  WRITING_API_KEY: 'novel_writer_writing_api_key',
  WRITING_BASE_URL: 'novel_writer_writing_base_url',
  WRITING_MODEL: 'novel_writer_writing_model',
  
  // 模块数据
  MODULE_INPUT: (id: string) => `novel_writer_${id}_input`,
  MODULE_OUTPUT: (id: string) => `novel_writer_${id}_output`,
  
  // 模块7内容
  MODULE7_CONTENT: 'novel_writer_module7_content',
  MODULE7_SUGGESTION: 'novel_writer_module7_suggestion',
  NOVEL_PROJECTS: 'novel_writer_novel_projects', // New key for book collections
  
  // 项目备份
  PROJECT_BACKUP: 'novel_writer_project_backup',
  LAST_SAVE_TIME: 'novel_writer_last_save_time',
} as const;

// 储存管理类
export class StorageManager {
  // 获取数据
  static get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }
  
  // 设置数据
  static set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
    // 避免循环调用：只在非LAST_SAVE_TIME键时更新保存时间
    if (key !== STORAGE_KEYS.LAST_SAVE_TIME) {
      this.updateLastSaveTime();
    }
  }
  
  // 获取JSON数据
  static getJSON(key: string): any | null {
    const data = this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  // 设置JSON数据
  static setJSON(key: string, value: any): void {
    this.set(key, JSON.stringify(value));
  }
  
  // 删除数据
  static remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
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
  static exportProject(): string | null {
    const projectData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      settings: this.getSettings(),
      modules: this.getAllModulesData(),
      module7Content: this.get(STORAGE_KEYS.MODULE7_CONTENT),
      module7Suggestion: this.get(STORAGE_KEYS.MODULE7_SUGGESTION),
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
  static createBackup(): void {
    const backupData = this.exportProject();
    if (backupData) {
      this.set(STORAGE_KEYS.PROJECT_BACKUP, backupData);
    }
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
}

// 自动保存装饰器
export function autoSave(key: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
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