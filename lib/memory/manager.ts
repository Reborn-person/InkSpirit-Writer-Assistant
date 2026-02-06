import { StorageManager } from '@/lib/storage';
import {
  BookMemory,
  CharacterMemory,
  WorldBuildingMemory,
  PlotMemory,
  ChapterEvent,
  WorkingMemory,
  UnderstandingContext,
} from './types';

const MEMORY_KEY_PREFIX = 'book_memory_';

export class MemoryManager {
  private bookId: string;
  private memory: BookMemory;

  constructor(bookId: string, bookTitle: string = '') {
    this.bookId = bookId;
    this.memory = this.loadMemory(bookTitle);
  }

  // 加载记忆
  private loadMemory(bookTitle: string): BookMemory {
    const saved = StorageManager.getJSON(`${MEMORY_KEY_PREFIX}${this.bookId}`);
    if (saved) {
      return saved as BookMemory;
    }

    // 初始化空记忆
    return {
      bookId: this.bookId,
      bookTitle: bookTitle || '未命名作品',
      characters: [],
      worldBuilding: [],
      plots: [],
      styles: [],
      eventHistory: [],
      workingMemory: null,
      understanding: {},
      lastUpdated: Date.now(),
    };
  }

  // 保存记忆
  private saveMemory(): void {
    this.memory.lastUpdated = Date.now();
    StorageManager.setJSON(`${MEMORY_KEY_PREFIX}${this.bookId}`, this.memory);
  }

  // ==================== 角色记忆操作 ====================

  addCharacter(character: Omit<CharacterMemory, 'id' | 'createdAt' | 'updatedAt'>): CharacterMemory {
    const newCharacter: CharacterMemory = {
      ...character,
      id: `char_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.memory.characters.push(newCharacter);
    this.saveMemory();
    return newCharacter;
  }

  updateCharacter(characterId: string, updates: Partial<CharacterMemory>): CharacterMemory | null {
    const index = this.memory.characters.findIndex(c => c.id === characterId);
    if (index === -1) return null;

    this.memory.characters[index] = {
      ...this.memory.characters[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveMemory();
    return this.memory.characters[index];
  }

  getCharacter(nameOrId: string): CharacterMemory | undefined {
    return this.memory.characters.find(c =>
      c.id === nameOrId ||
      c.name === nameOrId ||
      c.aliases.includes(nameOrId)
    );
  }

  getCharacterById(characterId: string): CharacterMemory | undefined {
    return this.memory.characters.find(c => c.id === characterId);
  }

  getAllCharacters(): CharacterMemory[] {
    return this.memory.characters;
  }

  getMainCharacters(): CharacterMemory[] {
    return this.memory.characters.filter(c =>
      c.role === 'protagonist' || c.role === 'antagonist'
    );
  }

  deleteCharacter(characterId: string): boolean {
    const index = this.memory.characters.findIndex(c => c.id === characterId);
    if (index === -1) return false;

    this.memory.characters.splice(index, 1);
    this.saveMemory();
    return true;
  }

  // ==================== 世界观记忆操作 ====================

  addWorldBuilding(item: Omit<WorldBuildingMemory, 'id'>): WorldBuildingMemory {
    const newItem: WorldBuildingMemory = {
      ...item,
      id: `wb_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    };

    this.memory.worldBuilding.push(newItem);
    this.saveMemory();
    return newItem;
  }

  getWorldBuilding(category?: WorldBuildingMemory['category']): WorldBuildingMemory[] {
    if (category) {
      return this.memory.worldBuilding.filter(wb => wb.category === category);
    }
    return this.memory.worldBuilding;
  }

  // ==================== 剧情记忆操作 ====================

