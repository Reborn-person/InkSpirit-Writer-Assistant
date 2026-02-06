import { generateAIContentStream, generateAIContent } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { MemoryManager } from './manager';
import { ContextDiscoveryEngine, ContextQuery, DynamicContext } from './context-discovery';
import { routeNovelWriting, NovelWritingStep } from '@/lib/novel-router';
import {
  AgentResponse,
  DialogueEntry,
  UnderstandingContext,
  WorkingMemory,
  CharacterMemory,
} from './types';

export class MemoryAwareAgent {
  private memoryManager: MemoryManager;
  private contextDiscovery: ContextDiscoveryEngine;
  private dialogueHistory: DialogueEntry[] = [];
  private bookId: string;
  private bookTitle: string;
  private currentChapterId: string | null = null;
  private currentChapterName: string | null = null;
  private lastDynamicContext: DynamicContext | null = null;

  constructor(bookId: string, bookTitle: string = '') {
    this.bookId = bookId;
    this.bookTitle = bookTitle;
    this.memoryManager = new MemoryManager(bookId, bookTitle);
    // 初始化上下文发现引擎
    this.contextDiscovery = new ContextDiscoveryEngine(this.memoryManager.exportMemory());
  }

  // 设置当前章节
  setCurrentChapter(chapterId: string, chapterName: string) {
    this.currentChapterId = chapterId;
    this.currentChapterName = chapterName;

    // 初始化或更新工作记忆
    const existingWorkingMemory = this.memoryManager.getWorkingMemory();
    if (!existingWorkingMemory || existingWorkingMemory.chapterId !== chapterId) {
      this.memoryManager.setWorkingMemory({
        chapterId,
        chapterName,
        chapterGoal: '',
        sceneStack: [],
        activePlots: [],
        pendingQuestions: [],
        emotionalState: {
          current: '',
          target: '',
          progression: '',
        },
      });
    }
  }

  // 获取写作配置
  private getWritingConfig() {
    const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
    const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
    let model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
    if (model === 'deepseek-ai/DeepSeek-V3') {
      model = 'deepseek-ai/DeepSeek-R1';
    }
    return { apiKey, baseUrl, model };
  }

  // 主处理流程
  async process(userInput: string): Promise<AgentResponse> {
    // 1. 记录用户输入
    this.addToHistory('user', 'answer', userInput);

    // 2. 检查用户是否确认完成（用户控制进度）
    if (this.isUserConfirmation(userInput)) {
      return this.generateWriting();
    }

    // 3. 提取信息并更新记忆
    await this.extractInformation(userInput);

    // 4. 评估理解程度
    const understanding = this.assessUnderstanding();

    // 5. 继续提问收集信息（由用户控制何时开始写作）
    return this.askNextQuestion(understanding.missingFields);
  }

