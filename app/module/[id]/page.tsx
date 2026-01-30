'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { PROMPTS } from '@/lib/prompts';
import { generateAIContentStream } from '@/lib/ai';
import { Loader2, Copy, Save, Wand2, Trash2, Download, FileJson, Upload, Plus, Edit2, CheckCircle2, Maximize2, Minimize2, ToggleLeft, ToggleRight, X, ChevronUp, ChevronDown, Settings2, Check, List, BookMarked, Heart } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { APIConfigValidator } from '@/lib/api-validator';
import { moduleGenerationManager } from '@/lib/module-generation-manager';

import Module7Editor from '@/components/Module7Editor';
import Module9Alchemy from '@/components/Module9Alchemy';
import Module10Manager from '@/components/Module10Manager';
import Module11Memo from '@/components/Module11Memo';

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
  lastModified?: number;
}

interface MultiModelConfig {
  id: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface MemoItem {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  tags?: string[];
  isRef?: boolean;
}

export default function ModulePage() {
  const params = useParams();
  const id = params.id as keyof typeof PROMPTS;
  const moduleConfig = PROMPTS[id];
  const isModule7 = id === 'module7';
  const isModule9 = id === 'module9';
  const isModule10 = id === 'module10';
  const isModule11 = id === 'module11';

  // PageSkill for AI Agent Control
  const { registerPageSkill, unregisterPageSkill, isAiOpen } = useEditorAgent();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Multi-Model State
  const [isMultiModelMode, setIsMultiModelMode] = useState(false);
  const [multiModels, setMultiModels] = useState<MultiModelConfig[]>([]);
  const [multiModelResults, setMultiModelResults] = useState<Record<string, string>>({});
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[]>(['main']);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [lockedOutputs, setLockedOutputs] = useState<string[]>([]);
  const [hiddenOutputs, setHiddenOutputs] = useState<string[]>([]);

  // Prompt Library State
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');

  const [showMemoImportModal, setShowMemoImportModal] = useState(false);
  const [memoImportCategory, setMemoImportCategory] = useState<'dismantling' | 'brainstorm'>('dismantling');
  const [memoImportItems, setMemoImportItems] = useState<MemoItem[]>([]);
  const [memoImportSearchTerm, setMemoImportSearchTerm] = useState('');
  const [selectedMemoImportItem, setSelectedMemoImportItem] = useState<MemoItem | null>(null);
  const [memoImportMode, setMemoImportMode] = useState<'replace' | 'append'>('replace');
  const [memoImportTargetKey, setMemoImportTargetKey] = useState('brainhole');
  const [memoImportTitle, setMemoImportTitle] = useState('从拆书库导入');

  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Chapter Detection State
  const [detectedChapters, setDetectedChapters] = useState<{ title: string; index: number }[]>([]);

  // Load saved state
  useEffect(() => {
    const savedInputCollapsed = StorageManager.get(`input_collapsed_${id}`);
    if (savedInputCollapsed === 'true') setIsInputCollapsed(true);

    const savedOutputCollapsed = StorageManager.get(`output_collapsed_${id}`);
    if (savedOutputCollapsed === 'true') setIsOutputCollapsed(true);
  }, [id]);

  // Load saved data on mount (Input/Output/MultiModels)
  useEffect(() => {
    setMounted(true);
    const effectiveId = id;

    const savedData = StorageManager.getJSON(STORAGE_KEYS.MODULE_INPUT(effectiveId));
    if (savedData) {
      setFormData(savedData);
    }

    const savedResult = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT(effectiveId));
    if (savedResult) {
      setResult(savedResult);
    }

    // Auto-fill from previous modules (only if the field is empty in saved data)
    if (id === 'module2') {
      const mod1 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module1'));
      if (mod1 && !savedData?.module1Output) setFormData(prev => ({ ...prev, module1Output: mod1 }));
    } else if (id === 'module2_5') {
      const mod2 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2'));
      if (mod2 && !savedData?.module2Output) setFormData(prev => ({ ...prev, module2Output: mod2 }));

      // Try to auto-parse plot table, foreshadowing, and pacing from Module 2 if possible
      if (mod2) {
        const plotTableMatch = mod2.match(/情节分布表[\s\S]*?(?=###|$)/);
        const foreshadowMatch = mod2.match(/伏笔清单[\s\S]*?(?=###|$)/);
        const pacingMatch = mod2.match(/节奏表[\s\S]*?(?=###|$)/);

        if (plotTableMatch && !savedData?.plotTable) setFormData(prev => ({ ...prev, plotTable: plotTableMatch[0] }));
        if (foreshadowMatch && !savedData?.foreshadowingList) setFormData(prev => ({ ...prev, foreshadowingList: foreshadowMatch[0] }));
        if (pacingMatch && !savedData?.pacingTable) setFormData(prev => ({ ...prev, pacingTable: pacingMatch[0] }));
      }
    } else if (id === 'module3') {
      const mod2 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2'));
      const mod25 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2_5'));
      if (mod2 && !savedData?.module2Output) setFormData(prev => ({ ...prev, module2Output: mod2 }));
      if (mod25 && !savedData?.module2_5Output) setFormData(prev => ({ ...prev, module2_5Output: mod25 }));
    } else if (id === 'module8') {
      // Auto-fill from Module 7 (Editor) or Module 4 (Bulk Gen), only if empty
      const mod7Content = StorageManager.get(STORAGE_KEYS.MODULE7_CONTENT);
      const mod4Content = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module4'));

      if (!savedData?.articleContent) {
        if (mod7Content) {
          setFormData(prev => ({ ...prev, articleContent: mod7Content }));
        } else if (mod4Content) {
          setFormData(prev => ({ ...prev, articleContent: mod4Content }));
        }
      }
    }

    // Load Multi-Model settings
    const savedMultiMode = StorageManager.get(`multi_mode_${effectiveId}`);
    if (savedMultiMode === 'true') setIsMultiModelMode(true);

    const savedMultiModels = StorageManager.getJSON(`multi_models_${effectiveId}`);
    if (savedMultiModels) setMultiModels(savedMultiModels);

    const savedMultiResults = StorageManager.getJSON(`multi_results_${effectiveId}`);
    if (savedMultiResults) setMultiModelResults(savedMultiResults);

    // Initialize display order
    const savedModels = StorageManager.getJSON(`multi_models_${effectiveId}`) || [];
    const initialOrder = ['main', ...savedModels.map((m: MultiModelConfig) => m.id)];
    setDisplayOrder(initialOrder);

  }, [id]);

  // Re-attach streaming generation when route changes and keep draft output updated
  useEffect(() => {
    const effectiveId = id;
    const existing = moduleGenerationManager.getMainTask(effectiveId);
    if (existing?.status === 'running') {
      setGeneratingIds((prev) => {
        if (!prev.includes('main')) return [...prev, 'main'];
        return prev;
      });
    }

    const unsub = moduleGenerationManager.subscribeMain(effectiveId, (task) => {
      setResult(task.content);
      setGeneratingIds((prev) => {
        let next = prev;
        if (task.status === 'running') {
          if (!prev.includes('main')) next = [...prev, 'main'];
          setLoading(true);
          return next;
        }
        next = prev.filter((pid) => pid !== 'main');
        if (next.length === 0) {
          setLoading(false);
        }
        return next;
      });
    });

    return () => {
      unsub();
    };
  }, [id]);

  // Load Prompt Templates (Depends on id)
  useEffect(() => {
    const effectiveId = id;
    let cancelled = false;

    (async () => {
      const savedTemplates = await StorageManager.getJSONAsync(`prompt_templates_${effectiveId}`);
      if (cancelled) return;

      if (savedTemplates && Array.isArray(savedTemplates)) {
        setPromptTemplates(savedTemplates);
      } else {
        setPromptTemplates([]);
      }

      const savedSelectedIds = await StorageManager.getJSONAsync(`selected_prompt_ids_${effectiveId}`);
      if (cancelled) return;
      if (savedSelectedIds && Array.isArray(savedSelectedIds)) {
        setSelectedPromptIds(savedSelectedIds);
      } else {
        setSelectedPromptIds([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!showMemoImportModal) return;
    let cancelled = false;
    (async () => {
      const items = (await StorageManager.getJSONAsync(`memo_data_${memoImportCategory}`)) || [];
      if (cancelled) return;
      const sorted = Array.isArray(items)
        ? [...items].sort((a: MemoItem, b: MemoItem) => (b.lastModified || 0) - (a.lastModified || 0))
        : [];
      setMemoImportItems(sorted);
      setSelectedMemoImportItem(sorted[0] || null);
      setMemoImportSearchTerm('');
      setMemoImportMode('replace');
    })();
    return () => {
      cancelled = true;
    };
  }, [showMemoImportModal, memoImportCategory]);

  const extractChapterMarkers = (content: string) => {
    const chapters: { title: string; index: number }[] = [];
    if (!content) return chapters;
    const regex = /(?:^\s*|\n\s*)(第[0-9零一二三四五六七八九十百千万]+[章卷]|[Cc]hapter\s*\d+|[0-9]+\.|序章|楔子)(?:[ \t]+.*)?(?=\n|$)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      chapters.push({
        title: match[0].trim(),
        index: match.index
      });
    }
    return chapters;
  };

  useEffect(() => {
    if (id === 'module0_5' && formData.novelContent) {
      setDetectedChapters(extractChapterMarkers(formData.novelContent));
    } else {
      setDetectedChapters([]);
    }
  }, [formData.novelContent, id]);

  const handleInputChange = (key: string, value: any) => {
    const effectiveId = id;
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    StorageManager.setJSON(STORAGE_KEYS.MODULE_INPUT(effectiveId), newData);
  };

  const handleOpenMemoImport = (category: 'dismantling' | 'brainstorm', title: string, targetKey: string) => {
    setMemoImportCategory(category);
    setMemoImportTitle(title);
    setMemoImportTargetKey(targetKey);
    setShowMemoImportModal(true);
  };

  const handleApplyMemoImport = () => {
    if (!selectedMemoImportItem) return;
    const imported = selectedMemoImportItem.content || '';
    const current = String(formData[memoImportTargetKey] || '');
    const nextValue = memoImportMode === 'append'
      ? (current.trim() ? `${current}\n\n${imported}` : imported)
      : imported;
    handleInputChange(memoImportTargetKey, nextValue);
    setShowMemoImportModal(false);
  };

  // ========== PageSkill for AI Agent Control ==========
  // This allows the AI assistant (FloatingAI) to control this module programmatically
  const handlePageSkill = useCallback(async (payload: { action: string; key?: string; value?: any }) => {
    const { action, key, value } = payload;
    const effectiveId = id;

    switch (action) {
      case 'set_input':
        // Set a specific input field
        if (key) {
          handleInputChange(key, value);
        }
        break;

      case 'get_input':
        // Return input data (single field or all)
        if (key) {
          return formData[key];
        }
        return formData;

      case 'get_output':
        // Return current output
        return result;

      case 'generate':
        // Trigger generation (handleGenerate is defined later, so we call it via a wrapper)
        // We'll use a ref or state to trigger it
        document.dispatchEvent(new CustomEvent('ai-trigger-generate', { detail: { moduleId: effectiveId } }));
        break;

      case 'clear_input':
        // Clear all input
        setFormData({});
        StorageManager.remove(STORAGE_KEYS.MODULE_INPUT(effectiveId));
        break;

      case 'clear_output':
        // Clear output
        setResult('');
        StorageManager.remove(STORAGE_KEYS.MODULE_OUTPUT(effectiveId));
        break;

      case 'get_module_info':
        // Return module metadata
        return {
          moduleId: effectiveId,
          title: moduleConfig?.title || '',
          description: moduleConfig?.description || '',
          hasInput: Object.keys(formData).length > 0,
          hasOutput: !!result,
          isLoading: loading,
        };

      case 'get_status':
        // Return current status
        return {
          isLoading: loading,
          hasError: !!error,
          error: error,
          inputFields: Object.keys(formData),
          outputLength: result.length,
        };

      default:
        console.warn(`Unknown PageSkill action: ${action}`);
    }
  }, [id, formData, result, loading, error, moduleConfig, handleInputChange]);

  // Register PageSkill on mount, unregister on unmount
  useEffect(() => {
    // Skip for special modules that have their own implementations
    if (isModule7 || isModule9 || isModule10 || isModule11) return;

    registerPageSkill('page_control', handlePageSkill);
    return () => unregisterPageSkill('page_control');
  }, [registerPageSkill, unregisterPageSkill, handlePageSkill, isModule7, isModule9, isModule10, isModule11]);

  // Listen for AI trigger generate event
  useEffect(() => {
    const handleTriggerGenerate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.moduleId === id) {
        // We need to call handleGenerate, but it's defined later in the file
        // Using a DOM event dispatch pattern to trigger the button click
        const generateBtn = document.querySelector('[data-generate-btn]') as HTMLButtonElement;
        if (generateBtn && !generateBtn.disabled) {
          generateBtn.click();
        }
      }
    };
    document.addEventListener('ai-trigger-generate', handleTriggerGenerate);
    return () => document.removeEventListener('ai-trigger-generate', handleTriggerGenerate);
  }, [id]);
  // Sync displayOrder when multiModels changes
  useEffect(() => {
    setDisplayOrder(prev => {
      const currentIds = new Set(['main', ...multiModels.map(m => m.id)]);
      // Keep existing order for valid IDs
      const newOrder = prev.filter(id => currentIds.has(id));
      // Add new IDs to the end
      currentIds.forEach(id => {
        if (!newOrder.includes(id)) {
          newOrder.push(id);
        }
      });
      return newOrder;
    });
  }, [multiModels]);

  if (isModule7) return <Module7Editor />;
  if (isModule9) return <Module9Alchemy />;
  if (isModule10) return <Module10Manager />;
  if (isModule11) return <Module11Memo />;

  if (!moduleConfig) {
    return <div>未找到该模块</div>;
  }

  const handleToggleMultiMode = () => {
    const effectiveId = id;
    const newValue = !isMultiModelMode;
    setIsMultiModelMode(newValue);
    // When enabling multi-mode, maybe we want to see inputs?
    if (newValue) {
      setIsInputCollapsed(false);
      setIsOutputCollapsed(false);
    }
    StorageManager.set(`multi_mode_${effectiveId}`, String(newValue));
  };

  const handleAddMultiModel = () => {
    const effectiveId = id;
    const newModel: MultiModelConfig = {
      id: Date.now().toString(),
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'deepseek-ai/DeepSeek-V3'
    };
    const newModels = [...multiModels, newModel];
    setMultiModels(newModels);
    StorageManager.setJSON(`multi_models_${effectiveId}`, newModels);
  };

  const handleUpdateMultiModel = (modelId: string, field: keyof MultiModelConfig, value: string) => {
    const effectiveId = id;
    const newModels = multiModels.map(m =>
      m.id === modelId ? { ...m, [field]: value } : m
    );
    setMultiModels(newModels);
    StorageManager.setJSON(`multi_models_${effectiveId}`, newModels);
  };

  const handleDeleteMultiModel = (modelId: string) => {
    const effectiveId = id;
    const newModels = multiModels.filter(m => m.id !== modelId);
    setMultiModels(newModels);
    StorageManager.setJSON(`multi_models_${effectiveId}`, newModels);

    const newResults = { ...multiModelResults };
    delete newResults[modelId];
    setMultiModelResults(newResults);
    StorageManager.setJSON(`multi_results_${effectiveId}`, newResults);
  };

  // 提示词管理功能
  const handlePromptImport = () => {
    setViewMode('list');
    setShowPromptModal(true);
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    const effectiveId = id;
    // Toggle selection logic
    let newSelectedIds = [...selectedPromptIds];

    if (newSelectedIds.includes(template.id)) {
      // If already selected, deselect it (unless it's the last one, maybe keep at least one?)
      // Allowing deselect all is fine, will fallback to empty prompt or default
      newSelectedIds = newSelectedIds.filter(id => id !== template.id);
    } else {
      // Add to selection
      newSelectedIds.push(template.id);
    }

    setSelectedPromptIds(newSelectedIds);
    StorageManager.setJSON(`selected_prompt_ids_${effectiveId}`, newSelectedIds);

    // Combine prompts
    const selectedTemplates = newSelectedIds
      .map(sid => promptTemplates.find(t => t.id === sid))
      .filter((t): t is PromptTemplate => !!t);

    const combinedPrompt = selectedTemplates.map(t => t.content).join('\n\n---\n\n');
    StorageManager.set(`custom_prompt_${effectiveId}`, combinedPrompt);

    // Don't close modal automatically in multi-select mode
    // setShowPromptModal(false);

    // 自动勾选自定义
    if (effectiveId === 'module0_5') {
      const currentAnalysis = formData.analysisType || [];
      const currentArray = Array.isArray(currentAnalysis) ? currentAnalysis : (typeof currentAnalysis === 'string' ? currentAnalysis.split('、') : []);

      if (!currentArray.includes('自定义')) {
        handleInputChange('analysisType', [...currentArray, '自定义']);
      }
    }
  };

  const handleApplySelection = () => {
    setShowPromptModal(false);
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setViewMode('edit');
  };

  const handleDeleteTemplate = (templateId: string) => {
    const effectiveId = id;
    if (confirm('确定要删除这个模板吗？')) {
      const newTemplates = promptTemplates.filter(t => t.id !== templateId);
      setPromptTemplates(newTemplates);
      StorageManager.setJSON(`prompt_templates_${effectiveId}`, newTemplates);

      // Also remove from selection if present and update combined prompt
      if (selectedPromptIds.includes(templateId)) {
        const newSelectedIds = selectedPromptIds.filter(id => id !== templateId);
        setSelectedPromptIds(newSelectedIds);
        StorageManager.setJSON(`selected_prompt_ids_${effectiveId}`, newSelectedIds);

        // Re-calculate combined prompt
        const selectedTemplates = newSelectedIds
          .map(sid => newTemplates.find(t => t.id === sid))
          .filter((t): t is PromptTemplate => !!t);

        const combinedPrompt = selectedTemplates.map(t => t.content).join('\n\n---\n\n');
        StorageManager.set(`custom_prompt_${effectiveId}`, combinedPrompt);
      }
    }
  };

  const handleAddNewTemplate = () => {
    setEditingTemplate({
      id: Date.now().toString(),
      title: '新模板',
      content: '',
      lastModified: Date.now()
    });
    setViewMode('edit');
  };

  const handleSaveTemplate = () => {
    const effectiveId = id;
    if (!editingTemplate) return;

    let newTemplates = [...promptTemplates];
    const index = newTemplates.findIndex(t => t.id === editingTemplate.id);

    if (index >= 0) {
      newTemplates[index] = { ...editingTemplate, lastModified: Date.now() };
    } else {
      newTemplates.push({ ...editingTemplate, lastModified: Date.now() });
    }

    setPromptTemplates(newTemplates);
    StorageManager.setJSON(`prompt_templates_${effectiveId}`, newTemplates);

    // If the edited template is currently selected, update the active combined prompt
    if (selectedPromptIds.includes(editingTemplate.id)) {
      const selectedTemplates = selectedPromptIds
        .map(sid => newTemplates.find(t => t.id === sid))
        .filter((t): t is PromptTemplate => !!t);

      const combinedPrompt = selectedTemplates.map(t => t.content).join('\n\n---\n\n');
      StorageManager.set(`custom_prompt_${effectiveId}`, combinedPrompt);
    }

    setViewMode('list');
  };

  const handlePromptExport = () => {
    const effectiveId = id;
    const promptData = {
      moduleId: effectiveId,
      moduleName: PROMPTS[effectiveId]?.title || moduleConfig.title,
      templates: promptTemplates,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(promptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_library_${effectiveId}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePromptFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const effectiveId = id;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);

          // 支持旧版单一导入和新版批量导入
          let newTemplatesToAdd: PromptTemplate[] = [];

          if (importedData.templates && Array.isArray(importedData.templates)) {
            newTemplatesToAdd = importedData.templates;
          } else if (importedData.systemPrompt) {
            newTemplatesToAdd = [{
              id: Date.now().toString(),
              title: '导入的模板',
              content: importedData.systemPrompt,
              lastModified: Date.now()
            }];
          }

          if (newTemplatesToAdd.length > 0) {
            const updatedTemplates = [...promptTemplates, ...newTemplatesToAdd];
            setPromptTemplates(updatedTemplates);
            StorageManager.setJSON(`prompt_templates_${effectiveId}`, updatedTemplates);

            // 如果是单一个导入，直接应用
            if (newTemplatesToAdd.length === 1 && importedData.systemPrompt) {
              handleSelectTemplate(newTemplatesToAdd[0]);
            }

            alert(`成功导入 ${newTemplatesToAdd.length} 个模板`);
          }
        } catch {
          alert('文件格式错误，请选择有效的提示词文件');
        }
      };
      reader.readAsText(file);
    }
  };

  // 获取当前使用的提示词
  const getCurrentPrompt = async () => {
    const effectiveId = id;
    // Use getAsync to ensure we retrieve full content even if it's large (stored in IndexedDB)
    const savedPrompt = await StorageManager.getAsync(`custom_prompt_${effectiveId}`);
    // Explicitly check for null, so empty string is respected (user cleared the prompt)
    if (savedPrompt !== null && savedPrompt !== undefined) {
      return savedPrompt;
    }
    return '';
  };

  // 更好的排序键提取
  const getFileSortKey = (filename: string): number => {
    // 1. 尝试匹配 "第X章" 或 "Chapter X"
    const chapterMatch = filename.match(/(?:第|Chapter)\s*([0-9零一二三四五六七八九十百千万]+)(?:章|\s)/i);
    if (chapterMatch) {
      const numStr = chapterMatch[1];
      // 如果是阿拉伯数字
      if (/^\d+$/.test(numStr)) {
        return parseInt(numStr, 10);
      }
      // 如果是中文数字
      try {
        const map: Record<string, number> = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 百: 100, 千: 1000 };
        let val = 0;
        let unit = 1;
        for (let i = numStr.length - 1; i >= 0; i--) {
          const c = numStr[i];
          const n = map[c];
          if (n === undefined) continue;
          if (n >= 10) {
            unit = n;
            if (i === 0) val += unit;
          } else {
            val += n * unit;
          }
        }
        return val;
      } catch {
        return 0;
      }
    }

    // 2. 如果没有章节号，尝试提取文件名中的第一个数字
    const numMatch = filename.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }

    return -1; // 无数字，排在最前或最后
  };

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    if (id !== 'module0_5' && id !== 'module8') return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  }

  const processFiles = async (files: FileList) => {
    // 转换为数组以便处理
    const fileArray = Array.from(files);

    // 过滤非txt文件
    const txtFiles = fileArray.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
    if (txtFiles.length === 0) {
      alert('请选择 .txt 格式的文件');
      return;
    }

    if (txtFiles.length < fileArray.length) {
      alert(`已过滤 ${fileArray.length - txtFiles.length} 个非 txt 文件`);
    }

    // 排序文件
    txtFiles.sort((a, b) => {
      const keyA = getFileSortKey(a.name);
      const keyB = getFileSortKey(b.name);

      // 如果都找到了数字键
      if (keyA !== -1 && keyB !== -1) {
        return keyA - keyB;
      }

      // 如果只有一个找到
      if (keyA !== -1) return 1; // 有数字的放后面？通常是按顺序，假设无数字的是序章
      if (keyB !== -1) return -1;

      // 都没有数字，按文件名自然排序
      return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
    });

    setLoading(true);
    try {
      const texts = await Promise.all(txtFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            let content = '';

            // 尝试 UTF-8 解码
            try {
              const decoder = new TextDecoder('utf-8', { fatal: true });
              content = decoder.decode(buffer);
            } catch {
              // 如果 UTF-8 解码失败，尝试 GBK
              try {
                const decoder = new TextDecoder('gbk');
                content = decoder.decode(buffer);
              } catch {
                // 如果 GBK 也失败，回退到默认（忽略错误）
                const decoder = new TextDecoder('utf-8');
                content = decoder.decode(buffer);
              }
            }

            // 可以选择在这里加上文件名作为分割线
            const separator = txtFiles.length > 1 ? `\n\n### ${file.name.replace('.txt', '')}\n\n` : '';
            resolve(separator + content);
          };
          reader.readAsArrayBuffer(file);
        });
      }));

      const combinedText = texts.join('\n'); // 已经加了 separator

      if (id === 'module0_5') {
        const newContent = formData.novelContent
          ? formData.novelContent + '\n' + combinedText
          : combinedText.trim();
        handleInputChange('novelContent', newContent);
      } else if (id === 'module8') {
        const newContent = formData.articleContent
          ? formData.articleContent + '\n' + combinedText
          : combinedText.trim();
        handleInputChange('articleContent', newContent);
      }

    } catch (error) {
      console.error('File read error:', error);
      alert('读取文件时出错');
    } finally {
      setLoading(false);
    }
  };

  async function handleNovelContentImport(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    // 清空 input value，允许重复选择同一文件
    event.target.value = '';
  }

  const handleReset = () => {
    if (confirm('确定要清空当前模块的输入和输出缓存吗？此操作不可撤销。')) {
      setFormData({});
      setResult('');
      StorageManager.remove(STORAGE_KEYS.MODULE_INPUT(id));
      StorageManager.remove(STORAGE_KEYS.MODULE_OUTPUT(id));
    }
  };

  const handleSaveProject = () => {
    const projectData = {
      input: formData,
      output: result, // Main result
      multiModel: {
        enabled: isMultiModelMode,
        models: multiModels,
        results: multiModelResults,
        displayOrder: displayOrder,
        lockedOutputs: lockedOutputs
      },
      timestamp: new Date().toISOString(),
      moduleId: id
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novel_project_${id}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    let content = `# ${moduleConfig.title} - 输出结果\n\n`;
    content += `导出时间: ${new Date().toLocaleString()}\n\n`;

    // Iterate through display order to maintain visual sequence
    displayOrder.forEach((modelId, index) => {
      // Skip hidden/discarded outputs
      if (hiddenOutputs.includes(modelId)) return;

      content += `--------------------------------------------------\n`;

      if (modelId === 'main') {
        const modelName = apiConfigStatus.model || '默认模型';
        content += `### [${index + 1}] 主模型 (${modelName})\n`;
        if (lockedOutputs.includes('main')) content += `[已锁定]\n`;
        content += `\n${result || '(无内容)'}\n\n`;
      } else {
        const mConfig = multiModels.find(m => m.id === modelId);
        if (mConfig) {
          content += `### [${index + 1}] 模型 ${index + 1} (${mConfig.model})\n`;
          if (lockedOutputs.includes(modelId)) content += `[已锁定]\n`;
          content += `\n${multiModelResults[modelId] || '(无内容)'}\n\n`;
        }
      }
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novel_output_${id}_${new Date().getTime()}.md`; // Use .md for better readability, but it's text compatible
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    // Replaced by handleExportTxt for better multi-model support, 
    // or we can keep it but make it export the same aggregated content in HTML.
    // For now, let's redirect to handleExportTxt as it's more versatile for writers.
    handleExportTxt();
  };

  // API 配置状态检查
  const getAPIConfigStatus = () => {
    if (!mounted) {
      return {
        valid: false,
        errors: [],
        warnings: [],
        provider: '',
        apiKey: '未设置',
        baseUrl: '',
        model: ''
      };
    }

    const effectiveId = id;
    const isPlanningModule = ['module1', 'module2', 'module2_5'].includes(effectiveId);
    const isBigModelModule = effectiveId === 'module0_5';

    let apiKey = '';
    let baseUrl = '';
    let model = '';

    if (isBigModelModule) {
      apiKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
      baseUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
      model = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL) || 'deepseek-ai/DeepSeek-V3';
    } else if (isPlanningModule) {
      apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
      baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
      model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';
    } else {
      apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
      baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
      model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-R1';
    }

    const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
    const providerInfo = APIConfigValidator.getProviderInfo(baseUrl);

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      provider: providerInfo.provider,
      apiKey: apiKey ? '已设置' : '未设置',
      baseUrl: baseUrl,
      model: model
    };
  };

  const apiConfigStatus = getAPIConfigStatus();

  const regenerateModelWithStream = async (modelId: string) => {
    setGeneratingIds(prev => [...prev, modelId]);

    try {
      const effectiveId = id;
      const currentModuleConfig = PROMPTS[effectiveId];

      const isPlanningModule = ['module1', 'module2', 'module2_5'].includes(effectiveId);
      const isBigModelModule = effectiveId === 'module0_5';

      const userPrompt = currentModuleConfig.userTemplate(formData);
      const systemPrompt = await getCurrentPrompt();

      if (modelId === 'main') {
        let apiKey = '';
        let baseUrl = '';
        let model = '';

        if (isBigModelModule) {
          apiKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          baseUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
          model = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL) || 'deepseek-ai/DeepSeek-V3';
        } else if (isPlanningModule) {
          apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
          model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';
        } else {
          apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
          model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-R1';
        }

        if (model === 'deepseek-ai/DeepSeek-V3') {
          model = 'deepseek-ai/DeepSeek-R1';
        }

        setResult(''); // Clear previous result
        const fullText = await generateAIContentStream(
          apiKey,
          systemPrompt,
          userPrompt,
          baseUrl,
          model,
          (content) => {
            const cleanText = content.replace(/#\*|#\s\*/g, '');
            setResult(cleanText);
            StorageManager.set(STORAGE_KEYS.MODULE_OUTPUT(effectiveId), cleanText);
          }
        );

        const cleanFullText = fullText.replace(/#\*|#\s\*/g, '');
        setResult(cleanFullText);
        StorageManager.set(STORAGE_KEYS.MODULE_OUTPUT(effectiveId), cleanFullText);
      } else {
        const mConfig = multiModels.find(m => m.id === modelId);
        if (mConfig && mConfig.apiKey) {
          setMultiModelResults(prev => ({ ...prev, [modelId]: '' })); // Clear previous result
          const fullText = await generateAIContentStream(
            mConfig.apiKey,
            systemPrompt,
            userPrompt,
            mConfig.baseUrl,
            mConfig.model,
            (content) => {
              const cleanText = content.replace(/#\*|#\s\*/g, '');
              setMultiModelResults(prev => {
                const next = { ...prev, [modelId]: cleanText };
                StorageManager.setJSON(`multi_results_${effectiveId}`, next);
                return next;
              });
            }
          );

          const cleanFullText = fullText.replace(/#\*|#\s\*/g, '');
          setMultiModelResults(prev => {
            const next = { ...prev, [modelId]: cleanFullText };
            StorageManager.setJSON(`multi_results_${effectiveId}`, next);
            return next;
          });
        }
      }
    } catch (err: any) {
      const errorString = err.message || String(err);
      if (err.name === 'AbortError' || errorString.includes('BodyStreamBuffer was aborted') || errorString.includes('The user aborted a request')) {
        return;
      }
      console.error(`Error regenerating model ${modelId}:`, err);
      if (modelId === 'main') {
        setError(err.message);
      } else {
        setMultiModelResults(prev => {
          const next = { ...prev, [modelId]: `Error: ${err.message}` };
          StorageManager.setJSON(`multi_results_${id}`, next);
          return next;
        });
      }
    } finally {
      setGeneratingIds(prev => prev.filter(pid => pid !== modelId));
    }
  };

  const handleDiscardAndRegenerate = (modelId: string) => {
    // If locked, just hide it (remove from displayOrder temporarily or use hiddenOutputs logic if we want to persist hiding)
    if (lockedOutputs.includes(modelId)) {
      setHiddenOutputs(prev => [...prev, modelId]);
      return;
    }

    // If NOT locked: Move to end of display order and regenerate
    setDisplayOrder(prev => {
      const newOrder = prev.filter(id => id !== modelId);
      newOrder.push(modelId);
      return newOrder;
    });

    // 2. Trigger regeneration
    regenerateModelWithStream(modelId);
  };

  const handleLockOutput = (modelId: string) => {
    if (lockedOutputs.includes(modelId)) {
      setLockedOutputs(prev => prev.filter(id => id !== modelId));
    } else {
      setLockedOutputs(prev => [...prev, modelId]);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    // Only generate for models that are NOT locked
    const allIds = isMultiModelMode ? ['main', ...multiModels.map(m => m.id)] : ['main'];
    const idsToGenerate = allIds.filter(id => !lockedOutputs.includes(id));

    setGeneratingIds(idsToGenerate);

    try {
      const effectiveId = id;
      const currentModuleConfig = PROMPTS[effectiveId];

      const isPlanningModule = ['module1', 'module2', 'module2_5'].includes(effectiveId);
      const isBigModelModule = effectiveId === 'module0_5';

      let apiKey = '';
      let baseUrl = '';
      let model = '';

      if (isBigModelModule) {
        apiKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        baseUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        model = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL) || 'deepseek-ai/DeepSeek-V3';
      } else if (isPlanningModule) {
        apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';
      } else {
        apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-R1';
      }

      // API 配置验证
      const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
      if (!validation.valid) {
        throw new Error(`API 配置错误：${validation.errors.join('，')}`);
      }

      // 显示警告信息（如果有）
      if (validation.warnings.length > 0) {
        console.warn('API 配置警告：', validation.warnings);
      }

      const userPrompt = currentModuleConfig.userTemplate(formData);
      const systemPrompt = await getCurrentPrompt(); // 使用自定义提示词
      if (effectiveId === 'module3' && !systemPrompt.trim()) {
        alert('没有设置提示词');
        setGeneratingIds([]);
        setLoading(false);
        return;
      }
      // Remove deepseek-V3 default
      if (model === 'deepseek-ai/DeepSeek-V3') {
        model = 'deepseek-ai/DeepSeek-R1';
      }

      const promises: Promise<any>[] = [];

      // Main Model Generation
      // No need to call manually here if using generatingIds logic, 
      // BUT current implementation logic in handleGenerate does call all.
      // We should keep handleGenerate logic mostly as is for batch, but update loading states.

      if (idsToGenerate.includes('main')) {
        setResult(''); // Clear previous result
        const mainPromise = moduleGenerationManager
          .startMainTask({
            moduleId: effectiveId,
            apiKey,
            systemPrompt,
            userPrompt,
            baseUrl,
            model
          });
        promises.push(mainPromise);
      }

      // Multi-Model Generation
      if (isMultiModelMode && multiModels.length > 0) {
        multiModels.forEach(mConfig => {
          if (!idsToGenerate.includes(mConfig.id)) return;

          if (!mConfig.apiKey) {
            setMultiModelResults(prev => {
              const next = { ...prev, [mConfig.id]: 'Error: API Key is missing' };
              StorageManager.setJSON(`multi_results_${effectiveId}`, next);
              return next;
            });
            setGeneratingIds(prev => prev.filter(pid => pid !== mConfig.id));
            return;
          }

          // Clear previous result for this model
          setMultiModelResults(prev => ({ ...prev, [mConfig.id]: '' }));

          const p = generateAIContentStream(mConfig.apiKey, systemPrompt, userPrompt, mConfig.baseUrl, mConfig.model, (text) => {
            const cleanText = text.replace(/#\*|#\s\*/g, '');
            setMultiModelResults(prev => {
              const next = { ...prev, [mConfig.id]: cleanText };
              StorageManager.setJSON(`multi_results_${effectiveId}`, next);
              return next;
            });
          })
            .then(text => {
              const cleanText = text.replace(/#\*|#\s\*/g, '');
              setMultiModelResults(prev => {
                const next = { ...prev, [mConfig.id]: cleanText };
                StorageManager.setJSON(`multi_results_${effectiveId}`, next);
                return next;
              });
              return cleanText;
            })
            .catch(err => {
              const errorString = err.message || String(err);
              if (err.name === 'AbortError' || errorString.includes('BodyStreamBuffer was aborted') || errorString.includes('The user aborted a request')) {
                return null;
              }
              setMultiModelResults(prev => {
                const next = { ...prev, [mConfig.id]: `Error: ${err.message}` };
                StorageManager.setJSON(`multi_results_${effectiveId}`, next);
                return next;
              });
              // Resolve error so Promise.all doesn't fail if one sub-model fails
              return null;
            })
            .finally(() => {
              setGeneratingIds(prev => prev.filter(pid => pid !== mConfig.id));
            });
          promises.push(p);
        });
      }

      await Promise.all(promises);
    } catch (err: any) {
      const errorString = err.message || String(err);
      if (err.name === 'AbortError' || errorString.includes('BodyStreamBuffer was aborted') || errorString.includes('The user aborted a request')) {
        setLoading(false);
        return;
      }

      let errorMessage = err.message;

      // 提供更友好的错误提示
      if (errorMessage.includes('API Key is missing')) {
        errorMessage = 'API 密钥未设置。请在设置页面配置您的 API 密钥。';
      } else if (errorMessage.includes('API 认证失败 (401)')) {
        errorMessage = 'API 密钥无效。请检查您在设置中配置的 API 密钥是否正确。';
      } else if (errorMessage.includes('API 权限错误 (403)')) {
        errorMessage = 'API 权限不足。您的 API 密钥可能没有访问该模型或服务的权限。请检查 API 配置或联系服务提供商。';
      } else if (errorMessage.includes('API 请求频率限制 (429)')) {
        errorMessage = '请求过于频繁。请稍后再试。';
      } else if (errorMessage.includes('网络连接失败')) {
        errorMessage = '网络连接失败。请检查您的网络连接或 API 服务地址是否正确。';
      } else if (errorMessage.includes('Base URL is missing')) {
        errorMessage = 'API 服务地址未配置。请在设置页面配置正确的 API 服务地址。';
      } else if (errorMessage.includes('Model is missing')) {
        errorMessage = 'AI 模型未选择。请在设置页面选择要使用的 AI 模型。';
      }

      setError(errorMessage);
      console.error('AI Generation Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderInputs = (targetId: string = id) => {
    switch (targetId) {
      case 'module0_5':
        return (
          <>
            <div
              className={`relative ${isDragging ? 'ring-2 ring-daiqing ring-offset-2' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <TextArea label="小说内容/片段" value={formData.novelContent} onChange={(v) => handleInputChange('novelContent', v)} rows={8} placeholder="请粘贴需要分析的小说内容或片段，或将 TXT 文件拖入此处..." />
              {isDragging && (
                <div className="absolute inset-0 bg-daiqing/10 flex items-center justify-center rounded-lg border-2 border-dashed border-daiqing z-10 pointer-events-none backdrop-blur-sm">
                  <div className="text-daiqing font-medium flex flex-col items-center gap-2 font-serif">
                    <Upload className="w-8 h-8" />
                    <span>松开鼠标导入文件</span>
                  </div>
                </div>
              )}
              <div className="absolute top-0 right-0">
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".txt"
                    multiple
                    onChange={handleNovelContentImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="导入 TXT 文件 (支持多选)"
                  />
                  <button className="flex items-center gap-1 text-xs text-ink/60 hover:text-daiqing bg-paper hover:bg-daiqing/10 px-2 py-1 rounded transition-colors">
                    <Upload className="w-3 h-3" />
                    导入TXT
                  </button>
                </div>
              </div>
            </div>

            <Input label="小说书名" value={formData.novelTitle} onChange={(v) => handleInputChange('novelTitle', v)} placeholder="请输入书名（可选）" />

            {/* Chapter List Display */}
            {detectedChapters.length > 0 && (
              <div className="mt-4 border border-ink/10 rounded-lg overflow-hidden">
                <div className="bg-paper px-4 py-2 border-b border-ink/10 flex justify-between items-center">
                  <span className="text-sm font-medium text-ink font-serif">识别到的章节 ({detectedChapters.length})</span>
                </div>
                <div className="max-h-60 overflow-y-auto bg-white/50 p-2 custom-scrollbar">
                  <ul className="space-y-1">
                    {detectedChapters.map((chapter, index) => (
                      <li key={index} className="text-xs text-ink/80 px-2 py-1 hover:bg-paper rounded truncate flex items-center gap-2 transition-colors">
                        <span className="w-6 text-ink/40 text-right font-serif">{index + 1}.</span>
                        <span className="font-serif">{chapter.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        );
      case 'module1':
        return (
          <>
            <TextArea label="写出你的脑洞" value={formData.brainhole} onChange={(v) => handleInputChange('brainhole', v)} rows={6} placeholder="请详细描述你的脑洞想法..." />
            <Input label="核心元素" value={formData.elements} onChange={(v) => handleInputChange('elements', v)} placeholder="例如：医术、空间神器" />
            <Select label="目标受众" value={formData.audience} onChange={(v) => handleInputChange('audience', v)} options={['男频', '女频', '全年龄']} />
            <Select
              label="风格基调"
              value={formData.style}
              onChange={(v) => handleInputChange('style', Array.isArray(v) ? v.join('、') : v)}
              multiple={true}
              options={[
                // 玄幻奇幻
                '东方仙侠', '西方奇幻', '传统玄幻', '玄幻脑洞', '洪荒封神', '高武世界',
                // 都市现实
                '都市脑洞', '都市修真', '都市日常', '战神赘婿', '神豪', '鉴宝', '职场', '娱乐明星', '乡村种田', '年代文',
                // 科幻末世
                '科幻末世', '赛博朋克', '废土', '黑科技', '星际文明',
                // 悬疑灵异
                '悬疑灵异', '惊悚游戏', '盗墓探险', '推理破案', '克苏鲁',
                // 历史军事
                '历史穿越', '历史脑洞', '抗战谍战', '大秦', '大唐', '三国',
                // 游戏竞技
                '游戏体育', '网游电竞',
                // 衍生同人
                '动漫衍生', '同人小说', '诸天万界', '聊天群',
                // 女频特色
                '古代言情', '现代言情', '宫斗宅斗', '豪门总裁', '快穿系统', '纯爱',
                // 特殊流派
                '无限流', '无敌流', '迪化流', '系统流', '直播流', '无CP', '暗黑', '治愈', '搞笑'
              ]}
            />
            <Input label="限制条件" value={formData.constraints} onChange={(v) => handleInputChange('constraints', v)} placeholder="例如：无后宫、单女主" />
            <Input label="超长篇要求" value={formData.longReq} onChange={(v) => handleInputChange('longReq', v)} placeholder="例如：10个大阶段、必含番外" />
          </>
        );
      case 'module2':
        return (
          <>
            <TextArea label="模块1输出（脑洞方案）" value={formData.module1Output} onChange={(v) => handleInputChange('module1Output', v)} rows={5} />
            <Select label="开篇类型" value={formData.openingType} onChange={(v) => handleInputChange('openingType', v)} options={['万能冲突', '悬念做局', '人设做局', '日常乱做局', '自定义']} />
            {formData.openingType === '自定义' && (
              <Input
                label="自定义开篇类型详情"
                value={formData.customOpeningType}
                onChange={(v) => handleInputChange('customOpeningType', v)}
                placeholder="请输入自定义的开篇类型描述，例如：重生复仇开篇"
              />
            )}
            <Select label="情节密度" value={formData.density} onChange={(v) => handleInputChange('density', v)} options={['中密度（默认）', '高密度', '低密度']} />
            <Input label="必含情节" value={formData.requiredPlots} onChange={(v) => handleInputChange('requiredPlots', v)} placeholder="希望包含的具体情节" />
          </>
        );
      case 'module2_5':
        return (
          <>
            <TextArea label="模块2输出（大纲）" value={formData.module2Output} onChange={(v) => handleInputChange('module2Output', v)} rows={5} />
            <TextArea label="情节分布表" value={formData.plotTable} onChange={(v) => handleInputChange('plotTable', v)} rows={3} placeholder="在此粘贴情节分布表" />
            <TextArea label="伏笔清单" value={formData.foreshadowingList} onChange={(v) => handleInputChange('foreshadowingList', v)} rows={3} placeholder="在此粘贴伏笔清单" />
            <TextArea label="节奏表" value={formData.pacingTable} onChange={(v) => handleInputChange('pacingTable', v)} rows={3} placeholder="在此粘贴节奏表" />
            <Input label="章节范围" value={formData.chapterRange} onChange={(v) => handleInputChange('chapterRange', v)} placeholder="1-50" />
          </>
        );
      case 'module3':
        return (
          <>
            <TextArea label="模块2输出（大纲）" value={formData.module2Output} onChange={(v) => handleInputChange('module2Output', v)} rows={4} />
            <TextArea label="模块2.5输出（前3章细纲）" value={formData.module2_5Output} onChange={(v) => handleInputChange('module2_5Output', v)} rows={4} />
            <Select label="开篇类型" value={formData.openingType} onChange={(v) => handleInputChange('openingType', v)} options={['万能冲突', '悬念做局', '人设做局', '日常乱做局', '自定义']} />
            {formData.openingType === '自定义' && (
              <Input
                label="自定义开篇类型详情"
                value={formData.customOpeningType}
                onChange={(v) => handleInputChange('customOpeningType', v)}
                placeholder="请输入自定义的开篇类型描述，例如：重生复仇开篇"
              />
            )}
            <Select label="分镜头风格" value={formData.shotStyle} onChange={(v) => handleInputChange('shotStyle', v)} options={['电影级', '简洁级']} />
            <TextArea label="核心设定" value={formData.coreSettings} onChange={(v) => handleInputChange('coreSettings', v)} rows={3} placeholder="记忆点、人物设定" />
          </>
        );
      case 'module4':
        const [startChapter, endChapter] = (formData.chapterRange || '').split('-');
        return (
          <>
            <TextArea label="上一章内容" value={formData.previousContent} onChange={(v) => handleInputChange('previousContent', v)} rows={4} placeholder="已生成的最后一章内容" />
            <TextArea label="详细细纲" value={formData.module2_5Output} onChange={(v) => handleInputChange('module2_5Output', v)} rows={4} />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1 font-serif">起始章节</label>
                <input
                  type="number"
                  value={startChapter || ''}
                  onChange={(e) => handleInputChange('chapterRange', `${e.target.value}-${endChapter || ''}`)}
                  className="w-full px-3 py-2 bg-white/50 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none text-sm text-ink placeholder:text-ink/30 transition-all"
                  placeholder="例如：4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1 font-serif">结束章节</label>
                <input
                  type="number"
                  value={endChapter || ''}
                  onChange={(e) => handleInputChange('chapterRange', `${startChapter || ''}-${e.target.value}`)}
                  className="w-full px-3 py-2 bg-white/50 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none text-sm text-ink placeholder:text-ink/30 transition-all"
                  placeholder="例如：10"
                />
              </div>
            </div>

            <Input label="字数要求" value={formData.wordCount} onChange={(v) => handleInputChange('wordCount', v)} placeholder="3000" />
          </>
        );
      case 'module5':
        return (
          <>
            <TextArea label="模块1输出（脑洞方案）" value={formData.module1Output} onChange={(v) => handleInputChange('module1Output', v)} rows={4} />
            <Input label="原著信息" value={formData.originalInfo} onChange={(v) => handleInputChange('originalInfo', v)} placeholder="名称+风格（例如：诡秘之主 - 克苏鲁蒸汽朋克）" />
            <TextArea label="参考片段" value={formData.referenceFragment} onChange={(v) => handleInputChange('referenceFragment', v)} rows={4} placeholder="粘贴你想模仿的风格片段" />
            <Select label="仿写类型" value={formData.imitationType} onChange={(v) => handleInputChange('imitationType', v)} options={['大纲', '细纲', '开篇', '后续章节']} />
            <Input label="范围/字数" value={formData.rangeOrWordCount} onChange={(v) => handleInputChange('rangeOrWordCount', v)} placeholder="例如：第1-3章 或 3000字" />
            <TextArea label="结构参考" value={formData.structureRef} onChange={(v) => handleInputChange('structureRef', v)} rows={3} placeholder="例如：斗罗大陆的10个阶段" />
          </>
        );
      case 'module6':
        return (
          <>
            <TextArea label="初稿内容" value={formData.draft} onChange={(v) => handleInputChange('draft', v)} rows={8} placeholder="粘贴需要润色的文本" />
            <TextArea label="核心设定" value={formData.coreSettings} onChange={(v) => handleInputChange('coreSettings', v)} rows={3} />
            <TextArea label="修改后的大纲" value={formData.modifiedOutline} onChange={(v) => handleInputChange('modifiedOutline', v)} rows={3} />
            <Select label="润色风格" value={formData.polishStyle} onChange={(v) => handleInputChange('polishStyle', v)} options={['口语化', '文艺', '快节奏']} />
            <Input label="需修正的问题" value={formData.issuesToFix} onChange={(v) => handleInputChange('issuesToFix', v)} placeholder="例如：逻辑漏洞、语法、节奏" />
          </>
        );
      case 'module8':
        return (
          <>
            <div
              className={`relative ${isDragging ? 'ring-2 ring-daiqing ring-offset-2' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <TextArea label="待评审文章内容" value={formData.articleContent} onChange={(v) => handleInputChange('articleContent', v)} rows={15} placeholder="请粘贴需要评审的正文内容，或将 TXT 文件拖入此处..." />
              {isDragging && (
                <div className="absolute inset-0 bg-daiqing/10 flex items-center justify-center rounded-lg border-2 border-dashed border-daiqing z-10 pointer-events-none backdrop-blur-sm">
                  <div className="text-daiqing font-medium flex flex-col items-center gap-2 font-serif">
                    <Upload className="w-8 h-8" />
                    <span>松开鼠标导入文件</span>
                  </div>
                </div>
              )}
              <div className="absolute top-0 right-0">
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".txt"
                    multiple
                    onChange={handleNovelContentImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="导入 TXT 文件 (支持多选)"
                  />
                  <button className="flex items-center gap-1 text-xs text-ink/60 hover:text-daiqing bg-paper hover:bg-daiqing/10 px-2 py-1 rounded transition-colors">
                    <Upload className="w-3 h-3" />
                    导入TXT
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="题材类型" value={formData.genre} onChange={(v) => handleInputChange('genre', v)} placeholder="例如：玄幻、都市系统" />
              <Input label="目标受众" value={formData.audience} onChange={(v) => handleInputChange('audience', v)} placeholder="例如：男频爽文、女频甜宠" />
            </div>

            <Input label="核心卖点 (作者自述)" value={formData.sellingPoint} onChange={(v) => handleInputChange('sellingPoint', v)} placeholder="你认为这段内容的亮点是什么？" />
            <Input label="重点关注 (评审方向)" value={formData.focusArea} onChange={(v) => handleInputChange('focusArea', v)} placeholder="例如：节奏是否拖沓、主角人设是否崩坏" />
          </>
        );
      default:
        return <div className="text-gray-500 italic">该模块的表单尚未实现。</div>;
    }
  };

  const handleToggleInputCollapse = () => {
    const newValue = !isInputCollapsed;
    setIsInputCollapsed(newValue);
    if (newValue) setIsOutputCollapsed(false); // Open output if input closed
    StorageManager.set(`input_collapsed_${id}`, String(newValue));
  };

  const handleToggleOutputCollapse = () => {
    const newValue = !isOutputCollapsed;
    setIsOutputCollapsed(newValue);
    if (newValue) setIsInputCollapsed(false); // Open input if output closed
    StorageManager.set(`output_collapsed_${id}`, String(newValue));
  };

  const handleSaveToMemo = (e: React.MouseEvent, content: string, source: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 自动分类逻辑
    let category = 'foreshadowing'; // 默认归类到伏笔/拆书
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('人设') || lowerContent.includes('性格')) category = 'character';
    else if (lowerContent.includes('世界观') || lowerContent.includes('背景')) category = 'worldview';
    else if (lowerContent.includes('大纲') || lowerContent.includes('结构')) category = 'technique';
    else if (lowerContent.includes('金手指') || lowerContent.includes('系统')) category = 'setting';

    const newItem = {
      id: Date.now().toString(),
      title: `拆书分析: ${source}`,
      content: content,
      lastModified: Date.now(),
      tags: ['自动导入', '拆书结果']
    };

    const savedItems = StorageManager.getJSON(`memo_data_${category}`) || [];
    const newItems = [newItem, ...savedItems];
    StorageManager.setJSON(`memo_data_${category}`, newItems);

    alert(`已成功保存到备忘录的【${category === 'foreshadowing' ? '伏笔/拆书结果' : category}】分类中！`);
  };

  const handleLike = (e: React.MouseEvent, content: string, source: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!content) return;

    let category = 'story';
    let categoryName = '故事库';

    if (id === 'module1') {
      category = 'brainstorm';
      categoryName = '脑洞库';
    } else if (id === 'module0_5') {
      category = 'dismantling';
      categoryName = '拆书库';
    }

    const newItem = {
      id: Date.now().toString(),
      title: `${source} (精选) - ${new Date().toLocaleDateString()}`,
      content: content,
      lastModified: Date.now(),
      tags: ['喜欢', '收藏', source]
    };

    const savedItems = StorageManager.getJSON(`memo_data_${category}`) || [];
    const newItems = [newItem, ...savedItems];
    StorageManager.setJSON(`memo_data_${category}`, newItems);

    alert(`❤️ 已将内容收藏到知识库的【${categoryName}】！`);
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Title Removed */}

      <div className={`grid gap-8 px-4 transition-all duration-300 ${isInputCollapsed || isOutputCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-5'
        }`}>
        {/* Top Toolbar for Collapsed States */}
        {(isInputCollapsed || isOutputCollapsed) && (
          <div className="flex items-center gap-3 animate-fade-in py-2 sticky top-0 z-10 bg-paper/90 backdrop-blur-md p-2 rounded-xl border border-ink/10 shadow-sm">
            {isInputCollapsed && (
              <button
                onClick={handleToggleInputCollapse}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-ink/10 text-ink/80 rounded-xl hover:bg-daiqing/10 hover:text-daiqing hover:border-daiqing/20 shadow-sm transition-all group"
              >
                <Settings2 className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                <span className="font-medium text-sm">展开输入配置</span>
              </button>
            )}

            {isOutputCollapsed && (
              <button
                onClick={handleToggleOutputCollapse}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-ink/10 text-ink/80 rounded-xl hover:bg-cinnabar/10 hover:text-cinnabar hover:border-cinnabar/20 shadow-sm transition-all group"
              >
                <List className="w-5 h-5" />
                <span className="font-medium text-sm">展开输出结果</span>
              </button>
            )}

            <div className="h-6 w-px bg-ink/20 mx-1"></div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-daiqing text-white rounded-xl hover:bg-daiqing/90 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              <span className="font-medium text-sm">{loading ? '生成中...' : '快速生成'}</span>
            </button>
          </div>
        )}

        {/* Left Column: Inputs */}
        {!isInputCollapsed && (
          <div className={`space-y-6 transition-all duration-300 ${isOutputCollapsed ? 'w-full' : 'lg:col-span-2'
            }`}>
            <div className="glass-card p-6 rounded-xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-ink">
                  <span className="w-1 h-6 bg-daiqing rounded-full"></span>
                  输入
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleInputCollapse}
                    className="text-ink/40 hover:text-ink p-1 hover:bg-paper rounded transition-transform duration-300"
                    title="收起输入 (专注输出)"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePromptImport}
                    className="flex items-center gap-1 text-xs text-daiqing hover:text-daiqing/80 bg-daiqing/5 hover:bg-daiqing/10 px-2 py-1 rounded transition-colors"
                    title="管理提示词模板"
                  >
                    <FileJson className="w-3 h-3" />
                    提示词
                  </button>
                  {id === 'module1' && (
                    <button
                      onClick={() => handleOpenMemoImport('dismantling', '从拆书库导入', 'brainhole')}
                      className="flex items-center gap-1 text-xs text-daiqing hover:text-daiqing/80 bg-daiqing/5 hover:bg-daiqing/10 px-2 py-1 rounded transition-colors"
                      title="从拆书库导入到输入框"
                    >
                      <Download className="w-3 h-3" />
                      导入
                    </button>
                  )}
                  {id === 'module2' && (
                    <button
                      onClick={() => handleOpenMemoImport('brainstorm', '从脑洞库导入', 'module1Output')}
                      className="flex items-center gap-1 text-xs text-daiqing hover:text-daiqing/80 bg-daiqing/5 hover:bg-daiqing/10 px-2 py-1 rounded transition-colors"
                      title="从脑洞库导入到输入框"
                    >
                      <Download className="w-3 h-3" />
                      导入
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {renderInputs(id)}
              </div>

              {/* Multi-Model Configuration - Now available for module0_5 too */}
              <div className="mt-6 border-t border-ink/5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleMultiMode}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isMultiModelMode ? 'bg-daiqing/10 text-daiqing' : 'bg-paper text-ink/60 hover:bg-paper/80'
                        }`}
                    >
                      {isMultiModelMode ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      多开模式
                    </button>
                  </div>
                  {isMultiModelMode && (
                    <button
                      onClick={handleAddMultiModel}
                      className="flex items-center gap-1 text-xs text-daiqing hover:text-daiqing/80 bg-daiqing/5 hover:bg-daiqing/10 px-2 py-1 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      增加模型
                    </button>
                  )}
                </div>

                {isMultiModelMode && (
                  <div className="space-y-3">
                    {multiModels.map((mConfig, index) => (
                      <div key={mConfig.id} className="bg-paper/50 p-3 rounded-lg border border-ink/10 relative group">
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteMultiModel(mConfig.id)}
                            className="text-ink/30 hover:text-cinnabar"
                            title="删除模型"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs font-medium text-ink/50 mb-2 font-serif">模型 #{index + 1}</div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="API Key"
                            value={mConfig.apiKey}
                            onChange={(e) => handleUpdateMultiModel(mConfig.id, 'apiKey', e.target.value)}
                            className="w-full text-xs p-2 bg-white/50 border border-ink/20 rounded focus:ring-1 focus:ring-daiqing/50 outline-none text-ink"
                          />
                          <input
                            type="text"
                            placeholder="Base URL"
                            value={mConfig.baseUrl}
                            onChange={(e) => handleUpdateMultiModel(mConfig.id, 'baseUrl', e.target.value)}
                            className="w-full text-xs p-2 bg-white/50 border border-ink/20 rounded focus:ring-1 focus:ring-daiqing/50 outline-none text-ink"
                          />
                          <input
                            type="text"
                            placeholder="Model Name"
                            value={mConfig.model}
                            onChange={(e) => handleUpdateMultiModel(mConfig.id, 'model', e.target.value)}
                            className="w-full text-xs p-2 bg-white/50 border border-ink/20 rounded focus:ring-1 focus:ring-daiqing/50 outline-none text-ink"
                          />
                        </div>
                      </div>
                    ))}
                    {multiModels.length === 0 && (
                      <div className="text-center text-xs text-ink/40 py-2 font-serif">
                        点击右上角添加额外模型
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                data-generate-btn
                className="mt-6 w-full flex items-center justify-center gap-2 bg-daiqing hover:bg-daiqing/90 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {loading ? '生成中...' : '生成内容'}
              </button>
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Output */}
        {!isOutputCollapsed && (
          <div className={`space-y-6 transition-all duration-300 ${isInputCollapsed ? 'w-full' : 'lg:col-span-3'
            }`}>
            <div className="glass-card p-6 rounded-xl flex flex-col resize-y overflow-auto min-h-[700px] max-h-[1200px]" style={{ resize: 'both' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-ink">
                  <span className="w-1 h-6 bg-cinnabar rounded-full"></span>
                  输出
                </h2>
                <div className="flex items-center gap-2">
                  {/* API 配置状态指示器 */}
                  <button
                    onClick={() => {
                      alert(
                        apiConfigStatus.valid
                          ? `API 配置正常\n\nProvider: ${apiConfigStatus.provider || '未识别'}`
                          : `API 未配置或无效\n\n${apiConfigStatus.errors?.join('\n') || ''}${apiConfigStatus.warnings?.length ? `\n\n警告:\n${apiConfigStatus.warnings.join('\n')}` : ''}`
                      );
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:opacity-80 transition-opacity ${apiConfigStatus.valid
                      ? 'bg-daiqing/10 text-daiqing border border-daiqing/20'
                      : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                    title="点击查看详细配置信息"
                  >
                    <div className={`w-2 h-2 rounded-full ${apiConfigStatus.valid ? 'bg-daiqing' : 'bg-red-500'
                      }`}></div>
                    <span>{apiConfigStatus.valid ? 'API 已配置' : 'API 未配置'}</span>
                  </button>
                  {apiConfigStatus.provider && (
                    <div className="text-xs text-ink/50 bg-paper px-2 py-1 rounded">
                      {apiConfigStatus.provider}
                    </div>
                  )}
                  <div className="h-4 w-px bg-ink/10 mx-1"></div>
                  <button
                    onClick={handleToggleOutputCollapse}
                    className="text-ink/40 hover:text-ink p-1 hover:bg-paper rounded transition-transform duration-300"
                    title="收起输出 (专注输入)"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    title="清空重置"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportHtml}
                    className="p-2 hover:bg-paper rounded-lg text-ink/50"
                    title="导出HTML"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveProject}
                    className="p-2 hover:bg-paper rounded-lg text-ink/50"
                    title="保存项目 (JSON)"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(result) }}
                    className="p-2 hover:bg-paper rounded-lg text-ink/50"
                    title="复制到剪贴板"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Result */}
              {/* 主模型输出 - 使用与多开模型一致的卡片样式 */}
              <div className={`mb-6 ${isMultiModelMode ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
                {/* 渲染列表，根据 displayOrder */}
                {displayOrder.map((modelId, index) => {
                  // 主模型渲染逻辑
                  if (modelId === 'main') {
                    return (
                      <div key="main" className="bg-white/40 rounded-xl border border-ink/10 shadow-sm flex flex-col h-[600px] animate-fade-in-up resize-y overflow-hidden">
                        <div className="p-4 border-b border-ink/5 flex items-center justify-between bg-daiqing/5 rounded-t-xl">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-daiqing text-white text-xs font-bold rounded-full font-serif">
                              主
                            </span>
                            <span className="font-semibold text-ink font-serif">主模型输出</span>
                            <span className="text-xs text-ink/50 bg-white/50 px-2 py-0.5 rounded border border-ink/10">
                              {apiConfigStatus.model || '未选择模型'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLockOutput('main')}
                              className={`p-1.5 rounded-lg transition-colors ${lockedOutputs.includes('main')
                                ? 'bg-cinnabar/10 text-cinnabar hover:bg-cinnabar/20'
                                : 'hover:bg-white/50 text-ink/40'
                                }`}
                              title={lockedOutputs.includes('main') ? "已锁定 (点击解锁)" : "锁定结果"}
                            >
                              <CheckCircle2 className={`w-4 h-4 ${lockedOutputs.includes('main') ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleLike(e, result, '主模型')}
                              className="p-1.5 hover:bg-pink-50 hover:text-pink-500 rounded-lg text-ink/40 transition-colors"
                              title="喜欢 (收藏到知识库)"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleSaveToMemo(e, result, '主模型')}
                              className="p-1.5 hover:bg-white/50 rounded-lg text-ink/40 transition-colors"
                              title="保存到备忘录"
                            >
                              <BookMarked className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { navigator.clipboard.writeText(result) }}
                              className="p-1.5 hover:bg-white/50 rounded-lg text-ink/40 transition-colors"
                              title="复制"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDiscardAndRegenerate('main')}
                              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-ink/30 transition-colors"
                              title={lockedOutputs.includes('main') ? "隐藏 (不重新生成)" : "重新生成并后移"}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 p-0 overflow-hidden relative">
                          {generatingIds.includes('main') && !result ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink/40 gap-2 bg-white/50 z-10">
                              <Loader2 className="w-6 h-6 animate-spin text-daiqing" />
                              <span>正在生成...</span>
                            </div>
                          ) : !result && !generatingIds.includes('main') ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink/30 gap-2 z-10 pointer-events-none">
                              <span>等待生成...</span>
                            </div>
                          ) : null}

                          <textarea
                            className="w-full h-full p-4 text-base bg-transparent border-0 outline-none resize-none text-ink font-serif leading-relaxed custom-scrollbar"
                            value={result}
                            onChange={(e) => {
                              setResult(e.target.value);
                              StorageManager.set(STORAGE_KEYS.MODULE_OUTPUT(id), e.target.value);
                            }}
                            placeholder="你可以在这里直接编辑结果..."
                          />
                        </div>
                      </div>
                    );
                  }

                  // 多开模型渲染逻辑
                  const mConfig = multiModels.find(m => m.id === modelId);
                  if (!mConfig) return null; // Should not happen if sync is correct

                  return (
                    <div key={mConfig.id} className="bg-white/40 rounded-xl border border-ink/10 shadow-sm flex flex-col h-[600px] animate-fade-in-up resize-y overflow-hidden">
                      <div className="p-4 border-b border-ink/5 flex items-center justify-between bg-ink/5 rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 bg-ink text-white text-xs font-bold rounded-full font-serif">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-ink font-serif">模型 #{index + 1}</span>
                          <span className="text-xs text-ink/50 bg-white/50 px-2 py-0.5 rounded border border-ink/10">
                            {mConfig.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLockOutput(mConfig.id)}
                            className={`p-1.5 rounded-lg transition-colors ${lockedOutputs.includes(mConfig.id)
                              ? 'bg-cinnabar/10 text-cinnabar hover:bg-cinnabar/20'
                              : 'hover:bg-white/50 text-ink/40'
                              }`}
                            title={lockedOutputs.includes(mConfig.id) ? "已锁定 (点击解锁)" : "锁定结果"}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${lockedOutputs.includes(mConfig.id) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleLike(e, multiModelResults[mConfig.id] || '', mConfig.model)}
                            className="p-1.5 hover:bg-pink-50 hover:text-pink-500 rounded-lg text-ink/40 transition-colors"
                            title="喜欢 (收藏到知识库)"
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSaveToMemo(e, multiModelResults[mConfig.id] || '', mConfig.model)}
                            className="p-1.5 hover:bg-white/50 rounded-lg text-ink/40 transition-colors"
                            title="保存到备忘录"
                          >
                            <BookMarked className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(multiModelResults[mConfig.id] || '') }}
                            className="p-1.5 hover:bg-white/50 rounded-lg text-ink/40 transition-colors"
                            title="复制"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDiscardAndRegenerate(mConfig.id)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-ink/30 transition-colors"
                            title={lockedOutputs.includes(mConfig.id) ? "隐藏 (不重新生成)" : "重新生成并后移"}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 p-0 overflow-hidden relative">
                        {generatingIds.includes(mConfig.id) && !multiModelResults[mConfig.id] ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-ink/40 gap-2 bg-white/50 z-10">
                            <Loader2 className="w-6 h-6 animate-spin text-ink" />
                            <span>正在重新生成...</span>
                          </div>
                        ) : !multiModelResults[mConfig.id] && !generatingIds.includes(mConfig.id) ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-ink/30 gap-2 z-10 pointer-events-none">
                            <span>等待生成...</span>
                          </div>
                        ) : null}

                        <textarea
                          className="w-full h-full p-4 text-base bg-transparent border-0 outline-none resize-none text-ink font-serif leading-relaxed custom-scrollbar"
                          value={multiModelResults[mConfig.id] || ''}
                          onChange={(e) => {
                            const newResults = { ...multiModelResults, [mConfig.id]: e.target.value };
                            setMultiModelResults(newResults);
                            StorageManager.setJSON(`multi_results_${id}`, newResults);
                          }}
                          placeholder="结果将显示在这里，支持手动修改..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white/95 backdrop-blur rounded-xl shadow-xl flex flex-col transition-all duration-300 border border-ink/10 ${isMaximized
            ? 'w-full h-full'
            : 'w-[800px] h-[700px] max-w-[90vw] max-h-[90vh]'
            }`}>
            <div className="flex items-center justify-between p-4 border-b border-ink/10 bg-paper/50 rounded-t-xl">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2 font-serif">
                <FileJson className="w-5 h-5 text-daiqing" />
                {viewMode === 'list' ? '提示词' : (editingTemplate?.id ? '编辑模板' : '新建模板')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="text-ink/40 hover:text-ink p-1 hover:bg-paper rounded transition-colors"
                  title={isMaximized ? "还原" : "最大化"}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="text-ink/40 hover:text-ink p-1 hover:bg-paper rounded transition-colors"
                >
                  <Trash2 className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-paper/30 custom-scrollbar">
              {viewMode === 'list' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promptTemplates.map(template => (
                      <div key={template.id} className="bg-white/60 border border-ink/10 rounded-xl p-4 hover:shadow-md transition-shadow group relative hover:border-daiqing/30">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-ink text-lg truncate pr-20 font-serif flex items-center gap-2">
                            {selectedPromptIds.includes(template.id) && (
                              <span className="bg-daiqing text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm flex-shrink-0">
                                {selectedPromptIds.indexOf(template.id) + 1}
                              </span>
                            )}
                            {template.title}
                          </h4>
                          {template.isDefault && (
                            <span className="bg-paper text-ink/60 text-xs px-2 py-1 rounded-full border border-ink/5">默认</span>
                          )}
                        </div>
                        <div className="text-sm text-ink/60 h-40 mb-4 font-mono bg-paper/50 p-3 rounded overflow-y-auto custom-scrollbar border border-ink/5">
                          {template.content}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleSelectTemplate(template)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPromptIds.includes(template.id)
                              ? 'bg-daiqing hover:bg-daiqing/90 text-white'
                              : 'bg-ink hover:bg-ink/80 text-white'
                              }`}
                          >
                            {selectedPromptIds.includes(template.id) ? (
                              <>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold mr-1">
                                  {selectedPromptIds.indexOf(template.id) + 1}
                                </span>
                                <CheckCircle2 className="w-4 h-4" />
                                已选
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                选择
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-2 text-ink/50 hover:bg-paper rounded-lg transition-colors"
                            title="编辑/查看"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!template.isDefault && (
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 text-ink/50 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-2 font-serif">模板名称</label>
                    <input
                      type="text"
                      value={editingTemplate?.title || ''}
                      onChange={e => setEditingTemplate(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                      className="w-full px-4 py-2 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none bg-white/50 text-ink font-serif"
                      placeholder="给你的模板起个霸气的名字..."
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-ink/80 font-serif">系统提示词 (System Prompt)</label>
                      <span className="text-xs text-cinnabar/80 font-medium bg-cinnabar/5 px-2 py-0.5 rounded border border-cinnabar/10">
                        如有字数要求请第一行标明
                      </span>
                    </div>
                    <textarea
                      value={editingTemplate?.content || ''}
                      onChange={e => setEditingTemplate(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                      className="w-full h-96 p-4 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none font-mono text-sm leading-relaxed bg-white/50 text-ink"
                      placeholder="输入详细的系统提示词..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-ink/10 flex justify-between items-center bg-white/80 rounded-b-xl">
              {viewMode === 'list' ? (
                <>
                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handlePromptFileImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="flex items-center gap-2 px-4 py-2 bg-paper hover:bg-daiqing/10 text-ink rounded-lg font-medium transition-colors border border-ink/5">
                        <Upload className="w-4 h-4" />
                        导入
                      </button>
                    </div>
                    <button
                      onClick={handlePromptExport}
                      className="flex items-center gap-2 px-4 py-2 bg-paper hover:bg-daiqing/10 text-ink rounded-lg font-medium transition-colors border border-ink/5"
                    >
                      <Download className="w-4 h-4" />
                      导出
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewTemplate}
                      className="flex items-center gap-2 px-6 py-2 bg-daiqing hover:bg-daiqing/90 text-white rounded-lg font-medium shadow-md transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      新增
                    </button>
                    <button
                      onClick={handleApplySelection}
                      className="flex items-center gap-2 px-6 py-2 bg-ink hover:bg-ink/90 text-white rounded-lg font-medium shadow-md transition-colors"
                    >
                      <Check className="w-5 h-5" />
                      完成选择 ({selectedPromptIds.length})
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setViewMode('list')}
                    className="px-6 py-2 text-ink/60 hover:bg-paper rounded-lg font-medium transition-colors"
                  >
                    返回列表
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    className="px-6 py-2 bg-daiqing hover:bg-daiqing/90 text-white rounded-lg font-medium shadow-md transition-colors"
                  >
                    保存模板
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showMemoImportModal && (
        <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl flex flex-col transition-all duration-300 border border-ink/10 w-[1000px] h-[720px] max-w-[95vw] max-h-[95vh]">
            <div className="flex items-center justify-between p-4 border-b border-ink/10 bg-paper/50 rounded-t-xl">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2 font-serif">
                <Download className="w-5 h-5 text-daiqing" />
                {memoImportTitle}
              </h3>
              <button
                onClick={() => setShowMemoImportModal(false)}
                className="text-ink/40 hover:text-ink p-1 hover:bg-paper rounded transition-colors"
              >
                <Trash2 className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-paper/30 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <input
                    type="text"
                    value={memoImportSearchTerm}
                    onChange={(e) => setMemoImportSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none bg-white/50 text-ink font-serif"
                    placeholder={`搜索${memoImportCategory === 'dismantling' ? '拆书库' : '脑洞库'}标题或内容...`}
                  />

                  <div className="space-y-2">
                    {(memoImportItems || [])
                      .filter((item) => {
                        const q = memoImportSearchTerm.trim();
                        if (!q) return true;
                        return `${item.title}\n${item.content}`.includes(q);
                      })
                      .map((item) => {
                        const selected = selectedMemoImportItem?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedMemoImportItem(item)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${selected
                              ? 'bg-daiqing/10 border-daiqing/30'
                              : 'bg-white/60 border-ink/10 hover:bg-white/80 hover:border-daiqing/20'
                              }`}
                          >
                            <div className="font-medium text-ink font-serif truncate">{item.title || '未命名'}</div>
                            <div className="text-xs text-ink/50 mt-1 line-clamp-2">
                              {(item.content || '').slice(0, 80)}
                            </div>
                          </button>
                        );
                      })}
                    {memoImportItems.length === 0 && (
                      <div className="text-center text-sm text-ink/40 py-8 font-serif">
                        {memoImportCategory === 'dismantling'
                          ? '拆书库暂无内容（先去模块11或模块0.5收藏一些）'
                          : '脑洞库暂无内容（先去模块11或模块1收藏一些）'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-ink/70 font-serif">预览</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMemoImportMode('replace')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${memoImportMode === 'replace'
                          ? 'bg-daiqing text-white border-daiqing'
                          : 'bg-white/60 text-ink/60 border-ink/10 hover:bg-white/80'
                          }`}
                      >
                        覆盖
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemoImportMode('append')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${memoImportMode === 'append'
                          ? 'bg-daiqing text-white border-daiqing'
                          : 'bg-white/60 text-ink/60 border-ink/10 hover:bg-white/80'
                          }`}
                      >
                        追加
                      </button>
                    </div>
                  </div>

                  <textarea
                    readOnly
                    value={selectedMemoImportItem?.content || ''}
                    className="w-full h-[520px] p-4 border border-ink/20 rounded-lg outline-none font-mono text-sm leading-relaxed bg-white/50 text-ink custom-scrollbar"
                    placeholder="选择左侧条目以预览内容..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-ink/10 flex justify-end items-center bg-white/80 rounded-b-xl gap-2">
              <button
                onClick={() => setShowMemoImportModal(false)}
                className="px-6 py-2 text-ink/60 hover:bg-paper rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleApplyMemoImport}
                disabled={!selectedMemoImportItem}
                className="flex items-center gap-2 px-6 py-2 bg-daiqing hover:bg-daiqing/90 text-white rounded-lg font-medium shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                导入到输入框
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// UI Components
function Input({ label, value, onChange, placeholder }: { label: string, value?: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink/80 mb-1 font-serif">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white/50 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none text-sm text-ink placeholder:text-ink/30 transition-all"
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label: string, value?: string, onChange: (v: string) => void, rows?: number, placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink/80 mb-1 font-serif">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 bg-white/50 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none text-sm text-ink placeholder:text-ink/30 transition-all resize-y"
        placeholder={placeholder}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, multiple = false }: { label: string, value?: string | string[], onChange: (v: string | string[]) => void, options: string[], multiple?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      onChange(selectedOptions);
    } else {
      onChange(e.target.value);
    }
  };

  // Checkbox handling for multiple selection
  const handleCheckboxChange = (optionValue: string) => {
    let currentValues: string[] = [];
    if (typeof value === 'string') {
      currentValues = value ? value.split('、') : [];
    } else if (Array.isArray(value)) {
      currentValues = [...value];
    }

    if (currentValues.includes(optionValue)) {
      onChange(currentValues.filter(v => v !== optionValue));
    } else {
      onChange([...currentValues, optionValue]);
    }
  };

  const isSelected = (optionValue: string) => {
    if (multiple) {
      if (Array.isArray(value)) return value.includes(optionValue);
      if (typeof value === 'string') return value.split('、').includes(optionValue);
      return false;
    }
    return value === optionValue;
  };

  if (multiple) {
    const displayValue = Array.isArray(value) ? value.join('、') : (typeof value === 'string' ? value : '');

    return (
      <div>
        <label className="block text-sm font-medium text-ink/80 mb-2 font-serif">{label}</label>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center px-3 py-2 bg-white/50 border border-ink/20 rounded-lg text-sm text-ink hover:bg-white/80 transition-all mb-2 focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none"
          type="button"
        >
          <span className="truncate pr-2 text-left">{displayValue || '点击选择风格...'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 opacity-50 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />}
        </button>

        {isOpen && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-ink/20 rounded-lg bg-white/50 custom-scrollbar animate-fade-in-down mb-2">
            {options.map(opt => (
              <label key={opt} className="flex items-center space-x-2 p-1 hover:bg-daiqing/5 rounded cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isSelected(opt)}
                  onChange={() => handleCheckboxChange(opt)}
                  className="w-4 h-4 text-daiqing rounded border-ink/30 focus:ring-daiqing"
                />
                <span className="text-sm text-ink/80 font-serif">{opt}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink/80 mb-1 font-serif">{label}</label>
      <div className="relative">
        <select
          value={value as string || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-white/50 border border-ink/20 rounded-lg focus:ring-2 focus:ring-daiqing/20 focus:border-daiqing outline-none text-sm text-ink font-serif appearance-none"
        >
          <option value="">请选择...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-ink/50">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
