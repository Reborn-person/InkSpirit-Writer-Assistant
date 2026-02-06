// 渐进式上下文展开系统
// 结合提问逐步加载详细上下文

import { BookMemory, CharacterMemory, ChapterEvent, WorldBuildingMemory } from './types';

// 上下文层级
export type ContextLevel = 'summary' | 'basic' | 'detailed' | 'full';

// 上下文维度
export type ContextDimension = 
  | 'plot'           // 剧情
  | 'character'      // 角色
  | 'scene'          // 场景
  | 'world'          // 世界观
  | 'emotion'        // 情感
  | 'style';         // 风格

// 渐进式上下文项
export interface ProgressiveContextItem {
  dimension: ContextDimension;
  level: ContextLevel;
  content: string;
  canExpand: boolean;
  expandQuestions: string[];
  priority: number;      // 优先级 1-10
  loaded: boolean;       // 是否已加载
}

// 上下文展开计划
export interface ExpansionPlan {
  dimension: ContextDimension;
  targetLevel: ContextLevel;
  questions: string[];
  reason: string;
}

// 渐进式上下文状态
export interface ProgressiveContextState {
  items: Map<ContextDimension, ProgressiveContextItem>;
  currentLevel: ContextLevel;
  totalPriority: number;
  loadedPriority: number;
}

// 上下文需求分析
export interface ContextRequirement {
  dimension: ContextDimension;
  required: boolean;
  currentLevel: ContextLevel;
  targetLevel: ContextLevel;
  missingInfo: string[];
}

/**
 * 渐进式上下文管理器
 */
export class ProgressiveContextManager {
  private bookMemory: BookMemory;
  private state: ProgressiveContextState;
  private currentChapterId: string;

  constructor(bookMemory: BookMemory, currentChapterId: string) {
    this.bookMemory = bookMemory;
    this.currentChapterId = currentChapterId;
    this.state = {
      items: new Map(),
      currentLevel: 'summary',
      totalPriority: 0,
      loadedPriority: 0,
    };
    this.initializeContext();
  }

  // 初始化上下文（从概要层开始）
  private initializeContext(): void {
    // 剧情维度 - 概要层
    this.state.items.set('plot', {
      dimension: 'plot',
      level: 'summary',
      content: this.buildPlotSummary(),
      canExpand: true,
      expandQuestions: ['这一章的核心剧情是什么？', '主角要完成什么目标？', '有什么阻碍？'],
      priority: 10,
      loaded: true,
    });

    // 角色维度 - 概要层
    this.state.items.set('character', {
      dimension: 'character',
      level: 'summary',
      content: this.buildCharacterSummary(),
      canExpand: true,
      expandQuestions: ['出场角色有哪些？', '他们当前的状态如何？'],
      priority: 9,
      loaded: true,
    });

    // 场景维度 - 未加载
    this.state.items.set('scene', {
      dimension: 'scene',
      level: 'summary',
      content: '',
      canExpand: true,
      expandQuestions: ['故事发生在什么地点？', '是什么时间？', '环境氛围如何？'],
      priority: 8,
      loaded: false,
    });

    // 世界观维度 - 未加载
    this.state.items.set('world', {
      dimension: 'world',
      level: 'summary',
      content: '',
      canExpand: true,
      expandQuestions: ['涉及什么修炼体系？', '有什么特殊规则？'],
      priority: 6,
      loaded: false,
    });

    // 情感维度 - 未加载
    this.state.items.set('emotion', {
      dimension: 'emotion',
      level: 'summary',
      content: '',
      canExpand: true,
      expandQuestions: ['这一章的情绪基调是什么？', '情感如何变化？'],
      priority: 7,
      loaded: false,
    });

    // 风格维度 - 未加载
    this.state.items.set('style', {
      dimension: 'style',
      level: 'summary',
      content: '',
      canExpand: true,
      expandQuestions: ['希望什么写作风格？', '详细程度如何？'],
      priority: 5,
      loaded: false,
    });

    this.calculatePriority();
  }