  addPlot(plot: Omit<PlotMemory, 'id'>): PlotMemory {
    const newPlot: PlotMemory = {
      ...plot,
      id: `plot_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    };

    this.memory.plots.push(newPlot);
    this.saveMemory();
    return newPlot;
  }

  getActivePlots(): PlotMemory[] {
    return this.memory.plots.filter(p => p.status === 'ongoing');
  }

  // ==================== 事件历史操作 ====================

  recordChapterEvent(chapterId: string, chapterName: string, summary: string, keyEvents: string[]): void {
    // 检查是否已存在该章节记录，存在则更新
    const existingIndex = this.memory.eventHistory.findIndex(e => e.chapterId === chapterId);
    const event: ChapterEvent = {
      chapterId,
      chapterName,
      summary,
      keyEvents,
      timestamp: Date.now(),
    };

    if (existingIndex !== -1) {
      this.memory.eventHistory[existingIndex] = event;
    } else {
      this.memory.eventHistory.push(event);
    }

    this.saveMemory();
  }

  getEventHistory(limit: number = 5): ChapterEvent[] {
    return this.memory.eventHistory.slice(-limit);
  }

  getPreviousChapterEvent(currentChapterId: string): ChapterEvent | null {
    const currentIndex = this.memory.eventHistory.findIndex(e => e.chapterId === currentChapterId);
    if (currentIndex > 0) {
      return this.memory.eventHistory[currentIndex - 1];
    }
    return null;
  }

  // ==================== 工作记忆操作 ====================

  setWorkingMemory(workingMemory: WorkingMemory): void {
    this.memory.workingMemory = workingMemory;
    this.saveMemory();
  }

  getWorkingMemory(): WorkingMemory | null {
    return this.memory.workingMemory;
  }

  updateWorkingMemory(updates: Partial<WorkingMemory>): void {
    if (this.memory.workingMemory) {
      this.memory.workingMemory = { ...this.memory.workingMemory, ...updates };
      this.saveMemory();
    }
  }

  clearWorkingMemory(): void {
    this.memory.workingMemory = null;
    this.saveMemory();
  }

  // ==================== 理解上下文操作 ====================

  updateUnderstanding(updates: Partial<UnderstandingContext>): void {
    this.memory.understanding = {
      ...this.memory.understanding,
      ...updates,
    };
    this.saveMemory();
  }

  getUnderstanding(): UnderstandingContext {
    return this.memory.understanding;
  }

  clearUnderstanding(): void {
    this.memory.understanding = {};
    this.saveMemory();
  }

  // ==================== 智能检索 ====================

  getRelevantMemories(query: string): {
    characters: CharacterMemory[];
    events: string[];
    worldBuilding: WorldBuildingMemory[];
  } {
    const lowerQuery = query.toLowerCase();

    // 查找相关角色
    const relevantCharacters = this.memory.characters.filter(c =>
      lowerQuery.includes(c.name.toLowerCase()) ||
      c.aliases.some(a => lowerQuery.includes(a.toLowerCase()))
    );

    // 获取近期事件
    const recentEvents = this.memory.eventHistory
      .slice(-3)
      .flatMap(e => e.keyEvents);

    return {
      characters: relevantCharacters,
      events: recentEvents,
      worldBuilding: this.memory.worldBuilding.slice(-3),
    };
  }

  // ==================== 提示词构建 ====================

  buildMemoryPrompt(query: string = '', chapterId?: string): string {
    const sections: string[] = [];

    // 角色信息
    const mainChars = this.getMainCharacters();
    if (mainChars.length > 0) {
      const charLines = mainChars.map(c =>
        `- ${c.name} (${c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '反派' : '配角'}): ${c.personality.traits.join('、')}`
      ).join('\n');
      sections.push(`【角色档案】\n${charLines}`);
    }

    // 近期事件
    const recentEvents = this.getEventHistory(3);
    if (recentEvents.length > 0) {
      const eventLines = recentEvents.map((e, i) =>
        `${i + 1}. ${e.chapterName}: ${e.summary}`
      ).join('\n');
      sections.push(`【前文回顾】\n${eventLines}`);
    }

    // 工作记忆
    if (this.memory.workingMemory) {
      const wm = this.memory.workingMemory;
      const workingMemoryLines = [
        `- 目标: ${wm.chapterGoal}`,
        `- 场景: ${wm.sceneStack.length > 0 ? wm.sceneStack[wm.sceneStack.length - 1].location : '未设定'}`,
        `- 情感线: ${wm.emotionalState.current} → ${wm.emotionalState.target}`
      ].join('\n');
      sections.push(`【当前章节】\n${workingMemoryLines}`);
    }

    // 世界观设定
    const cultivation = this.getWorldBuilding('cultivation_system');
    if (cultivation.length > 0) {
      const cultivationLines = cultivation.slice(0, 2).map(wb => `- ${wb.name}: ${wb.description}`).join('\n');
      sections.push(`【设定】\n${cultivationLines}`);
    }

    return sections.join('\n\n');
  }

  // ==================== 理解度评估 ====================

  calculateUnderstandingScore(): number {
    let score = 0;

    // 角色理解 (30分)
    const hasProtagonist = this.memory.characters.some(c => c.role === 'protagonist');
    if (hasProtagonist) score += 20;
    if (this.memory.characters.length >= 2) score += 10;

    // 剧情理解 (30分)
    const understanding = this.memory.understanding;
    if (understanding.plot?.goal) score += 15;
    if (understanding.plot?.conflict) score += 15;

    // 场景理解 (20分)
    if (understanding.scene?.setting) score += 10;
    if (understanding.scene?.atmosphere) score += 10;

    // 风格理解 (20分)
    if (understanding.style?.tone) score += 10;
    if (understanding.style?.detailLevel) score += 10;

    return score;
  }

  // ==================== 导出/导入 ====================

  exportMemory(): BookMemory {
    return { ...this.memory };
  }

  importMemory(data: BookMemory): void {
    this.memory = { ...data, bookId: this.bookId, lastUpdated: Date.now() };
    this.saveMemory();
  }

  // ==================== 清理 ====================

  clearAllMemory(): void {
    this.memory = {
      bookId: this.bookId,
      bookTitle: this.memory.bookTitle,
      characters: [],
      worldBuilding: [],
      plots: [],
      styles: [],
      eventHistory: [],
      workingMemory: null,
      understanding: {},
      lastUpdated: Date.now(),
    };
    this.saveMemory();
  }
}
