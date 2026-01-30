import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { generateAIContentStream } from '@/lib/ai';

type TaskStatus = 'running' | 'done' | 'error';

export type ModuleGenerationTask = {
  moduleId: string;
  status: TaskStatus;
  content: string;
  error?: string;
  startedAt: number;
  updatedAt: number;
};

type InternalTask = ModuleGenerationTask & {
  abortController: AbortController;
  listeners: Set<(task: ModuleGenerationTask) => void>;
  promise: Promise<string>;
  lastSavedAt: number;
};

function safeNow() {
  return Date.now();
}

function cleanContent(text: string) {
  return text.replace(/#\*|#\s\*/g, '');
}

class ModuleGenerationManager {
  private mainTasks = new Map<string, InternalTask>();

  getMainTask(moduleId: string): ModuleGenerationTask | null {
    const task = this.mainTasks.get(moduleId);
    if (!task) return null;
    const { abortController: _ac, listeners: _l, promise: _p, lastSavedAt: _s, ...publicTask } = task;
    return publicTask;
  }

  subscribeMain(moduleId: string, listener: (task: ModuleGenerationTask) => void) {
    const task = this.mainTasks.get(moduleId);
    if (task) {
      task.listeners.add(listener);
      listener(this.getMainTask(moduleId)!);
      return () => {
        task.listeners.delete(listener);
      };
    }

    const emptyUnsub = () => null;
    return emptyUnsub;
  }

  async startMainTask(params: {
    moduleId: string;
    apiKey: string;
    systemPrompt: string;
    userPrompt: string;
    baseUrl: string;
    model: string;
  }): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('ModuleGenerationManager can only run in browser');
    }

    const existing = this.mainTasks.get(params.moduleId);
    if (existing?.status === 'running') {
      return existing.promise;
    }

    const abortController = new AbortController();
    const task: InternalTask = {
      moduleId: params.moduleId,
      status: 'running',
      content: '',
      startedAt: safeNow(),
      updatedAt: safeNow(),
      abortController,
      listeners: new Set(),
      lastSavedAt: 0,
      promise: Promise.resolve('')
    };

    this.mainTasks.set(params.moduleId, task);
    this.emit(task);

    const promise = generateAIContentStream(
      params.apiKey,
      params.systemPrompt,
      params.userPrompt,
      params.baseUrl,
      params.model,
      (text) => {
        const cleaned = cleanContent(text);
        task.content = cleaned;
        task.updatedAt = safeNow();
        this.maybeSaveDraft(task);
        this.emit(task);
      },
      abortController.signal
    )
      .then((text) => {
        const cleaned = cleanContent(text);
        task.content = cleaned;
        task.updatedAt = safeNow();
        task.status = 'done';
        this.saveDraft(task);
        this.emit(task);
        return cleaned;
      })
      .catch((err: any) => {
        const errorString = err?.message || String(err);
        if (err?.name === 'AbortError' || errorString.includes('BodyStreamBuffer was aborted') || errorString.includes('The user aborted a request')) {
          task.status = 'error';
          task.error = 'aborted';
          this.emit(task);
          throw err;
        }
        task.status = 'error';
        task.error = errorString;
        task.updatedAt = safeNow();
        this.maybeSaveDraft(task);
        this.emit(task);
        throw err;
      })
      .finally(() => {
        setTimeout(() => {
          const current = this.mainTasks.get(params.moduleId);
          if (!current) return;
          if (current.status === 'running') return;
          if (current.listeners.size > 0) return;
          this.mainTasks.delete(params.moduleId);
        }, 60_000);
      });

    task.promise = promise;
    return promise;
  }

  private emit(task: InternalTask) {
    const publicTask = this.getMainTask(task.moduleId);
    if (!publicTask) return;
    task.listeners.forEach((listener) => listener(publicTask));
  }

  private outputKey(moduleId: string) {
    return STORAGE_KEYS.MODULE_OUTPUT(moduleId);
  }

  private saveDraft(task: InternalTask) {
    StorageManager.set(this.outputKey(task.moduleId), task.content);
    task.lastSavedAt = safeNow();
  }

  private maybeSaveDraft(task: InternalTask) {
    const now = safeNow();
    if (now - task.lastSavedAt < 800) return;
    this.saveDraft(task);
  }
}

export const moduleGenerationManager = new ModuleGenerationManager();