  // 计算优先级
  private calculatePriority(): void {
    let total = 0;
    let loaded = 0;
    for (const item of this.state.items.values()) {
      total += item.priority;
      if (item.loaded) {
        loaded += item.priority;
      }
    }
    this.state.totalPriority = total;
    this.state.loadedPriority = loaded;
  }

  // 获取当前进度百分比
  getProgressPercentage(): number {
    if (this.state.totalPriority === 0) return 0;
    return Math.round((this.state.loadedPriority / this.state.totalPriority) * 100);
  }

  // 获取当前已加载的上下文
  getLoadedContext(): string {
    const sections: string[] = [];
    const dimensions: ContextDimension[] = ['plot', 'character', 'scene', 'world', 'emotion', 'style'];
    
    for (const dim of dimensions) {
      const item = this.state.items.get(dim);
      if (item && item.loaded && item.content) {
        sections.push(`【${this.getDimensionName(dim)}】\n${item.content}`);
      }
    }
    
    return sections.join('\n\n');
  }

  // 获取维度名称
  private getDimensionName(dim: ContextDimension): string {
    const names: Record<ContextDimension, string> = {
      plot: '剧情',
      character: '角色',
      scene: '场景',
      world: '世界观',
      emotion: '情感',
      style: '风格',
    };
    return names[dim];
  }

  // 构建剧情概要
  private buildPlotSummary(): string {
    const understanding = this.bookMemory.understanding;
    const parts: string[] = [];
    
    if (understanding.plot?.goal) {
      parts.push(`目标: ${understanding.plot.goal}`);
    }
    if (understanding.plot?.conflict) {
      parts.push(`冲突: ${understanding.plot.conflict}`);
    }
    
    // 获取上一章的概要
    const prevChapter = this.getPreviousChapter();
    if (prevChapter) {
      parts.push(`前情: ${prevChapter.summary}`);
    }
    
    return parts.join('\n') || '剧情概要待补充';
  }

  // 构建角色概要
  private buildCharacterSummary(): string {
    const mainChars = this.bookMemory.characters.filter(c => 
      c.role === 'protagonist' || c.role === 'antagonist'
    );
    
    if (mainChars.length === 0) {
      return '主角信息待补充';
    }
    
    return mainChars.map(c => {
      const state = c.development.currentState || '状态未知';
      return `- ${c.name}: ${state}`;
    }).join('\n');
  }

  // 获取上一章
  private getPreviousChapter(): ChapterEvent | null {
    const currentIndex = this.bookMemory.eventHistory.findIndex(
      e => e.chapterId === this.currentChapterId
    );
    if (currentIndex > 0) {
      return this.bookMemory.eventHistory[currentIndex - 1];
    }
    return null;
  }

  // 分析需要展开的维度
  analyzeExpansionNeeds(userInput: string): ExpansionPlan[] {
    const plans: ExpansionPlan[] = [];
    const input = userInput.toLowerCase();

    // 检查每个维度
    for (const [dim, item] of this.state.items) {
      if (item.loaded && !item.canExpand) continue;

      const need = this.checkDimensionNeed(dim, input);
      if (need.required && need.currentLevel !== need.targetLevel) {
        plans.push({
          dimension: dim,
          targetLevel: need.targetLevel,
          questions: this.generateQuestionsForDimension(dim, need.missingInfo),
          reason: need.reason,
        });
      }
    }

    // 按优先级排序
    return plans.sort((a, b) => {
      const priorityA = this.state.items.get(a.dimension)?.priority || 0;
      const priorityB = this.state.items.get(b.dimension)?.priority || 0;
      return priorityB - priorityA;
    });
  }

