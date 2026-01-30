'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    PenTool, BookOpen, Layers, Zap, Download, Play,
    Pause, RefreshCw, ChevronRight, ChevronDown,
    Settings, Save, FileText, Sparkles, X, BrainCircuit, Check,
    User, Plus, Trash2, Search, BookPlus, Edit2
} from 'lucide-react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { useMaxJob } from '@/contexts/MaxJobContext';
import CloudSyncModal from '@/components/CloudSyncModal';

import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { generateAIContentStream } from '@/lib/ai';
import { APIConfigValidator } from '@/lib/api-validator';
import ReactMarkdown from 'react-markdown';
import Module10Manager from '@/components/Module10Manager';
import JSZip from 'jszip';
import { PROVIDER_MODELS } from '@/lib/models';

interface Card {
    id: string;
    type: string;
    title: string;
    example: string;
    analysis: string;
    tags: string[];
}

interface Chapter {
    id: string;
    title: string;
    summary: string;
    content?: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
}

interface WorkItem {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

interface GenerationConfig {
    startChapter: number;
    endChapter: number;
    model: string;
    style: string;
    wordCount: number;
}

export default function MaxCreationPage() {
    const pathname = usePathname();
    const { registerEditor, unregisterEditor, isAiOpen, registerPageSkill, unregisterPageSkill } = useEditorAgent();
    const { outlineGenState, startOutlineGeneration } = useMaxJob();

    // Navigation State
    const isMaxHome = pathname === '/module/module_max';
    const isMaxIdea = pathname === '/module/module_max/idea';
    const isMaxDismantle = pathname === '/module/module_max/dismantle';
    const isMaxPolish = pathname === '/module/module_max/polish';
    const isMaxCreation = pathname === '/module/module_max/creation';
    const isMaxOutline = pathname === '/module/module_max/outline';
    const worksKey = 'novel_writer_max_works';
    const activeWorkKey = 'novel_writer_max_active_work';
    const userClearedKey = 'novel_writer_max_user_cleared';
    const outlineKey = 'novel_writer_max_outline';
    const getWorkContextKey = (workId: string) => `novel_writer_max_context_${workId}`;

    // Data State
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [activeChapterId, setActiveChapterId] = useState<string>('');
    const [worldSetting, setWorldSetting] = useState<string>('');
    const [styleRef, setStyleRef] = useState<string>('');
    const [outlineRaw, setOutlineRaw] = useState<string>('');
    const [works, setWorks] = useState<WorkItem[]>([]);
    const [activeWorkId, setActiveWorkId] = useState<string>('');

    // UI State
    const [showSettings, setShowSettings] = useState(false);
    const [showOutlineGen, setShowOutlineGen] = useState(false);
    const [showCardSelector, setShowCardSelector] = useState(false);
    const [showPromptManager, setShowPromptManager] = useState(false);
    const [showWorksManager, setShowWorksManager] = useState(false);
    const [cardSearch, setCardSearch] = useState('');
    const [newWorkTitle, setNewWorkTitle] = useState('');
    const [showCloudSync, setShowCloudSync] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    // Card State
    const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
    const [selectedCards, setSelectedCards] = useState<Card[]>([]);
    // Edit Card State
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editingCardContent, setEditingCardContent] = useState('');
    const [localCardLibrary, setLocalCardLibrary] = useState<Card[]>([]);

    useEffect(() => {
        setLocalCardLibrary(cardLibrary);
    }, [cardLibrary]);

    // Load available models
    useEffect(() => {
        const loadModels = () => {
            const provider = StorageManager.get('novel_writer_provider') || 'siliconflow';
            const rawCustomModels = StorageManager.getJSON('novel_writer_custom_models');
            const customModels = Array.isArray(rawCustomModels) ? rawCustomModels : [];
            const presetModels = PROVIDER_MODELS[provider] || [];
            // Remove duplicates
            const allModels = Array.from(new Set([...presetModels, ...customModels]));
            setAvailableModels(allModels);
        };
        loadModels();
    }, [showSettings]); // Reload when settings panel opens/closes or on mount

    // AI Outline Gen State
    const [outlineIdea, setOutlineIdea] = useState('');
    const [outlineChapterCount, setOutlineChapterCount] = useState(10);
    const [outlineStartChapter, setOutlineStartChapter] = useState(1);
    const [outlineEndChapter, setOutlineEndChapter] = useState(10);
    // const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [customSystemPrompt, setCustomSystemPrompt] = useState('');

    // Sync with Context
    useEffect(() => {
        if (outlineGenState.result && !outlineRaw) {
            setOutlineRaw(outlineGenState.result);
        }
        if (outlineGenState.result && outlineGenState.isGenerating) {
            setOutlineRaw(outlineGenState.result);
        }
    }, [outlineGenState.result, outlineGenState.isGenerating]);