  // 检查用户是否确认完成
  private isUserConfirmation(input: string): boolean {
    const confirmationKeywords = [
      '确认完成',
      '开始写',
      '直接写',
      '开始写作',
      '写吧',
      '可以写了',
      '写',
      '生成',
      '开始生成',
      '完成',
      '确认',
      'ok',
      'OK',
      '好了',
      '就这样',
    ];
    
    const text = input.trim().toLowerCase();
    return confirmationKeywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  // 提取信息（使用LLM分析）- 使用 Qwen/Qwen3-8B
  private async extractInformation(input: string): Promise<void> {
    const systemPrompt = `你是一个信息提取专家。从用户的输入中提取角色、剧情、场景、风格等信息。
当前已收集的信息：
${JSON.stringify(this.memoryManager.getUnderstanding(), null, 2)}

请以JSON格式返回提取到的信息，格式如下：
{
  "characters": [{"name": "角色名", "role": "protagonist/antagonist/supporting", "traits": ["性格特点"]}],
  "plot": {"currentSituation": "", "goal": "", "conflict": "", "twist": ""},
  "scene": {"setting": "", "atmosphere": "", "pacing": "fast/slow/mixed"},
  "style": {"tone": "", "perspective": "first/third", "detailLevel": "concise/detailed/vivid"}
}

如果某类信息未提及，对应字段留空或省略。`;

    try {
      // 使用网文路由 - 信息提取步骤
      const result = await routeNovelWriting({
        step: 'extract_information',
        systemPrompt,
        userPrompt: `用户输入：${input}`,
      });

      const extracted = JSON.parse(result.content);

      // 更新理解上下文
      if (extracted.plot || extracted.scene || extracted.style) {
        this.memoryManager.updateUnderstanding({
          plot: extracted.plot,
          scene: extracted.scene,
          style: extracted.style,
        });
      }

      // 添加角色
      if (extracted.characters && Array.isArray(extracted.characters)) {
        for (const char of extracted.characters) {
          if (char.name && !this.memoryManager.getCharacter(char.name)) {
            this.memoryManager.addCharacter({
              name: char.name,
              aliases: char.aliases || [],
              role: char.role || 'supporting',
              personality: {
                traits: char.traits || [],
                strengths: char.strengths || [],
                weaknesses: char.weaknesses || [],
                values: char.values || [],
              },
              appearance: {
                description: char.appearance || '',
                distinctiveFeatures: char.distinctiveFeatures || [],
              },
              background: {
                origin: char.origin || '',
                motivation: char.motivation || '',
                goals: char.goals || [],
                fears: char.fears || [],
              },
              relationships: char.relationships || [],
              development: {
                arc: char.arc || '',
                currentState: char.currentState || '',
                keyEvents: char.keyEvents || [],
              },
            });
          }
        }
      }
    } catch (e) {
      // 提取失败，继续对话
      console.warn('信息提取失败:', e);
    }
  }

  // 评估理解程度
  private assessUnderstanding(): { isComplete: boolean; missingFields: string[] } {
    const understanding = this.memoryManager.getUnderstanding();
    const characters = this.memoryManager.getAllCharacters();
    const missing: string[] = [];

    // 检查主角
    const hasProtagonist = characters.some(c => c.role === 'protagonist');
    if (!hasProtagonist) {
      missing.push('主角设定（姓名、性格）');
    }

    // 检查剧情要素
    if (!understanding.plot?.goal) {
      missing.push('本章目标（主角要完成什么）');
    }
    if (!understanding.plot?.conflict) {
      missing.push('主要冲突（阻碍是什么）');
    }

    // 检查场景
    if (!understanding.scene?.setting) {
      missing.push('场景设定（在哪里发生）');
    }

    // 检查风格
    if (!understanding.style?.tone) {
      missing.push('情绪基调（紧张/温馨/悲伤等）');
    }

    // 理解度达到80%以上视为完整
    const score = this.memoryManager.calculateUnderstandingScore();
    return {
      isComplete: score >= 70,
      missingFields: missing,
    };
  }

  // 生成下一个问题 - 使用 Pro/deepseek-ai/DeepSeek-V3.2
  private async askNextQuestion(missingFields: string[]): Promise<AgentResponse> {
    // 构建对话历史提示
    const historyPrompt = this.dialogueHistory
      .slice(-6)
      .map(h => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`)
      .join('\n');

    const systemPrompt = `你是一个AI写作助手，正在通过提问了解用户的写作需求。

已掌握的信息：
${this.memoryManager.buildMemoryPrompt()}

还缺失的信息：${missingFields.join('、')}

请根据已有信息和缺失信息，生成一个自然的追问。要求：
1. 每次只问最重要的一点
2. 问题要具体，引导用户提供细节
3. 避免重复之前问过的问题
4. 语气友好，像一位专业的写作教练

对话历史：
${historyPrompt}`;

    // 使用网文路由 - 智能提问步骤
    const result = await routeNovelWriting({
      step: 'ask_question',
      systemPrompt,
      userPrompt: '请生成下一个问题：',
    });

    this.addToHistory('agent', 'question', result.content);

    const score = this.memoryManager.calculateUnderstandingScore();

    // 在问题后面添加提示
    let finalContent = result.content;
    if (score < 100) {
      finalContent += `\n\n---\n💡 **提示**：当前理解度 ${score}%，当你觉得说得差不多了，可以告诉我"**确认完成**"或"**开始写**"，我就会开始写作。`;
    } else {
      finalContent += `\n\n---\n✅ **理解已完成**！你可以告诉我"**确认完成**"或"**开始写**"，我就会开始写作。`;
    }

    return {
      type: 'question',
      content: finalContent,
      progress: {
        understandingScore: score,
        knownCharacters: this.memoryManager.getAllCharacters().length,
        knownSettings: this.memoryManager.getWorldBuilding().length,
      },
    };
  }

  // 生成写作内容（使用动态上下文发现）- 使用 Pro/zai-org/GLM-4.7
  private async generateWriting(): Promise<AgentResponse> {
    const understanding = this.memoryManager.getUnderstanding();

    // 1. 构建上下文查询
    const contextQuery: ContextQuery = {
      text: `${understanding.plot?.goal || ''} ${understanding.plot?.conflict || ''} ${understanding.scene?.setting || ''}`,
      currentChapterId: this.currentChapterId || undefined,
      currentScene: understanding.scene?.setting,
      involvedCharacters: this.memoryManager.getMainCharacters().map(c => c.name),
      queryType: 'writing',
    };

    // 2. 动态发现相关上下文（本地处理，不使用LLM）
    const dynamicContext = await this.contextDiscovery.discoverContext(contextQuery);
    this.lastDynamicContext = dynamicContext;

    // 3. 构建动态提示词
    const dynamicPrompt = this.contextDiscovery.buildPrompt(dynamicContext);

    // 4. 构建系统提示词
    const systemPrompt = `你是一个专业的小说作家。请根据以下动态发现的上下文信息写出精彩的章节内容：

${dynamicPrompt}

【当前章节信息】
剧情概要：${understanding.plot?.currentSituation || '未设定'}
本章目标：${understanding.plot?.goal || '未设定'}
主要冲突：${understanding.plot?.conflict || '未设定'}
场景设定：${understanding.scene?.setting || '未设定'}
情绪基调：${understanding.style?.tone || '未设定'}

写作要求：
- 字数：3000-5000字
- 严格保持与角色设定一致
- 承接前文剧情线索
- 突出人物性格和情感变化
- 场景描写生动，有画面感
- 情节紧凑，有张力
- 使用中文写作

请直接输出章节正文，不要添加额外的说明。`;

    const userPrompt = `请写${this.currentChapterName || '本章'}的内容。`;

    // 5. 使用网文路由 - 正文写作步骤（使用 GLM-4.7）
    let fullContent = '';
    await routeNovelWriting({
      step: 'generate_writing',
      systemPrompt,
      userPrompt,
      onUpdate: (chunk) => {
        fullContent = chunk;
      },
    });

    this.addToHistory('agent', 'writing', fullContent.slice(0, 100) + '...');

    // 6. 记录本章事件
    if (this.currentChapterId && this.currentChapterName) {
      const keyEvents = await this.extractKeyEvents(fullContent);
      this.memoryManager.recordChapterEvent(
        this.currentChapterId,
        this.currentChapterName,
        understanding.plot?.goal || '章节写作完成',
        keyEvents
      );
      
      // 更新上下文发现引擎的记忆（包含新的事件）
      this.contextDiscovery = new ContextDiscoveryEngine(this.memoryManager.exportMemory());
    }

    return {
      type: 'writing',
      content: fullContent,
      progress: {
        understandingScore: 100,
        knownCharacters: this.memoryManager.getAllCharacters().length,
        knownSettings: this.memoryManager.getWorldBuilding().length,
        dynamicContext: {
          characters: dynamicContext.characters.length,
          events: dynamicContext.events.length,
          worldBuilding: dynamicContext.worldBuilding.length,
          totalTokens: dynamicContext.totalTokens,
        },
      },
    };
  }

  // 提取关键事件 - 使用 Qwen/Qwen3-8B（轻量级任务）
  private async extractKeyEvents(content: string): Promise<string[]> {
    const systemPrompt = `请从以下小说章节中提取3-5个关键事件，以JSON数组格式返回。每个事件用一句话描述。`;

    try {
      // 使用网文路由 - 信息提取步骤（轻量级）
      const result = await routeNovelWriting({
        step: 'extract_information',
        systemPrompt,
        userPrompt: content.slice(0, 3000), // 只取前3000字避免过长
      });

      const events = JSON.parse(result.content);
      if (Array.isArray(events)) {
        return events.slice(0, 5);
      }
    } catch (e) {
      console.warn('关键事件提取失败:', e);
    }

    return ['章节写作完成'];
  }

  // 添加对话历史
  private addToHistory(role: 'user' | 'agent', type: DialogueEntry['type'], content: string) {
    this.dialogueHistory.push({
      role,
      type,
      content,
      timestamp: Date.now(),
    });

    // 只保留最近20条
    if (this.dialogueHistory.length > 20) {
      this.dialogueHistory = this.dialogueHistory.slice(-20);
    }
  }

  // 获取当前理解进度
  getProgress() {
    return {
      understandingScore: this.memoryManager.calculateUnderstandingScore(),
      knownCharacters: this.memoryManager.getAllCharacters().length,
      knownSettings: this.memoryManager.getWorldBuilding().length,
      understanding: this.memoryManager.getUnderstanding(),
      dynamicContext: this.lastDynamicContext ? {
        characters: this.lastDynamicContext.characters.map(c => ({
          name: c.title,
          relevance: Math.round(c.relevanceScore * 100),
        })),
        events: this.lastDynamicContext.events.map(e => e.title),
        worldBuilding: this.lastDynamicContext.worldBuilding.map(w => w.title),
        totalTokens: this.lastDynamicContext.totalTokens,
      } : null,
    };
  }

  // 获取记忆管理器（供外部使用）
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  // 获取对话历史
  getDialogueHistory(): DialogueEntry[] {
    return [...this.dialogueHistory];
  }

  // 清空对话历史（但保留记忆）
  clearDialogueHistory() {
    this.dialogueHistory = [];
  }

  // 重置所有记忆
  resetAll() {
    this.dialogueHistory = [];
    this.memoryManager.clearAllMemory();
  }
}