  // 检查维度需求
  private checkDimensionNeed(
    dim: ContextDimension,
    userInput: string
  ): { required: boolean; currentLevel: ContextLevel; targetLevel: ContextLevel; missingInfo: string[]; reason: string } {
    const item = this.state.items.get(dim)!;
    const missing: string[] = [];

    switch (dim) {
      case 'plot':
        if (!this.bookMemory.understanding.plot?.goal) {
          missing.push('本章目标');
        }
        if (!this.bookMemory.understanding.plot?.conflict) {
          missing.push('主要冲突');
        }
        return {
          required: missing.length > 0,
          currentLevel: item.level,
          targetLevel: 'basic',
          missingInfo: missing,
          reason: '需要明确剧情目标',
        };

      case 'character':
        const hasProtagonist = this.bookMemory.characters.some(c => c.role === 'protagonist');
        if (!hasProtagonist) {
          missing.push('主角信息');
        }
        return {
          required: !hasProtagonist,
          currentLevel: item.level,
          targetLevel: 'basic',
          missingInfo: missing,
          reason: '需要了解出场角色',
        };

      case 'scene':
        if (!this.bookMemory.understanding.scene?.setting) {
          missing.push('场景地点');
        }
        if (/战斗|打|斗/.test(userInput) && !this.bookMemory.understanding.scene?.atmosphere) {
          missing.push('战斗氛围');
        }
        return {
          required: missing.length > 0,
          currentLevel: item.level,
          targetLevel: 'detailed',
          missingInfo: missing,
          reason: '需要明确场景设定',
        };

      case 'world':
        if (/突破|修炼|境界/.test(userInput)) {
          const hasCultivation = this.bookMemory.worldBuilding.some(
            w => w.category === 'cultivation_system'
          );
          if (!hasCultivation) {
            missing.push('修炼体系');
          }
        }
        return {
          required: missing.length > 0,
          currentLevel: item.level,
          targetLevel: 'basic',
          missingInfo: missing,
          reason: '涉及世界观设定',
        };

      case 'emotion':
        if (!this.bookMemory.understanding.style?.tone) {
          missing.push('情绪基调');
        }
        return {
          required: !this.bookMemory.understanding.style?.tone,
          currentLevel: item.level,
          targetLevel: 'basic',
          missingInfo: missing,
          reason: '需要明确情感基调',
        };

      case 'style':
        if (!this.bookMemory.understanding.style?.detailLevel) {
          missing.push('详细程度');
        }
        return {
          required: !this.bookMemory.understanding.style?.detailLevel,
          currentLevel: item.level,
          targetLevel: 'basic',
          missingInfo: missing,
          reason: '需要明确写作风格',
        };

      default:
        return {
          required: false,
          currentLevel: item.level,
          targetLevel: item.level,
          missingInfo: [],
          reason: '',
        };
    }
  }

  // 生成维度相关问题
  private generateQuestionsForDimension(dim: ContextDimension, missingInfo: string[]): string[] {
    const questionMap: Record<ContextDimension, Record<string, string[]>> = {
      plot: {
        '本章目标': ['这一章主角要完成什么目标？', '核心剧情是什么？'],
        '主要冲突': ['主角面临什么阻碍？', '冲突是什么？'],
      },
      character: {
        '主角信息': ['主角叫什么名字？', '主角当前是什么境界/状态？'],
      },
      scene: {
        '场景地点': ['故事发生在什么地点？', '具体环境如何？'],
        '战斗氛围': ['战斗场景的氛围如何？', '有什么特殊环境因素？'],
      },
      world: {
        '修炼体系': ['这是什么修炼体系？', '突破需要什么条件？'],
      },
      emotion: {
        '情绪基调': ['这一章的情绪基调是什么？', '希望读者感受到什么？'],
      },
      style: {
        '详细程度': ['希望描写详细还是简洁？', '节奏快还是慢？'],
      },
    };

    const questions: string[] = [];
    for (const info of missingInfo) {
      const qs = questionMap[dim]?.[info];
      if (qs) {
        questions.push(...qs);
      }
    }
    return questions.length > 0 ? questions : ['能详细说说吗？'];
  }