    useEffect(() => {
        if (!showOutlineGen) return;
        const loadOutline = async () => {
            const savedOutline = await StorageManager.getAsync(outlineKey);
            if (typeof savedOutline === 'string' && savedOutline.trim() && !outlineIdea.trim()) {
                setOutlineIdea(savedOutline);
            }
        };
        loadOutline();
    }, [showOutlineGen]);

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationConfig, setGenerationConfig] = useState<GenerationConfig>({
        startChapter: 1,
        endChapter: 1,
        model: 'deepseek-ai/DeepSeek-V3', // Default
        style: 'default',
        wordCount: 2000
    });
    const [batchGenMode, setBatchGenMode] = useState<'range' | 'selected'>('range'); // 'range' for start-end, 'selected' for individual selection

    // State for Detected Volumes
    const [detectedVolumes, setDetectedVolumes] = useState<{ title: string; startIndex: number; endIndex: number }[]>([]);
    // Expanded Volume State (Set of volume titles that are expanded)
    const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());

    // Toggle Volume Expansion
    const toggleVolume = (title: string) => {
        setExpandedVolumes(prev => {
            const next = new Set(prev);
            if (next.has(title)) {
                next.delete(title);
            } else {
                next.add(title);
            }
            return next;
        });
    };
    
    // Auto-expand the volume of the active chapter
    useEffect(() => {
        if (!activeChapterId || detectedVolumes.length === 0) return;
        
        const activeIndex = chapters.findIndex(c => c.id === activeChapterId);
        if (activeIndex === -1) return;
        
        const currentChapNum = activeIndex + 1;
        const vol = detectedVolumes.find(v => currentChapNum >= v.startIndex && currentChapNum <= v.endIndex);
        
        if (vol) {
             setExpandedVolumes(prev => {
                 if (!prev.has(vol.title)) {
                     const next = new Set(prev);
                     next.add(vol.title);
                     return next;
                 }
                 return prev;
             });
        }
    }, [activeChapterId, detectedVolumes]);

    // Detect volumes from outlineIdea
    useEffect(() => {
        if (!outlineIdea) {
            setDetectedVolumes([]);
            return;
        }

        const lines = outlineIdea.split('\n');
        const volumes: { title: string; startIndex: number; endIndex: number }[] = [];
        let currentVolume: { title: string; startIndex: number; endIndex: number } | null = null;
        let lastChapterNum = 0;

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            // Match Volume Header: 第X卷 or Volume X
            // 匹配格式：第X卷、卷X、Volume X
            // 增强匹配：支持 "第一卷：xxx (1-20章)" 这种格式，直接提取范围
            const volMatch = trimmed.match(/^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i);
            if (volMatch) {
                if (currentVolume) {
                    currentVolume.endIndex = lastChapterNum; // Close previous volume
                    volumes.push(currentVolume);
                }
                
                // 尝试从卷标题中提取显式的范围信息，例如 "(第1-20章)" 或 "1-20章"
                let explicitStart = 0;
                let explicitEnd = 0;
                const rangeMatch = trimmed.match(/[（(]?\s*第?(\d+)\s*[-~]\s*第?(\d+)\s*章?[）)]?/);
                if (rangeMatch) {
                    explicitStart = parseInt(rangeMatch[1]);
                    explicitEnd = parseInt(rangeMatch[2]);
                }

                currentVolume = {
                    title: trimmed.replace(/^[#*]+/, '').trim(),
                    startIndex: explicitStart > 0 ? explicitStart : (lastChapterNum + 1),
                    endIndex: explicitEnd > 0 ? explicitEnd : (lastChapterNum + 1) // Temporary default
                };
                
                // 如果提取到了显式范围，更新 lastChapterNum
                if (explicitEnd > 0) {
                    lastChapterNum = explicitEnd;
                }
            }
            
             if (currentVolume) {
                 // 如果没有显式范围，才尝试通过计数来推断
                 // 只有当当前卷没有被显式指定结束章时才计数
                 // 或者是为了兼容混合模式
                 if (currentVolume.endIndex <= currentVolume.startIndex) {
                     // Try to detect chapter markers to be smarter
                     // 增强匹配：支持 "第1章"、"1."、"Chapter 1" 等格式
                     // 并且要提取出具体的数字，而不是简单累加
                     const chapMatch = trimmed.match(/^(?:#+\s*)?(?:第\s*([0-9一二三四五六七八九十百千]+)\s*章|Chapter\s*(\d+)|(\d+)\.)/i);
                     if (chapMatch) {
                         // 尝试解析章节号
                         let chapNum = 0;
                         if (chapMatch[2]) chapNum = parseInt(chapMatch[2]); // Chapter 1
                         else if (chapMatch[3]) chapNum = parseInt(chapMatch[3]); // 1.
                         else if (chapMatch[1]) {
                             // 中文数字转阿拉伯数字 (简单处理)
                             const cnNum = chapMatch[1];
                             if (!isNaN(parseInt(cnNum))) {
                                 chapNum = parseInt(cnNum);
                             } else {
                                 // 如果是纯中文，暂时简单累加，或者引入中文数字转换库
                                 // 这里为了稳健，如果无法解析，就回退到 lastChapterNum + 1
                                 chapNum = lastChapterNum + 1;
                             }
                         }
                         
                         if (chapNum > 0) {
                             lastChapterNum = Math.max(lastChapterNum, chapNum);
                             currentVolume.endIndex = lastChapterNum;
                         }
                     }
                 }
             }
        });

        if (currentVolume) {
             // If no chapters detected, maybe it's a rough outline. Default to +20 chapters?
             if (currentVolume.endIndex === currentVolume.startIndex) {
                 currentVolume.endIndex = currentVolume.startIndex + 19;
                 lastChapterNum += 20;
             }
             volumes.push(currentVolume);
        }

        setDetectedVolumes(volumes);
    }, [outlineIdea]);

    // Refs for streaming
    const abortControllerRef = useRef<AbortController | null>(null);
    const chaptersRef = useRef(chapters);
    const autoSaveTimerRef = useRef<number | null>(null);
    const isHydratingRef = useRef(false);
    useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

    const updateWorkUpdatedAt = (workId: string, time: number) => {
        setWorks(prev => {
            const updated = prev.map(work => work.id === workId ? { ...work, updatedAt: time } : work);
            StorageManager.setJSON(worksKey, updated);
            return updated;
        });
    };

    const saveWorkContext = (
        workId: string,
        context: {
            worldSetting: string;
            style: string;
            outline: string;
            outlineChapterCount: number;
            outlineStartChapter?: number; // Added field
            outlineEndChapter?: number;   // Added field
            chapters: Chapter[];
            activeChapterId: string;
            generationConfig: GenerationConfig;
        }
    ) => {
        if (!workId) return;
        StorageManager.setJSON(getWorkContextKey(workId), {
            ...context,
            outlineStartChapter, // Save current state
            outlineEndChapter    // Save current state
        });
        updateWorkUpdatedAt(workId, Date.now());
    };

    const loadWorkContext = async (workId: string) => {
        if (!workId) return;
        isHydratingRef.current = true;
        try {
            const savedContext = await StorageManager.getJSONAsync(getWorkContextKey(workId));
            if (savedContext) {
                setWorldSetting(savedContext.worldSetting || '');
                setStyleRef(savedContext.style || '');
                setOutlineRaw(savedContext.outline || '');
                const savedOutlineChapterCount = Number(savedContext.outlineChapterCount);
                if (Number.isFinite(savedOutlineChapterCount) && savedOutlineChapterCount > 0) {
                    setOutlineChapterCount(savedOutlineChapterCount);
                } else {
                    setOutlineChapterCount(10);
                }
                if (savedContext.outlineStartChapter) setOutlineStartChapter(Number(savedContext.outlineStartChapter));
                if (savedContext.outlineEndChapter) setOutlineEndChapter(Number(savedContext.outlineEndChapter));
                const savedChapters = Array.isArray(savedContext.chapters) ? savedContext.chapters : [];
                if (savedChapters.length > 0) {
                    setChapters(savedChapters);
                    const savedActiveId = savedContext.activeChapterId || '';
                    const nextActiveId = savedChapters.find((c: Chapter) => c.id === savedActiveId)?.id || savedChapters[0].id;
                    setActiveChapterId(nextActiveId);
                    setGenerationConfig(prev => {
                        const savedGen = savedContext.generationConfig || {};
                        const merged = { ...prev, ...savedGen };
                        const rawStart = Number(merged.startChapter);
                        const rawEnd = Number(merged.endChapter);
                        const startChapter = Number.isFinite(rawStart) && rawStart > 0 ? Math.min(savedChapters.length, rawStart) : 1;
                        const endChapterBase = Number.isFinite(rawEnd) && rawEnd > 0 ? Math.min(savedChapters.length, rawEnd) : Math.min(savedChapters.length, 5);
                        const endChapter = Math.max(startChapter, endChapterBase);
                        return {
                            ...merged,
                            startChapter,
                            endChapter,
                            wordCount: savedGen.wordCount || 2000
                        };
                    });
                } else if (savedContext.outline) {
                    const parsed = parseOutline(savedContext.outline);
                    setChapters(parsed);
                    if (parsed.length > 0) setActiveChapterId(parsed[0].id);
                    setGenerationConfig(prev => {
                        const savedGen = savedContext.generationConfig || {};
                        const merged = { ...prev, ...savedGen };
                        const rawStart = Number(merged.startChapter);
                        const rawEnd = Number(merged.endChapter);
                        const startChapter = Number.isFinite(rawStart) && rawStart > 0 ? Math.min(parsed.length, rawStart) : 1;
                        const endChapterBase = Number.isFinite(rawEnd) && rawEnd > 0 ? Math.min(parsed.length, rawEnd) : Math.min(parsed.length, 5);
                        const endChapter = Math.max(startChapter, endChapterBase);
                        return { ...merged, startChapter, endChapter };
                    });
                } else {
                    setChapters([]);
                    setActiveChapterId('');
                    setGenerationConfig(prev => ({ ...prev, endChapter: 1 }));
                }
                return;
            }
            setWorldSetting('');
            setStyleRef('');
            setOutlineRaw('');
            setOutlineChapterCount(10);
            setChapters([]);
            setActiveChapterId('');
            setGenerationConfig(prev => ({ ...prev, endChapter: 1 }));
        } finally {
            isHydratingRef.current = false;
        }
    };

    // Load Data - Local Only
    useEffect(() => {
        const loadLocalData = async () => {
            const savedWorks = await StorageManager.getJSONAsync(worksKey);
            const savedContext = await StorageManager.getJSONAsync('novel_writer_max_context');
            let worksList: WorkItem[] = Array.isArray(savedWorks) ? savedWorks : [];
            const userCleared = StorageManager.get(userClearedKey) === 'true';
            if (worksList.length === 0 && !userCleared) {
                const now = Date.now();
                const defaultWork = { id: `work-${now}`, title: '默认作品', createdAt: now, updatedAt: now };
                worksList = [defaultWork];
                StorageManager.setJSON(worksKey, worksList);
                if (savedContext) {
                    StorageManager.setJSON(getWorkContextKey(defaultWork.id), savedContext);
                }
                StorageManager.set(activeWorkKey, defaultWork.id);
            } else if (worksList.length === 0) {
                StorageManager.remove(activeWorkKey);
            }
            setWorks(worksList);
            const savedActiveWorkId = StorageManager.get(activeWorkKey) || '';
            const nextActiveId = worksList.find(work => work.id === savedActiveWorkId)?.id || worksList[0]?.id || '';
            if (nextActiveId) {
                setActiveWorkId(nextActiveId);
            } else {
                setActiveWorkId('');
                setWorldSetting('');
                setStyleRef('');
                setOutlineRaw('');
                setChapters([]);
                setActiveChapterId('');
                setGenerationConfig(prev => ({ ...prev, endChapter: 1 }));
            }

            // Load Card Library
            try {
                const savedCards = await StorageManager.getJSONAsync('novel_writer_card_library');
                if (savedCards && Array.isArray(savedCards)) {
                    setCardLibrary(savedCards);
                }
            } catch (e) {
                console.error('Failed to load cards', e);
            }

            // Load Writing Model Config
            const savedModel = StorageManager.get(STORAGE_KEYS.WRITING_MODEL);
            if (savedModel) {
                setGenerationConfig(prev => ({ ...prev, model: savedModel }));
            }
        };
        loadLocalData();
    }, []);

    useEffect(() => {
        if (!activeWorkId) return;
        loadWorkContext(activeWorkId);
    }, [activeWorkId]);

    useEffect(() => {
        if (!activeWorkId || isHydratingRef.current) return;
        if (autoSaveTimerRef.current) {
            window.clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = window.setTimeout(() => {
            if (!activeWorkId) return;
            saveWorkContext(activeWorkId, {
                worldSetting,
                style: styleRef,
                outline: outlineRaw,
                outlineChapterCount,
                outlineStartChapter,
                outlineEndChapter,
                chapters: chaptersRef.current,
                activeChapterId,
                generationConfig
            });
        }, 600);


        return () => {
            if (autoSaveTimerRef.current) {
                window.clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [activeWorkId, worldSetting, styleRef, outlineRaw, outlineChapterCount, chapters, activeChapterId, generationConfig]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    // Refs for unmount saving
    const latestContextRef = useRef({
        activeWorkId,
        worldSetting,
        style: styleRef,
        outline: outlineRaw,
        outlineChapterCount,
        chapters,
        activeChapterId,
        generationConfig
    });

    useEffect(() => {
        latestContextRef.current = {
            activeWorkId,
            worldSetting,
            style: styleRef,
            outline: outlineRaw,
            outlineChapterCount,
            outlineStartChapter,
            outlineEndChapter,
            chapters,
            activeChapterId,
            generationConfig
        };
    }, [activeWorkId, worldSetting, styleRef, outlineRaw, outlineChapterCount, chapters, activeChapterId, generationConfig]);

    // Save on unmount (navigation)
    useEffect(() => {
        return () => {
            const ctx = latestContextRef.current;
            if (ctx.activeWorkId) {
                console.log('Auto-saving on unmount/navigation', ctx.activeWorkId);
                const key = `novel_writer_max_context_${ctx.activeWorkId}`;
                const data = {
                    worldSetting: ctx.worldSetting,
                    style: ctx.style,
                    outline: ctx.outline,
                    outlineChapterCount: ctx.outlineChapterCount,
                    outlineStartChapter: ctx.outlineStartChapter, // Added
                    outlineEndChapter: ctx.outlineEndChapter,     // Added
                    chapters: ctx.chapters,
                    activeChapterId: ctx.activeChapterId,
                    generationConfig: ctx.generationConfig
                };
                // Synchronous save
                StorageManager.setJSON(key, data);
            }
        };
    }, []);

    // Helper: Parse Outline
    const parseOutline = (text: string): Chapter[] => {
        const lines = text.split('\n');
        const chapters: Chapter[] = [];
        let currentChapter: Partial<Chapter> | null = null;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            // 匹配多种章节标识符：
            // 1. 第X章, 第 X 章, # 第X章
            // 2. Chapter X, ChapterX, # Chapter X
            // 3. 数字开头的列表项：101. 章节名
            // 4. Markdown 标题格式：# 第一章
            const match = trimmedLine.match(/^(?:#+\s*)?(?:第\s*[0-9一二三四五六七八九十百千]+\s*章|Chapter\s*\d+|\d+\.)\s*(.*)/i);

            if (match) {
                if (currentChapter && currentChapter.id) {
                    chapters.push(currentChapter as Chapter);
                }
                currentChapter = {
                    id: `ch-${chapters.length + 1}`,
                    title: match[0].replace(/#/g, '').trim(),
                    summary: '',
                    status: 'pending'
                };
            } else if (currentChapter) {
                currentChapter.summary += line + '\n';
            }
        });
        if (currentChapter) chapters.push(currentChapter as Chapter);

        return chapters;
    };

    const handleSaveSettings = () => {
        // Only update context data, do not parse chapters here unless explicitly intended?
        // Actually, if user edits the "Outline Text" in settings manually, we should parse it.
        const parsed = parseOutline(outlineRaw);
        if (parsed.length > 0) {
            setChapters(parsed);
            if (!activeChapterId || !parsed.find(c => c.id === activeChapterId)) {
                setActiveChapterId(parsed[0].id);
            }
        }
        const nextChapters = parsed.length > 0 ? parsed : chapters;
        const nextActiveChapterId = parsed.length > 0
            ? (parsed.find(c => c.id === activeChapterId)?.id || parsed[0].id)
            : activeChapterId;
        saveWorkContext(activeWorkId, {
            worldSetting,
            style: styleRef,
            outline: outlineRaw,
            outlineChapterCount,
            chapters: nextChapters,
            activeChapterId: nextActiveChapterId,
            generationConfig
        });

        setShowSettings(false);
    };

    const handleAddWork = () => {
        const title = newWorkTitle.trim();
        if (!title) return;
        const now = Date.now();
        const newWorkId = `work-${now}-${works.length + 1}`;
        setWorks(prev => {
            const updated = [
                ...prev,
                { id: newWorkId, title, createdAt: now, updatedAt: now }
            ];
            StorageManager.setJSON(worksKey, updated);
            return updated;
        });
        setNewWorkTitle('');
        StorageManager.remove(userClearedKey);
        StorageManager.set(activeWorkKey, newWorkId);
        setActiveWorkId(newWorkId);
    };

    const handleApplyGeneratedOutline = () => {
        const parsed = parseOutline(outlineRaw);
        setChapters(parsed);
        if (parsed.length > 0) setActiveChapterId(parsed[0].id);

        // Also save to storage
        saveWorkContext(activeWorkId, {
            worldSetting,
            style: styleRef,
            outline: outlineRaw,
            outlineChapterCount,
            chapters: parsed,
            activeChapterId: parsed[0]?.id || '',
            generationConfig
        });

        setShowOutlineGen(false);
    };

    const handleSelectWork = (workId: string) => {
        if (!workId || workId === activeWorkId) {
            setShowWorksManager(false);
            return;
        }
        saveWorkContext(activeWorkId, {
            worldSetting,
            style: styleRef,
            outline: outlineRaw,
            outlineChapterCount,
            chapters,
            activeChapterId,
            generationConfig
        });
        StorageManager.set(activeWorkKey, workId);
        setActiveWorkId(workId);
        setShowWorksManager(false);
    };

    const handleDeleteChapter = (chapterId: string) => {
        if (!confirm('确定要删除该章节吗？删除后无法恢复！')) return;
        
        const nextChapters = chapters.filter(c => c.id !== chapterId);
        setChapters(nextChapters);
        
        // If we deleted the active chapter, switch to another one
        if (activeChapterId === chapterId) {
            setActiveChapterId(nextChapters.length > 0 ? nextChapters[0].id : '');
        }
        
        // Also need to update outlineRaw to reflect deletion?
        // This is tricky because outlineRaw is the source of truth for generation.
        // If we delete a chapter object but keep it in outlineRaw, it might reappear on re-parse.
        // Ideally we should remove it from outlineRaw too, but parsing text back is hard.
        // For now, let's just update the chapters state and save context.
        // Note: If user re-generates or re-parses from outlineRaw, the chapter might come back if outlineRaw wasn't updated.
        // We accept this limitation for now, or we could try to remove the chapter text from outlineRaw.
        
        saveWorkContext(activeWorkId, {
            worldSetting,
            style: styleRef,
            outline: outlineRaw,
            outlineChapterCount,
            chapters: nextChapters,
            activeChapterId: activeChapterId === chapterId ? (nextChapters.length > 0 ? nextChapters[0].id : '') : activeChapterId,
            generationConfig
        });
    };

    const handleDeleteWork = async (workId: string, workTitle: string) => {
        if (!workId) return;
        if (!confirm(`确定要删除作品"${workTitle}"吗？此操作将删除作品所有相关数据，无法恢复！`)) return;
        await StorageManager.deleteWorkContext(workId);
        const updated = works.filter(work => work.id !== workId);
        StorageManager.setJSON(worksKey, updated);
        setWorks(updated);
        if (updated.length === 0) {
            StorageManager.set(userClearedKey, 'true');
            StorageManager.remove(activeWorkKey);
            setActiveWorkId('');
            setChapters([]);
            setActiveChapterId('');
            setWorldSetting('');
            setStyleRef('');
            setOutlineRaw('');
            setGenerationConfig(prev => ({ ...prev, startChapter: 1, endChapter: 1 }));
            return;
        }
        if (workId === activeWorkId) {
            const nextActiveId = updated[0].id;
            StorageManager.set(activeWorkKey, nextActiveId);
            setActiveWorkId(nextActiveId);
        }
    };

    const handleGenerateOutline = async () => {
        if (!outlineIdea.trim()) {
            alert('请输入大纲内容');
            return;
        }

        // Use RAG Configuration for Outline (Module 1/2 Logic)
        const apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        const baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        const model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';

        setOutlineRaw(prev => prev ? prev + '\n\n' : ''); // Don't clear, append with separator if needed?
        // Wait, if we are appending, we need to handle the state update carefully.
        // Actually, for a new generation run, we usually want to see the new output streaming.
        // But if the user wants to *keep* old chapters, we should merge.
        // The current logic parses `outlineRaw` into `chapters`.
        // If we overwrite `outlineRaw`, previous chapters are lost from the view (since view is derived from outlineRaw? No, setChapters is separate).
        
        // Let's check handleApplyGeneratedOutline. It parses `outlineRaw` and calls `setChapters`.
        // If we want to support incremental generation, we should probably append to `outlineRaw`.
        // BUT, streaming updates `outlineRaw` in real-time.
        
        // Strategy: 
        // 1. Keep the existing `outlineRaw` (which contains previous volumes).
        // 2. Stream the new volume content into a *temporary* buffer.
        // 3. Once done, or during streaming, append it to `outlineRaw`?
        // The `startOutlineGeneration` hook updates `outlineRaw` directly via `onUpdate`.
        
        // Let's look at `startOutlineGeneration`. It probably calls `setOutlineRaw(content)`.
        // We need to change that behavior to `setOutlineRaw(prev => prev + content)`? No, the hook usually returns the *full* content of the current stream.
        
        // Correct approach:
        
        const existingOutline = outlineRaw; // Snapshot existing content
        
        try {
            const cardContext = selectedCards.length > 0
                ? selectedCards.map(c => `设定资料（${c.type} - ${c.title}）：\n${c.analysis || c.example}`).join('\n\n')
                : '无';

            const baseSystemPrompt = customSystemPrompt.trim() || '你是资深网文主编，擅长深度融合提供的设定资料，根据创意生成节奏紧凑、期待感强且信息密度高的章节细纲。你能够自然地将资料中的细节、逻辑或元素内化到故事中，绝不生硬地提及“卡牌”或“资料来源”。';
            
            // 构建分卷提示词
            let volumeInstruction = '';
            if (outlineStartChapter > 1 || outlineEndChapter < (outlineChapterCount || 100)) {
                volumeInstruction = `\n**分卷生成模式**：本次任务只需生成【第${outlineStartChapter}章】到【第${outlineEndChapter}章】之间的细纲。请确保剧情在这段范围内有完整的起承转合，如果这是某一卷的中间部分，请注意承接前文逻辑。`;
            }

            const extraRequirements = [
                outlineChapterCount ? `总章数：${outlineChapterCount}` : '',
                `本次生成范围：第${outlineStartChapter}章 到 第${outlineEndChapter}章`,
                volumeInstruction,
                `请务必根据以上范围，生成这 ${outlineEndChapter - outlineStartChapter + 1} 章的详细细纲。`,
                `**重要要求1：严格按照章节顺序生成，严禁跳过任何章节，必须连续编号（如第${outlineStartChapter}章、第${outlineStartChapter + 1}章...）。**`,
                `**重要要求2：请将“参考设定资料”中的内容深度融合进细纲中，但严禁在生成的文字中出现“根据资料”、“卡牌”、“设定集”等字眼。直接展示故事内容即可。**`
            ].filter(Boolean).join('\n');
            const composedSystemPrompt = [baseSystemPrompt, extraRequirements].filter(Boolean).join('\n');

            // 智能提取分卷内容：如果处于分卷生成模式，只将该卷的大纲内容传给 AI，避免上下文过长或跑题
            let targetIdea = outlineIdea;
            if (volumeInstruction && detectedVolumes.length > 0) {
                // 尝试找到当前章范围对应的分卷
                const matchedVol = detectedVolumes.find(v => 
                    // 简单的重叠检测：如果生成的起始章或结束章在分卷范围内
                    (outlineStartChapter >= v.startIndex && outlineStartChapter <= v.endIndex) ||
                    (outlineEndChapter >= v.startIndex && outlineEndChapter <= v.endIndex)
                );

                if (matchedVol) {
                    console.log('智能分卷锁定:', matchedVol.title);
                    const lines = outlineIdea.split('\n');
                    const volRegex = /^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i;
                    
                    // 找到该分卷标题所在的行
                    const startLineIdx = lines.findIndex(l => l.includes(matchedVol.title));
                    if (startLineIdx !== -1) {
                        // 找到下一个分卷标题所在的行（或者结尾）
                        let endLineIdx = lines.length;
                        for (let k = startLineIdx + 1; k < lines.length; k++) {
                             if (volRegex.test(lines[k].trim())) {
                                 endLineIdx = k;
                                 break;
                             }
                        }
                        
                        // 提取分卷内容
                        const volText = lines.slice(startLineIdx, endLineIdx).join('\n');
                        
                        // 保留前置全局信息（通常第一卷之前的内容是全局设定或书名）
                        // 简单的启发式：取第一个分卷标题之前的所有内容
                        const firstVolIdx = lines.findIndex(l => volRegex.test(l.trim()));
                        const globalContext = firstVolIdx > 0 ? lines.slice(0, firstVolIdx).join('\n') : '';

                        targetIdea = (globalContext + '\n\n' + volText).trim();
                        // 补充提示
                        volumeInstruction += `\n(已自动截取大纲中【${matchedVol.title}】及其相关内容作为参考)`;
                    }
                }
            }

            await startOutlineGeneration({
                idea: targetIdea,
                chapterCount: outlineChapterCount,
                worldSetting: worldSetting || '无',
                cardContext: cardContext,
                customSystemPrompt: composedSystemPrompt,
                modelConfig: { apiKey, baseUrl, model },
                appendMode: !!existingOutline, // 启用追加模式
                existingContent: existingOutline // 传入已有内容
            });

        } catch (error: any) {
            console.error('Outline generation failed', error);
            alert(`生成失败: ${error.message}`);
        }
    };

    // Generation Logic
    const handleBatchGenerate = async () => {
        if (isGenerating) {
            // Stop
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setIsGenerating(false);
            return;
        }

        if (chapters.length === 0) {
            alert('请先生成细纲');
            setShowOutlineGen(true);
            return;
        }

        setIsGenerating(true);
        abortControllerRef.current = new AbortController();

        const { model, startChapter, endChapter, wordCount } = generationConfig;

        // Ensure valid range
        const validStart = Math.max(1, Math.min(startChapter, chapters.length));
        const validEnd = Math.max(validStart, Math.min(endChapter, chapters.length));

        // Calculate indices (0-based)
        const startIndex = validStart - 1;
        const endIndex = validEnd - 1;

        const targetChapters = chapters.slice(startIndex, endIndex + 1);

        // Sequential Generation Loop
        for (let i = 0; i < targetChapters.length; i++) {
            // Check abort signal at the start of each loop
            if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
                console.log('Batch generation aborted');
                break;
            }

            // Dynamic index lookup to handle state changes (e.g. reordering)
            const targetId = targetChapters[i].id;
            const chapterIndex = chaptersRef.current.findIndex(c => c.id === targetId);
            
            if (chapterIndex === -1) {
                console.warn(`Chapter ${targetId} not found or deleted during generation`);
                continue;
            }
            
            const chapter = chaptersRef.current[chapterIndex];

            // Update Status: Generating
            updateChapterStatus(chapter.id, 'generating', '');
            setActiveChapterId(chapter.id); // Scroll to/Focus current

            try {
                // Writing Requirements
                const prevChapter = chapterIndex > 0 ? chaptersRef.current[chapterIndex - 1] : null;
                const nextChapter = chapterIndex + 1 < chaptersRef.current.length ? chaptersRef.current[chapterIndex + 1] : null;
                const prevEnding = prevChapter?.content ? prevChapter.content.slice(-600) : '';

                // Helper: Extract Volume Outline
                // 智能识别当前章节所属的“卷”范围，并只截取该卷的大纲
                // 规则：
                // 1. 向上寻找最近的一个“卷”标记（如 第X卷）
                // 2. 向下寻找下一个“卷”标记
                // 3. 截取两者之间的内容作为 volumeOutline
                // 4. 如果找不到卷标记，则使用全文大纲的前 2000 字（避免过长）
                const getVolumeOutline = (fullOutline: string, currentTitle: string): string => {
                    const lines = fullOutline.split('\n');
                    let startLine = 0;
                    let endLine = lines.length;
                    
                    // 1. Find line index of current chapter title
                    const currentLineIndex = lines.findIndex(l => l.includes(currentTitle));
                    
                    if (currentLineIndex !== -1) {
                        // Look upwards for Volume header
                        for (let k = currentLineIndex; k >= 0; k--) {
                            if (lines[k].match(/^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i)) {
                                startLine = k;
                                break;
                            }
                        }
                        // Look downwards for next Volume header
                        for (let k = currentLineIndex + 1; k < lines.length; k++) {
                            if (lines[k].match(/^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i)) {
                                endLine = k;
                                break;
                            }
                        }
                    } else {
                        // Fallback: If strict volume not found, just take a sliding window around the estimated chapter position
                        // Or just clamp to 2000 chars if no structure
                        return fullOutline.length > 3000 ? fullOutline.slice(0, 3000) + '...(下略)' : fullOutline;
                    }

                    // Extract the volume part
                    let volumePart = lines.slice(startLine, endLine).join('\n').trim();

                    // 保留前置全局信息（通常第一卷之前的内容是全局设定或书名）
                    // 简单的启发式：取第一个分卷标题之前的所有内容
                    const volRegex = /^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i;
                    const firstVolIdx = lines.findIndex(l => volRegex.test(l.trim()));
                    const globalContext = firstVolIdx > 0 ? lines.slice(0, firstVolIdx).join('\n') : '';

                    if (globalContext && startLine > 0) {
                        volumePart = globalContext + '\n\n' + volumePart;
                    }
                    
                    // If volume part is too long (>3000 chars), we should still clamp it, but center around current chapter if possible
                    if (volumePart.length > 3000) {
                         const subLines = volumePart.split('\n');
                         const subIndex = subLines.findIndex(l => l.includes(currentTitle));
                         if (subIndex !== -1) {
                             const subStart = Math.max(0, subIndex - 20); // 20 lines before
                             const subEnd = Math.min(subLines.length, subIndex + 40); // 40 lines after
                             return subLines.slice(subStart, subEnd).join('\n');
                         }
                         return volumePart.slice(0, 3000) + '...(下略)';
                    }
                    
                    return volumePart;
                };

                const volumeOutline = getVolumeOutline(outlineRaw || '', chapter.title);

                const context = `
# 世界观设定
${worldSetting.slice(0, 1000)}...

# 当前卷细纲 (重点参考)
${volumeOutline || '无'}

# 上一章概要
${prevChapter ? prevChapter.summary : '无（这是第一章）'}

# 上一章结尾片段
${prevEnding || '无'}

# 本章大纲
${chapter.title}
${chapter.summary || '无'}

# 下一章预告
${nextChapter ? `${nextChapter.title}\n${nextChapter.summary}` : '无（这是最后一章）'}

# 写作要求
风格：${styleRef}
请根据以上信息，撰写本章正文。
1. 严格遵循本章大纲：必须覆盖摘要中的所有关键情节，不得跳过或省略。
2. 承上启下：必须承接上一章结尾，并自然过渡到本章剧情；结尾设置钩子。
3. 节奏与细节：画面感强，代入感强，节奏紧凑。
4. 严格控制字数：必须控制在${wordCount || 2000}字左右。请勿大幅超出或不足，如果内容过多请精简，过少请丰富细节。
请再读一遍【全局细纲】与【本章大纲】，确保剧情连贯且无遗漏。
                `.trim();

                // Use Writing Configuration for Content Generation (Module 3-6 Logic)
                const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
                const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';

                let fullContent = '';

                await generateAIContentStream(
                    apiKey,
                    '你是一位专业的小说家，擅长创作高留存的网文。',
                    context,
                    baseUrl,
                    model,
                    (chunk) => {
                        fullContent = chunk;
                        // Real-time update
                        setChapters(prev => prev.map(c =>
                            c.id === chapter.id ? { ...c, content: chunk } : c
                        ));
                    },
                    abortControllerRef.current.signal,
                    4000 // Max tokens constraint for generation (approx 3000-4000 Chinese chars limit usually)
                );

                // Update Status: Completed
                updateChapterStatus(chapter.id, 'completed', fullContent);

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.log('Generation paused');
                    break;
                }
                console.error(`Failed to generate chapter ${chapter.title}`, error);
                updateChapterStatus(chapter.id, 'error');
            }
        }

        setIsGenerating(false);
        abortControllerRef.current = null;
    };

    const handleRegenerateChapter = async (chapterId: string) => {
        if (isGenerating) return;
        
        const chapterIndex = chapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return;
        
        if (!confirm('确定要重新生成该章节吗？原内容将被覆盖！')) return;

        setIsGenerating(true);
        abortControllerRef.current = new AbortController();
        
        const chapter = chapters[chapterIndex];
        const { model, wordCount } = generationConfig;

        // Update Status: Generating
        updateChapterStatus(chapter.id, 'generating', '');
        setActiveChapterId(chapter.id);

        try {
            // Writing Requirements
            const prevChapter = chapterIndex > 0 ? chaptersRef.current[chapterIndex - 1] : null;
            const nextChapter = chapterIndex + 1 < chaptersRef.current.length ? chaptersRef.current[chapterIndex + 1] : null;
            const prevEnding = prevChapter?.content ? prevChapter.content.slice(-600) : '';

            // Helper: Extract Volume Outline
            const getVolumeOutline = (fullOutline: string, currentTitle: string): string => {
                const lines = fullOutline.split('\n');
                let startLine = 0;
                let endLine = lines.length;
                const currentLineIndex = lines.findIndex(l => l.includes(currentTitle));
                
                if (currentLineIndex !== -1) {
                    for (let k = currentLineIndex; k >= 0; k--) {
                        if (lines[k].match(/^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i)) {
                            startLine = k;
                            break;
                        }
                    }
                    for (let k = currentLineIndex + 1; k < lines.length; k++) {
                        if (lines[k].match(/^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i)) {
                            endLine = k;
                            break;
                        }
                    }
                } else {
                    return fullOutline.length > 3000 ? fullOutline.slice(0, 3000) + '...(下略)' : fullOutline;
                }

                let volumePart = lines.slice(startLine, endLine).join('\n').trim();
                const volRegex = /^(?:#+\s*)?(?:[\*]*\s*)?(?:第[0-9一二三四五六七八九十]+卷|Volume\s+\d+|卷\s*[0-9一二三四五六七八九十]+)/i;
                const firstVolIdx = lines.findIndex(l => volRegex.test(l.trim()));
                const globalContext = firstVolIdx > 0 ? lines.slice(0, firstVolIdx).join('\n') : '';

                if (globalContext && startLine > 0) {
                    volumePart = globalContext + '\n\n' + volumePart;
                }
                
                if (volumePart.length > 3000) {
                     const subLines = volumePart.split('\n');
                     const subIndex = subLines.findIndex(l => l.includes(currentTitle));
                     if (subIndex !== -1) {
                         const subStart = Math.max(0, subIndex - 20); 
                         const subEnd = Math.min(subLines.length, subIndex + 40);
                         return subLines.slice(subStart, subEnd).join('\n');
                     }
                     return volumePart.slice(0, 3000) + '...(下略)';
                }
                
                return volumePart;
            };

            const volumeOutline = getVolumeOutline(outlineRaw || '', chapter.title);

            const context = `
# 世界观设定
${worldSetting.slice(0, 1000)}...

# 当前卷细纲 (重点参考)
${volumeOutline || '无'}

# 上一章概要
${prevChapter ? prevChapter.summary : '无（这是第一章）'}

# 上一章结尾片段
${prevEnding || '无'}

# 本章大纲
${chapter.title}
${chapter.summary || '无'}

# 下一章预告
${nextChapter ? `${nextChapter.title}\n${nextChapter.summary}` : '无（这是最后一章）'}

# 写作要求
风格：${styleRef}
请根据以上信息，撰写本章正文。
1. 严格遵循本章大纲：必须覆盖摘要中的所有关键情节，不得跳过或省略。
2. 承上启下：必须承接上一章结尾，并自然过渡到本章剧情；结尾设置钩子。
3. 节奏与细节：画面感强，代入感强，节奏紧凑。
4. 字数：${wordCount || 2000}字以上。
请再读一遍【全局细纲】与【本章大纲】，确保剧情连贯且无遗漏。
            `.trim();

            const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
            const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';

            let fullContent = '';

            await generateAIContentStream(
                apiKey,
                '你是一位专业的小说家，擅长创作高留存的网文。',
                context,
                baseUrl,
                model,
                (chunk) => {
                    fullContent = chunk;
                    setChapters(prev => prev.map(c =>
                        c.id === chapter.id ? { ...c, content: chunk } : c
                    ));
                },
                abortControllerRef.current.signal
            );

            updateChapterStatus(chapter.id, 'completed', fullContent);

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation paused');
            } else {
                console.error(`Failed to generate chapter ${chapter.title}`, error);
                updateChapterStatus(chapter.id, 'error');
                alert(`生成失败: ${error.message}`);
            }
        }
        
        setIsGenerating(false);
        abortControllerRef.current = null;
    };

    const updateChapterStatus = (id: string, status: Chapter['status'], content?: string) => {
        setChapters(prev => prev.map(c =>
            c.id === id ? { ...c, status, ...(content !== undefined ? { content } : {}) } : c
        ));
    };

    const activeChapter = chapters.find(c => c.id === activeChapterId);

    const buildExportText = (chapterList: Chapter[]) => {
        return chapterList
            .filter(c => c.content)
            .map(c => `${c.title}\n\n${c.content}`)
            .join('\n\n');
    };

    const downloadText = (text: string, filename: string) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExport = () => {
        const text = buildExportText(chapters);
        if (!text) return alert('没有可导出的内容');
        downloadText(text, `小说导出_${new Date().toLocaleDateString()}.txt`);
    };

    const handleExportWork = async (work: WorkItem) => {
        let chapterList = chapters;
        let outlineText = outlineRaw;

        // If exporting a non-active work, load from storage
        if (work.id !== activeWorkId) {
            const savedContext = await StorageManager.getJSONAsync(getWorkContextKey(work.id));
            const savedChapters = Array.isArray(savedContext?.chapters) ? savedContext.chapters : [];
            if (savedChapters.length > 0) {
                chapterList = savedChapters;
            } else if (savedContext?.outline) {
                chapterList = parseOutline(savedContext.outline);
            } else {
                chapterList = [];
            }
            outlineText = savedContext?.outline || '';
        }

        if (chapterList.length === 0) return alert('没有可导出的内容');

        // Parse volumes and group content
        const lines = outlineText.split('\n');
        const volumeContentMap: Record<string, string[]> = {};
        const volumeOrder: string[] = [];
        let currentVol = '正文'; // Default volume name
        
        const volRegex = /^(?:#+\s*)?(?:第\s*[0-9一二三四五六七八九十]+\s*卷|Volume\s*\d+|卷\s*[0-9一二三四五六七八九十]+)/i;
        const chRegex = /^(?:#+\s*)?(?:第\s*[0-9一二三四五六七八九十百千]+\s*章|Chapter\s*\d+|\d+\.)\s*(.*)/i;

        let chIndex = 0;
        lines.forEach(line => {
            const trimmed = line.trim();
            if (volRegex.test(trimmed)) {
                currentVol = trimmed.replace(/#/g, '').trim();
                if (!volumeContentMap[currentVol]) {
                    volumeContentMap[currentVol] = [];
                    volumeOrder.push(currentVol);
                }
            } else if (chRegex.test(trimmed)) {
                if (chIndex < chapterList.length) {
                    const ch = chapterList[chIndex];
                    if (ch.content) {
                        if (!volumeContentMap[currentVol]) {
                            volumeContentMap[currentVol] = [];
                            volumeOrder.push(currentVol);
                        }
                        volumeContentMap[currentVol].push(`${ch.title}\n\n${ch.content}`);
                    }
                }
                chIndex++;
            }
        });

        // Create ZIP
        const zip = new JSZip();
        let hasContent = false;

        volumeOrder.forEach(volName => {
            const texts = volumeContentMap[volName];
            if (texts && texts.length > 0) {
                zip.file(`${volName}.txt`, texts.join('\n\n' + '='.repeat(20) + '\n\n'));
                hasContent = true;
            }
        });

        // Fallback if no volume structure detected but content exists
        if (!hasContent) {
             const fullText = chapterList.filter(c => c.content).map(c => `${c.title}\n\n${c.content}`).join('\n\n');
             if (fullText) {
                 zip.file(`${work.title || '正文'}.txt`, fullText);
                 hasContent = true;
             }
        }

        if (!hasContent) return alert('没有可导出的内容');

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (work.title || '小说').replace(/[\\/:*?"<>|]/g, '_');
        a.download = `${safeTitle}_导出.zip`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportToModule7 = async () => {
        if (chapters.length === 0) return alert('没有章节可导入，请先生成或编写内容');
        if (!confirm('确定将当前作品导入到墨灵编辑器（模块七）吗？\n\n导入后将创建一个新书架项目，包含当前所有章节。')) return;

        try {
            const savedProjects = await StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS) || [];
            const currentWorkTitle = works.find(w => w.id === activeWorkId)?.title || '万字冲刺作品';

            const newBook = {
                id: `book-${Date.now()}`,
                title: `${currentWorkTitle} (冲刺导入)`,
                type: 'book',
                isOpen: true,
                children: [
                    {
                        id: `vol-${Date.now()}`,
                        title: '正文卷',
                        type: 'volume',
                        isOpen: true,
                        children: chapters.map((ch, idx) => ({
                            id: `ch-${Date.now()}-${idx}`,
                            title: ch.title,
                            type: 'chapter',
                            content: ch.content || '',
                            summary: ch.summary || '',
                            children: []
                        }))
                    }
                ]
            };

            const updatedProjects = [...savedProjects, newBook];
            StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, updatedProjects);
            
            if(confirm('导入成功！是否立即前往墨灵编辑器查看？')) {
                // Navigate to Module 7
                window.location.href = '/module/module7';
            }
        } catch (e: any) {
            console.error('Import failed', e);
            alert(`导入失败: ${e.message}`);
        }
    };

    // Page Skill Handler
    useEffect(() => {
        const handlePageSkill = async (payload: { action: string; value?: any }) => {
            const { action, value } = payload;
            if (action === 'set_outline_idea') setOutlineIdea(String(value));
            if (action === 'set_world_setting') setWorldSetting(String(value));
            if (action === 'set_style') setStyleRef(String(value));
            if (action === 'set_outline_text') setOutlineRaw(String(value));
            if (action === 'generate_outline') {
                setShowOutlineGen(true);
                // Allow state update to propagate
                setTimeout(() => handleGenerateOutline(), 100);
            }
            if (action === 'batch_generate') handleBatchGenerate();
            if (action === 'create_work') {
                if (value) setNewWorkTitle(String(value));
                handleAddWork();
            }
        };

        registerPageSkill('page_control', handlePageSkill);
        return () => unregisterPageSkill('page_control');
    }, [registerPageSkill, unregisterPageSkill, handleGenerateOutline, handleBatchGenerate, handleAddWork]);

    return (
        <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-[#18181b] text-gray-300 font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>

            {/* Top Bar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#18181b] shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-[#27272a] rounded-lg p-1">
                        <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxHome ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>MAX 主页</Link>
                        <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxIdea ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>脑洞风暴</Link>
                        <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxDismantle ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>拆书</Link>
                        <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxOutline ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>大纲生成</Link>
                        <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxCreation ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>万字冲刺</Link>
                        <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxPolish ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>自循环</Link>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <h1 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        批量创作工作台
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#27272a] rounded-lg px-2 py-1 border border-white/10">
                        <span className="text-xs text-gray-400">章节范围:</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min="1"
                                max={chapters.length || 1}
                                value={generationConfig.startChapter || ''}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    setGenerationConfig(p => ({ ...p, startChapter: val }));
                                }}
                                className="w-12 bg-[#09090b] text-center text-xs text-white outline-none border border-white/10 rounded px-1 focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-gray-600">-</span>
                            <input
                                type="number"
                                min="1"
                                max={chapters.length || 1}
                                value={generationConfig.endChapter || ''}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    setGenerationConfig(p => ({ ...p, endChapter: val }));
                                }}
                                className="w-12 bg-[#09090b] text-center text-xs text-white outline-none border border-white/10 rounded px-1 focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-gray-400 ml-1">/ {chapters.length} 章</span>
                        </div>
                    </div>
                    <button
                        onClick={handleImportToModule7}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#27272a] text-gray-300 hover:text-white hover:bg-[#3f3f46] transition-all border border-white/10"
                        title="导入到墨灵编辑器"
                    >
                        <BookPlus className="w-3.5 h-3.5" />
                        导入编辑器
                    </button>
                    <button
                        onClick={handleBatchGenerate}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isGenerating
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-purple-900/20'
                            }`}
                    >
                        {isGenerating ? <><Pause className="w-3 h-3" /> 暂停生成</> : <><Play className="w-3 h-3" /> 批量生成</>}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar: Chapter List */}
                <div className="w-64 bg-[#18181b] border-r border-white/10 flex flex-col shrink-0">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setShowWorksManager(true)}
                            className="text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
                        >
                            作品
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowOutlineGen(true)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all"
                                title="生成细纲"
                            >
                                <BrainCircuit className="w-3 h-3" />
                                生成细纲
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
                                title="细纲设置"
                            >
                                <Settings className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-500">{chapters.length}</span>
                        </div>
                    </div>
                    {chapters.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-xs">
                            <p>暂无章节</p>
                            <p className="mt-2">点击上方“生成细纲”创建章节</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {/* Group chapters by Volume if possible */}
                            {(() => {
                                // Try to group chapters by detected volumes
                                const volumes: { title: string; chapters: Chapter[] }[] = [];
                                let currentVolume: { title: string; chapters: Chapter[] } | null = null;
                                let looseChapters: Chapter[] = [];

                                // Simple heuristic: Use the outline detected volumes
                                // BUT we need to map chapter indices to these volumes.
                                // Or we can scan chapter titles for volume headers? No, chapters usually just have "Chapter X".
                                // We should rely on the `detectedVolumes` state which maps indices.
                                
                                if (detectedVolumes.length > 0) {
                                    // Use detected volumes map
                                    // detectedVolumes: { startIndex: 1, endIndex: 20, title: "Vol 1" }
                                    // chapters are 0-indexed in array, but IDs are usually sequential or we rely on index order.
                                    // Let's assume chapters array order matches outline order.
                                    
                                    let chapIdx = 0;
                                    
                                    // Pre-chapters (before first volume)
                                    if (detectedVolumes[0].startIndex > 1) {
                                        const preCount = detectedVolumes[0].startIndex - 1;
                                        const preChaps = chapters.slice(0, preCount);
                                        if (preChaps.length > 0) {
                                            volumes.push({ title: '序章 / 前传', chapters: preChaps });
                                        }
                                        chapIdx = preCount;
                                    }

                                    detectedVolumes.forEach(vol => {
                                        // Calculate slice indices
                                        // vol.startIndex is 1-based index
                                        const start = Math.max(0, vol.startIndex - 1);
                                        const end = Math.min(chapters.length, vol.endIndex);
                                        
                                        if (start < chapters.length) {
                                             const volChaps = chapters.slice(start, end);
                                             if (volChaps.length > 0) {
                                                 volumes.push({ title: vol.title, chapters: volChaps });
                                             }
                                        }
                                    });
                                    
                                    // Remaining chapters
                                    const lastVol = detectedVolumes[detectedVolumes.length - 1];
                                    if (lastVol.endIndex < chapters.length) {
                                        const remaining = chapters.slice(lastVol.endIndex);
                                        if (remaining.length > 0) {
                                            volumes.push({ title: '未分卷章节', chapters: remaining });
                                        }
                                    }
                                } else {
                                    // No volumes detected, put all in one bucket or just list them
                                    return chapters.map((chapter, idx) => (
                                        <div className="flex items-center group w-full" key={chapter.id}>
                                            <button
                                                onClick={() => setActiveChapterId(chapter.id)}
                                                className={`flex-1 text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-center gap-3 group ${activeChapterId === chapter.id
                                                        ? 'bg-[#27272a] text-white border border-white/10 shadow-sm'
                                                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                                    }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${chapter.status === 'completed' ? 'bg-green-500' :
                                                        chapter.status === 'generating' ? 'bg-yellow-500 animate-pulse' :
                                                            chapter.status === 'error' ? 'bg-red-500' :
                                                                'bg-gray-700 group-hover:bg-gray-600'
                                                    }`}></div>
                                                <div className="truncate flex-1">
                                                    <span className="font-mono opacity-50 mr-2">{String(idx + 1).padStart(2, '0')}</span>
                                                    {chapter.title}
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRegenerateChapter(chapter.id);
                                                }}
                                                className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 mr-1"
                                                title="重新生成"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteChapter(chapter.id);
                                                }}
                                                className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 mr-1"
                                                title="删除章节"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18"></path>
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    ));
                                }

                                // Render Grouped Volumes
                                return volumes.map((vol, vIdx) => {
                                    const isExpanded = expandedVolumes.has(vol.title);
                                    return (
                                        <div key={vIdx} className="mb-2">
                                            <button 
                                                onClick={() => toggleVolume(vol.title)}
                                                className="w-full px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 bg-[#18181b] sticky top-0 z-10 hover:text-gray-300 transition-colors"
                                            >
                                                <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                                    <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2 1L4 3L2 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </span>
                                                <span className="w-1 h-3 bg-purple-500/50 rounded-full"></span>
                                                {vol.title}
                                            </button>
                                            
                                            {isExpanded && (
                                                <div className="space-y-0.5 pl-2 border-l border-white/5 ml-2.5 mt-1">
                                                    {vol.chapters.map((chapter) => {
                                                        const globalIdx = chapters.findIndex(c => c.id === chapter.id);
                                                        return (
                                                            <div className="flex items-center group w-full" key={chapter.id}>
                                                                <button
                                                                    onClick={() => setActiveChapterId(chapter.id)}
                                                                    className={`flex-1 text-left px-3 py-2 rounded-md text-xs transition-all flex items-center gap-3 group ${activeChapterId === chapter.id
                                                                            ? 'bg-[#27272a] text-white'
                                                                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                                                        }`}
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${chapter.status === 'completed' ? 'bg-green-500' :
                                                                            chapter.status === 'generating' ? 'bg-yellow-500 animate-pulse' :
                                                                                chapter.status === 'error' ? 'bg-red-500' :
                                                                                    'bg-gray-700 group-hover:bg-gray-600'
                                                                        }`}></div>
                                                                    <div className="truncate flex-1">
                                                                        <span className="font-mono opacity-30 mr-2 text-[10px]">{String(globalIdx + 1).padStart(2, '0')}</span>
                                                                        {chapter.title}
                                                                    </div>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRegenerateChapter(chapter.id);
                                                                    }}
                                                                    className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 mr-1"
                                                                    title="重新生成"
                                                                >
                                                                    <RefreshCw className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteChapter(chapter.id);
                                                                    }}
                                                                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0 mr-1"
                                                                    title="删除章节"
                                                                >
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M3 6h18"></path>
                                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>

                {/* Center: Editor */}
                <div className="flex-1 flex flex-col bg-[#09090b] relative">
                    {/* Editor Toolbar */}
                    <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#09090b]/50 backdrop-blur shrink-0">
                        <span className="text-xs text-gray-500 font-mono">
                            {activeChapter?.title || '未选择章节'}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600">
                                {activeChapter?.content ? `${activeChapter.content.length} 字` : '0 字'}
                            </span>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {activeChapter ? (
                                <>
                                    {activeChapter.content ? (
                                        <div className="prose prose-invert prose-p:leading-loose prose-p:text-gray-300 prose-lg max-w-none font-serif">
                                            <ReactMarkdown>{activeChapter.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="h-[400px] flex flex-col items-center justify-center text-gray-700 gap-4 border-2 border-dashed border-white/5 rounded-xl">
                                            <Sparkles className="w-8 h-8 opacity-20" />
                                            <p>本章暂无内容</p>
                                            <button
                                                onClick={() => {
                                                    setGenerationConfig(p => ({
                                                        ...p,
                                                        startChapter: chapters.findIndex(c => c.id === activeChapter.id) + 1,
                                                        endChapter: chapters.findIndex(c => c.id === activeChapter.id) + 1
                                                    }));
                                                    handleBatchGenerate();
                                                }}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors"
                                            >
                                                生成当前章节
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-gray-600 mt-20">请在左侧选择一个章节</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showWorksManager && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                作品管理
                                <button 
                                    onClick={() => setShowCloudSync(true)}
                                    className="ml-2 p-1.5 rounded-full bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
                                    title="云端同步"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                </button>
                            </h2>
                            <button onClick={() => setShowWorksManager(false)} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newWorkTitle}
                                    onChange={(e) => setNewWorkTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddWork();
                                    }}
                                    className="flex-1 px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all"
                                    placeholder="输入作品名称..."
                                />
                                <button
                                    type="button"
                                    onClick={handleAddWork}
                                    className="px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
                                >
                                    新增作品
                                </button>
                            </div>
                            {works.length === 0 ? (
                                <div className="text-xs text-gray-500">暂无作品</div>
                            ) : (
                                <div className="space-y-2">
                                    {works.map(work => (
                                        <div
                                            key={work.id}
                                            onClick={() => handleSelectWork(work.id)}
                                            className={`flex items-center justify-between px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg cursor-pointer group ${activeWorkId === work.id ? 'bg-purple-500/10 border-purple-500/40' : 'hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {activeWorkId === work.id && (
                                                    <Check className="w-3 h-3 text-purple-400 shrink-0" />
                                                )}
                                                <span className="text-xs text-gray-200 truncate">{work.title}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExportWork(work);
                                                    }}
                                                    className="p-1 text-gray-500 hover:text-purple-300 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="导出作品"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500">{new Date(work.createdAt).toLocaleDateString()}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteWork(work.id, work.title);
                                                    }}
                                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                    title="删除作品"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cloud Sync Modal */}
            {showCloudSync && (
                <CloudSyncModal 
                    isOpen={showCloudSync} 
                    onClose={() => setShowCloudSync(false)} 
                />
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Settings className="w-4 h-4 text-gray-400" />
                                细纲设置
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">世界观 / 背景设定</label>
                                <textarea
                                    value={worldSetting}
                                    onChange={(e) => setWorldSetting(e.target.value)}
                                    rows={5}
                                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all resize-y custom-scrollbar placeholder:text-gray-600"
                                    placeholder="输入小说的世界观、力量体系、背景故事等..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">关联卡牌 (角色/设定)</label>
                                {(selectedCards?.length || 0) === 0 ? (
                                    <div
                                        onClick={() => setShowCardSelector(true)}
                                        className="w-full h-20 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-white/5 hover:text-gray-400 hover:border-white/20 transition-all cursor-pointer gap-2"
                                    >
                                        <User className="w-5 h-5 opacity-50" />
                                        <span className="text-xs">点击选择角色卡 / 设定卡</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCards?.map(card => (
                                            <div key={card.id} className="group relative px-3 py-1.5 bg-[#27272a] border border-white/10 rounded-lg flex items-center gap-2 max-w-full">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
                                                    {card.type}
                                                </span>
                                                <span className="text-xs text-gray-300 truncate max-w-[120px]" title={card.title}>
                                                    {card.title}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCards(prev => prev.filter(c => c.id !== card.id));
                                                    }}
                                                    className="ml-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setShowCardSelector(true)}
                                            className="px-3 py-1.5 border border-dashed border-white/20 rounded-lg text-xs text-gray-500 hover:text-white hover:border-white/40 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">
                                    当前细纲文本 (可手动编辑)
                                </label>
                                <textarea
                                    value={outlineRaw}
                                    onChange={(e) => setOutlineRaw(e.target.value)}
                                    rows={10}
                                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all resize-y custom-scrollbar placeholder:text-gray-600 font-mono"
                                    placeholder={`第1章 觉醒\n主角在废墟中醒来，发现自己...\n\n第2章 逃离\n遭遇变异生物，开始逃亡...`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">写作风格</label>
                                <input
                                    type="text"
                                    value={styleRef}
                                    onChange={(e) => setStyleRef(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all"
                                    placeholder="例如：赛博朋克、黑暗、快节奏、轻松搞笑..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">模型选择</label>
                                <select
                                    value={generationConfig.model}
                                    onChange={(e) => setGenerationConfig(p => ({ ...p, model: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all"
                                >
                                    {availableModels.length > 0 ? (
                                        availableModels.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="gpt-4o">GPT-4o</option>
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            <option value="deepseek-ai/DeepSeek-V3">DeepSeek V3</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2">单章目标字数</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="500"
                                        step="100"
                                        value={generationConfig.wordCount || 2000}
                                        onChange={(e) => setGenerationConfig(p => ({ ...p, wordCount: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all"
                                        placeholder="默认2000"
                                    />
                                    <span className="text-xs text-gray-500 shrink-0">字以上</span>
                                </div>
                            </div>

                        </div>

                        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="px-6 py-2 text-xs font-bold bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                保存设置
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Outline Generator Modal (Independent) */}
            {showOutlineGen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#27272a]/50 rounded-t-xl">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-purple-500" />
                                AI 智能细纲生成器
                            </h2>
                            <button onClick={() => setShowOutlineGen(false)} className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: Inputs */}
                            <div className="w-1/3 border-r border-white/10 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-[#09090b]/30">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-gray-300">1. 大纲</label>
                                    <textarea
                                        value={outlineIdea}
                                        onChange={(e) => setOutlineIdea(e.target.value)}
                                        className="w-full h-32 px-3 py-3 bg-[#09090b] border border-white/10 rounded-lg outline-none text-sm text-gray-300 focus:border-purple-500/50 resize-none"
                                        placeholder="自动带入大纲生成内容，可在此调整"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-300">关联卡牌 ({selectedCards.length})</label>
                                        <button
                                            onClick={() => setShowCardSelector(true)}
                                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> 添加/管理
                                        </button>
                                    </div>
                                    {selectedCards.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCards.map(c => (
                                                <span key={c.id} className="text-[10px] px-2 py-1 bg-[#27272a] border border-white/10 rounded text-gray-300 flex items-center gap-1">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${c.type === '角色' ? 'bg-blue-400' : 'bg-green-400'
                                                        }`}></span>
                                                    {c.title}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-300">2. 细纲生成范式</label>
                                        <button
                                            onClick={() => setShowPromptManager(true)}
                                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                        >
                                            <FileText className="w-3 h-3" /> 提示词库
                                        </button>
                                    </div>
                                    <textarea
                                        value={customSystemPrompt}
                                        onChange={(e) => setCustomSystemPrompt(e.target.value)}
                                        className="w-full h-32 px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 resize-y placeholder:text-gray-600"
                                        placeholder="输入自定义系统提示词..."
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-gray-300">3. 生成设置</label>
                                    <div className="space-y-4">
                                        {/* Total Chapter Count Input - Removed as requested */}
                                        {/* 
                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                            <span>总章数参考 (可选)</span>
                                            ...
                                        </div> 
                                        */}
                                        
                                        <div className="pt-2 border-t border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">分卷识别 / 章节范围</label>
                                            </div>
                                            
                                            {/* Volume Selector */}
                                    {detectedVolumes.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {detectedVolumes.map((vol, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setOutlineStartChapter(vol.startIndex);
                                                        setOutlineEndChapter(vol.endIndex);
                                                    }}
                                                    className="px-2 py-1 text-[10px] rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors truncate max-w-full text-left"
                                                    title={`点击应用：第${vol.startIndex}-${vol.endIndex}章`}
                                                >
                                                    <span className="font-bold">{vol.title}</span>
                                                    <span className="text-gray-500 ml-1 opacity-70">({vol.startIndex}-{vol.endIndex}章)</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                                        <p className="text-[10px] text-purple-300/70 leading-relaxed mb-3">
                                            {detectedVolumes.length > 0 
                                                ? "已从大纲中识别出分卷，点击上方标签可快速设置生成范围。" 
                                                : "在大纲中输入“第X卷”即可自动识别分卷。"}
                                        </p>
                                                <div className="flex items-center gap-3 bg-[#09090b] p-2 rounded-lg border border-white/5 shadow-inner">
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] text-gray-500 ml-1">起始章</span>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={2000}
                                                            value={outlineStartChapter || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                                setOutlineStartChapter(val);
                                                            }}
                                                            className="w-full px-2 py-1.5 bg-[#18181b] border border-white/10 rounded outline-none text-xs text-white focus:border-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                    <div className="text-gray-600 mt-4">至</div>
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] text-gray-500 ml-1">结束章</span>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={2000}
                                                            value={outlineEndChapter || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                                setOutlineEndChapter(val);
                                                            }}
                                                            className="w-full px-2 py-1.5 bg-[#18181b] border border-white/10 rounded outline-none text-xs text-white focus:border-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            * 系统将调用 <span className="text-purple-400">RAG推理模型</span> 进行深度构思。<br />
                                            * 生成的内容包含每章标题和详细细纲。
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4">
                                    <button
                                        onClick={handleGenerateOutline}
                                        disabled={outlineGenState.isGenerating}
                                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                                    >
                                        {outlineGenState.isGenerating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                正在深度构思中...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                开始生成细纲
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Result Preview */}
                            <div className="flex-1 flex flex-col bg-[#09090b]">
                                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#18181b]/50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">生成结果预览</span>
                                        <select
                                            value={generationConfig.model}
                                            onChange={(e) => setGenerationConfig(p => ({ ...p, model: e.target.value }))}
                                            className="px-2 py-1 bg-[#27272a] border border-white/10 rounded text-xs text-gray-300 outline-none focus:border-purple-500/50"
                                        >
                                            {availableModels.length > 0 ? (
                                                availableModels.map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="gpt-4o">GPT-4o</option>
                                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                                    <option value="deepseek-ai/DeepSeek-V3">DeepSeek V3</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-600">可直接编辑下方文本</span>
                                    </div>
                                </div>
                                <textarea
                                    value={outlineRaw}
                                    onChange={(e) => setOutlineRaw(e.target.value)}
                                    className="flex-1 w-full p-6 bg-transparent outline-none text-gray-300 font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                                    placeholder="生成的大纲将显示在这里..."
                                />
                                <div className="p-4 border-t border-white/10 bg-[#18181b] flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowOutlineGen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-white transition-colors"
                                    >
                                        关闭
                                    </button>
                                    <button
                                        onClick={handleApplyGeneratedOutline}
                                        disabled={!outlineRaw.trim()}
                                        className="px-6 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        采用并生成章节列表
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Prompt Manager Modal */}
            {showPromptManager && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <Module10Manager
                            initialModuleId="module_max"
                            onSelectPrompt={(content) => {
                                setCustomSystemPrompt(content);
                                setShowPromptManager(false);
                            }}
                            onClose={() => setShowPromptManager(false)}
                        />
                    </div>
                </div>
            )}

            {/* Card Selector Modal */}
            {showCardSelector && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-2xl max-h-[70vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-500" />
                                选择卡牌资料
                            </h3>
                            <button onClick={() => setShowCardSelector(false)} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={cardSearch}
                                    onChange={(e) => setCardSearch(e.target.value)}
                                    placeholder="搜索卡牌名称..."
                                    className="w-full pl-9 pr-4 py-2 bg-[#27272a] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-purple-500/50"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {cardLibrary.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-gray-500 gap-2">
                                    <Layers className="w-8 h-8 opacity-20" />
                                    <p className="text-sm">暂无卡牌，请先去“拆书/卡牌”模块添加</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 p-2">
                                    {localCardLibrary
                                        .filter(c => c.title.toLowerCase().includes(cardSearch.toLowerCase()))
                                        .map(card => {
                                            const isSelected = selectedCards.some(s => s.id === card.id);
                                            const isEditing = editingCardId === card.id;

                                            return (
                                                <div
                                                    key={card.id}
                                                    className={`relative p-3 rounded-lg border transition-all flex flex-col gap-2 group ${isSelected
                                                            ? 'bg-purple-600/10 border-purple-500/50'
                                                            : 'bg-[#27272a] border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    {/* Selection Overlay (Click anywhere to select, unless editing) */}
                                                    {!isEditing && (
                                                        <div 
                                                            className="absolute inset-0 z-0 cursor-pointer"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedCards(prev => prev.filter(s => s.id !== card.id));
                                                                } else {
                                                                    setSelectedCards(prev => [...prev, card]);
                                                                }
                                                            }}
                                                        />
                                                    )}

                                                    <div className="flex items-center justify-between z-10 relative pointer-events-none">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${card.type === '角色' ? 'bg-blue-500/20 text-blue-300' :
                                                                card.type === '世界观' ? 'bg-green-500/20 text-green-300' :
                                                                    'bg-gray-700 text-gray-400'
                                                            }`}>
                                                            {card.type}
                                                        </span>
                                                        <div className="flex items-center gap-2 pointer-events-auto">
                                                            {!isEditing && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingCardId(card.id);
                                                                        setEditingCardContent(card.analysis || card.example || '');
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all"
                                                                    title="编辑内容"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                            {isSelected && <Check className="w-3 h-3 text-purple-400" />}
                                                        </div>
                                                    </div>

                                                    <div className="font-bold text-sm text-gray-200 truncate z-10 relative pointer-events-none">{card.title}</div>
                                                    
                                                    <div className="text-[10px] text-gray-500 z-10 relative pointer-events-auto">
                                                        {isEditing ? (
                                                            <div className="mt-1 space-y-2">
                                                                <textarea
                                                                    value={editingCardContent}
                                                                    onChange={(e) => setEditingCardContent(e.target.value)}
                                                                    className="w-full h-24 bg-black/50 border border-white/10 rounded p-2 text-xs text-gray-300 outline-none focus:border-purple-500/50 resize-none"
                                                                    autoFocus
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()} // Prevent bubbling
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingCardId(null);
                                                                        }}
                                                                        className="p-1 hover:bg-white/10 rounded text-gray-400"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // Update local state
                                                                            setLocalCardLibrary(prev => prev.map(c => 
                                                                                c.id === card.id ? { ...c, analysis: editingCardContent, example: editingCardContent } : c
                                                                            ));
                                                                            // Update selected cards if selected
                                                                            if (isSelected) {
                                                                                setSelectedCards(prev => prev.map(c => 
                                                                                    c.id === card.id ? { ...c, analysis: editingCardContent, example: editingCardContent } : c
                                                                                ));
                                                                            }
                                                                            // Persist to storage (Global Update)
                                                                            StorageManager.updateCard(card.id, { 
                                                                                analysis: editingCardContent,
                                                                                example: editingCardContent // Update both fields to be safe
                                                                            });
                                                                            setEditingCardId(null);
                                                                        }}
                                                                        className="p-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded"
                                                                    >
                                                                        <Save className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="line-clamp-3 pointer-events-none">
                                                                {card.analysis || card.example}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-[#18181b] rounded-b-xl">
                            <span className="text-xs text-gray-500">已选择 {selectedCards.length} 张卡牌</span>
                            <button
                                onClick={() => setShowCardSelector(false)}
                                className="px-6 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                确认选择
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