  // 展开维度到指定层级
  expandDimension(dim: ContextDimension, targetLevel: ContextLevel, userAnswers: Record<string, string>): void {
    const item = this.state.items.get(dim);
    if (!item) return;

    // 更新内容
    item.content = this.buildDimensionContent(dim, targetLevel, userAnswers);
    item.level = targetLevel;
    item.loaded = true;

    // 更新展开能力
    if (targetLevel === 'full') {
      item.canExpand = false;
    } else {
      item.expandQuestions = this.getNextLevelQuestions(dim, targetLevel);
    }

    this.calculatePriority();
  }

  // 构建维度内容
  private buildDimensionContent(dim: ContextDimension, level: ContextLevel, answers: Record<string, string>): string {
    const parts: string[] = [];

    switch (dim) {
      case 'plot':
        if (answers['goal']) parts.push(`目标: ${answers['goal']}`);
        if (answers['conflict']) parts.push(`冲突: ${answers['conflict']}`);
        if (level === 'detailed' && answers['twist']) parts.push(`转折: ${answers['twist']}`);
        break;

      case 'character':
        if (answers['name']) parts.push(`主角: ${answers['name']}`);
        if (answers['state']) parts.push(`状态: ${answers['state']}`);
        if (level === 'detailed') {
          parts.push('详细角色信息...');
        }
        break;

      case 'scene':
        if (answers['location']) parts.push(`地点: ${answers['location']}`);
        if (answers['time']) parts.push(`时间: ${answers['time']}`);
        if (answers['atmosphere']) parts.push(`氛围: ${answers['atmosphere']}`);
        break;

      default:
        for (const [key, value] of Object.entries(answers)) {
          parts.push(`${key}: ${value}`);
        }
    }

    return parts.join('\n') || '待补充';
  }

  // 获取下一层级的问题
  private getNextLevelQuestions(dim: ContextDimension, currentLevel: ContextLevel): string[] {
    const nextLevelMap: Record<ContextLevel, string[]> = {
      summary: ['能再详细一些吗？', '具体是怎样的？'],
      basic: ['还有什么细节？', '更深入地说说？'],
      detailed: ['还有补充吗？'],
      full: [],
    };

    return nextLevelMap[currentLevel] || [];
  }

  // 获取下一个需要展开的计划
  getNextExpansionPlan(): ExpansionPlan | null {
    for (const [dim, item] of this.state.items) {
      if (!item.loaded || (item.canExpand && item.level !== 'full')) {
        return {
          dimension: dim,
          targetLevel: this.getNextLevel(item.level),
          questions: item.expandQuestions,
          reason: `需要完善${this.getDimensionName(dim)}信息`,
        };
      }
    }
    return null;
  }

  // 获取下一层级
  private getNextLevel(current: ContextLevel): ContextLevel {
    const levels: ContextLevel[] = ['summary', 'basic', 'detailed', 'full'];
    const index = levels.indexOf(current);
    return levels[Math.min(index + 1, levels.length - 1)];
  }

  // 检查是否所有必要信息都已加载
  isReadyForWriting(): boolean {
    const requiredDimensions: ContextDimension[] = ['plot', 'character'];
    for (const dim of requiredDimensions) {
      const item = this.state.items.get(dim);
      if (!item || !item.loaded || item.level === 'summary') {
        return false;
      }
    }
    return true;
  }

  // 获取状态摘要
  getStatusSummary(): string {
    const loadedDims: string[] = [];
    const pendingDims: string[] = [];

    for (const [dim, item] of this.state.items) {
      if (item.loaded) {
        loadedDims.push(`${this.getDimensionName(dim)}(${item.level})`);
      } else {
        pendingDims.push(this.getDimensionName(dim));
      }
    }

    return `已加载: ${loadedDims.join(', ') || '无'}\n待补充: ${pendingDims.join(', ') || '无'}`;
  }
}
