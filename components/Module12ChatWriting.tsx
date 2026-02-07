'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { generateAIContentStream } from '@/lib/ai';
import { MemoryAwareAgent, ProgressiveContextManager } from '@/lib/memory';
import ChapterProgressBar, { CompactProgressBar } from './ChapterProgressBar';
import { Plus, FileText, Trash2, Pencil, MoreHorizontal, X, BookOpen, ArrowLeft, Bot, ChevronLeft, ChevronRight, Globe, Search, Brain, Info, Cloud, CloudOff, RefreshCw, Download, Upload } from 'lucide-react';
import { syncBookToCloud, fetchCloudBooks, fetchCloudBook, deleteCloudBook, needsSync, autoSyncAll, restoreBookToLocal, CloudBook } from '@/lib/module12-cloud-sync';

type Module12File = {
    id: string;
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
};

type Module12Book = {
    id: string;
    title: string;
    summary: string;
    category: string;
    visibility: '私密' | '公开';
    status: '连载中' | '已完结';
    cover?: string;
    createdAt: number;
    updatedAt: number;
    documents: Module12File[];
    activeFileId?: string | null;
};

type Module12ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
};

const MODULE12_BOOKS_KEY = 'module12_books_v1';
const MODULE12_ACTIVE_BOOK_KEY = 'module12_active_book_id_v1';

export default function Module12ChatWriting() {
    const [view, setView] = useState<'shelf' | 'editor'>('shelf');
    const [books, setBooks] = useState<Module12Book[]>([]);
    const [activeBookId, setActiveBookId] = useState<string | null>(null);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [isFilePanelOpen, setIsFilePanelOpen] = useState(false);
    const [isFilePanelCollapsed, setIsFilePanelCollapsed] = useState(false);
    const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createVisibility, setCreateVisibility] = useState<'私密' | '公开'>('私密');
    const [createCategory, setCreateCategory] = useState('小说');
    const [createTitle, setCreateTitle] = useState('');
    const [createSummary, setCreateSummary] = useState('');
    const [createCover, setCreateCover] = useState<string | null>(null);

    const [chatMessages, setChatMessages] = useState<Module12ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSearchEnabled, setIsSearchEnabled] = useState(false);
    const [memoryAgent, setMemoryAgent] = useState<MemoryAwareAgent | null>(null);
    const [progressiveContext, setProgressiveContext] = useState<ProgressiveContextManager | null>(null);
    const [contextProgress, setContextProgress] = useState(0);
    const [contextDimensions, setContextDimensions] = useState<any[]>([]);
    const [showProgressBar, setShowProgressBar] = useState(true);
    const [agentProgress, setAgentProgress] = useState<any>(null);
    const [showMemoryInfo, setShowMemoryInfo] = useState(false);
    const [useMemoryAgent, setUseMemoryAgent] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // 云端同步状态
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [showCloudPanel, setShowCloudPanel] = useState(false);
    const [cloudBooks, setCloudBooks] = useState<CloudBook[]>([]);
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

    const activeBook = useMemo(
        () => books.find(b => b.id === activeBookId) || null,
        [books, activeBookId]
    );

    const activeFile = useMemo(
        () => activeBook?.documents.find(f => f.id === activeFileId) || null,
        [activeBook, activeFileId]
    );

    useEffect(() => {
        const savedBooks = StorageManager.getJSON(MODULE12_BOOKS_KEY);
        const savedActiveBookId = StorageManager.get(MODULE12_ACTIVE_BOOK_KEY);
        if (Array.isArray(savedBooks)) {
            setBooks(savedBooks);
            if (savedActiveBookId && savedBooks.some(b => b.id === savedActiveBookId)) {
                setActiveBookId(savedActiveBookId);
            }
        }

        // 加载同步状态
        const syncData = localStorage.getItem('module12_global_sync');
        if (syncData) {
            try {
                const { lastSync } = JSON.parse(syncData);
                setLastSyncedAt(lastSync);
            } catch {}
        }
    }, []);

    useEffect(() => {
        if (books.length > 0) {
            StorageManager.setJSON(MODULE12_BOOKS_KEY, books);
            // 触发自动同步
            scheduleAutoSync();
        }
    }, [books]);

    // 自动同步定时器
    const scheduleAutoSync = useCallback(() => {
        if (autoSyncTimerRef.current) {
            clearTimeout(autoSyncTimerRef.current);
        }
        autoSyncTimerRef.current = setTimeout(() => {
            handleAutoSync();
        }, 30000); // 30秒后自动同步
    }, []);

    // 自动同步当前作品
    const handleAutoSync = useCallback(async () => {
        if (!activeBookId || syncStatus === 'syncing') return;

        const book = books.find(b => b.id === activeBookId);
        if (!book) return;

        // 检查是否需要同步
        const bookSyncData = localStorage.getItem(`module12_sync_${book.id}`);
        if (bookSyncData) {
            try {
                const { syncedAt } = JSON.parse(bookSyncData);
                if (book.updatedAt <= new Date(syncedAt).getTime()) {
                    return; // 不需要同步
                }
            } catch {}
        }

        setSyncStatus('syncing');
        const result = await syncBookToCloud(book, book.documents);

        if (result.success) {
            setSyncStatus('synced');
            setLastSyncedAt(result.syncedAt || new Date().toISOString());
            localStorage.setItem('module12_global_sync', JSON.stringify({ lastSync: result.syncedAt }));
        } else {
            setSyncStatus('error');
        }
    }, [activeBookId, books, syncStatus]);

    // 手动同步
    const handleManualSync = useCallback(async () => {
        if (!activeBookId || syncStatus === 'syncing') return;

        const book = books.find(b => b.id === activeBookId);
        if (!book) return;

        setSyncStatus('syncing');
        const result = await syncBookToCloud(book, book.documents);

        if (result.success) {
            setSyncStatus('synced');
            setLastSyncedAt(result.syncedAt || new Date().toISOString());
            localStorage.setItem('module12_global_sync', JSON.stringify({ lastSync: result.syncedAt }));
        } else {
            setSyncStatus('error');
        }
    }, [activeBookId, books, syncStatus]);

    // 加载云端作品列表
    const loadCloudBooks = useCallback(async () => {
        setIsLoadingCloud(true);
        const books = await fetchCloudBooks();
        setCloudBooks(books);
        setIsLoadingCloud(false);
    }, []);

    // 从云端恢复作品
    const handleRestoreFromCloud = useCallback(async (cloudBook: CloudBook) => {
        const { book, documents } = restoreBookToLocal(cloudBook);

        // 检查本地是否已有该作品
        const existingIndex = books.findIndex(b => b.id === book.id);
        if (existingIndex >= 0) {
            // 更新本地作品
            setBooks(prev => prev.map(b => b.id === book.id ? { ...book, documents } : b));
        } else {
            // 添加新作品
            setBooks(prev => [book, ...prev]);
        }

        setShowCloudPanel(false);
    }, [books]);

    // 删除云端作品
    const handleDeleteCloudBook = useCallback(async (bookId: string) => {
        if (!confirm('确定要删除云端作品吗？此操作不可恢复。')) return;

        const success = await deleteCloudBook(bookId);
        if (success) {
            setCloudBooks(prev => prev.filter(b => b.id !== bookId));
        }
    }, []);

    useEffect(() => {
        if (activeBookId) StorageManager.set(MODULE12_ACTIVE_BOOK_KEY, activeBookId);
    }, [activeBookId]);

    useEffect(() => {
        if (!activeBookId) return;
        const book = books.find(b => b.id === activeBookId);
        if (!book) return;
        const initialId = book.activeFileId || book.documents[0]?.id || null;
        setActiveFileId(initialId);
        const initialContent = initialId ? (book.documents.find(d => d.id === initialId)?.content || '') : '';
        setEditorContent(initialContent);
    }, [activeBookId, books]);

    useEffect(() => {
        if (!activeBookId || !activeFileId) return;
        setBooks(prev => prev.map(book => {
            if (book.id !== activeBookId) return book;
            let changed = false;
            const nextDocs = book.documents.map(doc => {
                if (doc.id !== activeFileId) return doc;
                if (doc.content === editorContent) return doc;
                changed = true;
                return { ...doc, content: editorContent, updatedAt: Date.now() };
            });
            if (!changed && book.activeFileId === activeFileId) return book;
            return { ...book, documents: nextDocs, updatedAt: Date.now(), activeFileId };
        }));
    }, [activeFileId, activeBookId, editorContent]);

    useEffect(() => {
        if (!activeBookId) {
            setChatMessages([]);
            setMemoryAgent(null);
            setProgressiveContext(null);
            setContextProgress(0);
            setContextDimensions([]);
            setAgentProgress(null);
            return;
        }

        // 创建记忆Agent
        const book = books.find(b => b.id === activeBookId);
        if (book) {
            const agent = new MemoryAwareAgent(activeBookId, book.title);
            setMemoryAgent(agent);

            // 初始化当前章节
            if (activeFileId) {
                const file = book.documents.find(f => f.id === activeFileId);
                if (file) {
                    agent.setCurrentChapter(activeFileId, file.name);
                    
                    // 初始化渐进式上下文管理器
                    const bookMemory = agent.getMemoryManager().exportMemory();
                    const contextManager = new ProgressiveContextManager(bookMemory, activeFileId);
                    setProgressiveContext(contextManager);
                    
                    // 更新进度状态
                    updateContextProgress(contextManager);
                }
            }
        }

        const saved = StorageManager.getJSON(`module12_chat_${activeBookId}`);
        const history = Array.isArray(saved) ? saved : [];
        if (history.length === 0) {
            // 获取当前章节名称
            const currentFile = activeFileId ? book?.documents.find(f => f.id === activeFileId) : null;
            const chapterName = currentFile?.name || '本章';

            setChatMessages([{
                id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                role: 'assistant',
                content: useMemoryAgent
                    ? `你好！我是你的AI写作助手。让我们开始写**${chapterName}**。

请告诉我，这一章你想写什么内容？（你可以详细描述，当你觉得说得差不多了，可以告诉我"确认完成"或"开始写"，我就会开始写作）`
                    : '请用一句话描述你的作品，开头和结局。',
                createdAt: Date.now()
            }]);
            return;
        }
        setChatMessages(history);
    }, [activeBookId, books, activeFileId, useMemoryAgent]);

    // 更新上下文进度
    const updateContextProgress = useCallback((contextManager: ProgressiveContextManager) => {
        const progress = contextManager.getProgressPercentage();
        setContextProgress(progress);
        
        // 获取各维度状态
        const dimensions = [
            { dimension: 'plot', name: '剧情', level: 'summary', loaded: true, priority: 10 },
            { dimension: 'character', name: '角色', level: 'summary', loaded: true, priority: 9 },
            { dimension: 'scene', name: '场景', level: 'summary', loaded: false, priority: 8 },
            { dimension: 'emotion', name: '情感', level: 'summary', loaded: false, priority: 7 },
            { dimension: 'world', name: '世界观', level: 'summary', loaded: false, priority: 6 },
            { dimension: 'style', name: '风格', level: 'summary', loaded: false, priority: 5 },
        ];
        setContextDimensions(dimensions);
    }, []);

    useEffect(() => {
        if (!activeBookId) return;
        StorageManager.setJSON(`module12_chat_${activeBookId}`, chatMessages);
    }, [chatMessages, activeBookId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isGenerating]);

    const createNewFile = useCallback(() => {
        if (!activeBookId) return;
        const now = Date.now();
        const baseName = '新建章节';
        const currentBook = books.find(b => b.id === activeBookId);
        const existingNames = new Set((currentBook?.documents || []).map(f => f.name));
        let suffix = 1;
        let name = baseName;
        while (existingNames.has(name)) {
            suffix += 1;
            name = `${baseName} ${suffix}`;
        }

        const newFile: Module12File = {
            id: `${now}_${Math.random().toString(16).slice(2)}`,
            name,
            content: '',
            createdAt: now,
            updatedAt: now
        };
        setBooks(prev => prev.map(book => {
            if (book.id !== activeBookId) return book;
            return { ...book, documents: [newFile, ...book.documents], activeFileId: newFile.id, updatedAt: now };
        }));
        setActiveFileId(newFile.id);
        setEditorContent('');
        setRenamingFileId(newFile.id);
        setRenameDraft(name);
    }, [activeBookId, books]);

    const deleteFile = useCallback((fileId: string) => {
        if (!activeBookId) return;
        setBooks(prev => prev.map(book => {
            if (book.id !== activeBookId) return book;
            const remaining = book.documents.filter(f => f.id !== fileId);
            if (remaining.length === 0) {
                const now = Date.now();
                const fallback: Module12File = {
                    id: `${now}_${Math.random().toString(16).slice(2)}`,
                    name: '未命名章节',
                    content: '',
                    createdAt: now,
                    updatedAt: now
                };
                setActiveFileId(fallback.id);
                setEditorContent('');
                return { ...book, documents: [fallback], activeFileId: fallback.id, updatedAt: now };
            }
            const nextActiveId = activeFileId === fileId ? remaining[0].id : book.activeFileId;
            if (activeFileId === fileId) {
                setActiveFileId(nextActiveId || null);
                setEditorContent(remaining[0]?.content || '');
            }
            return { ...book, documents: remaining, activeFileId: nextActiveId || null, updatedAt: Date.now() };
        }));

        if (renamingFileId === fileId) {
            setRenamingFileId(null);
            setRenameDraft('');
        }
    }, [activeBookId, activeFileId, renamingFileId]);

    const startRenaming = useCallback((file: Module12File) => {
        setRenamingFileId(file.id);
        setRenameDraft(file.name);
    }, []);

    const commitRename = useCallback((fileId: string) => {
        const nextName = renameDraft.trim() || '未命名';
        if (!activeBookId) return;
        setBooks(prev => prev.map(book => {
            if (book.id !== activeBookId) return book;
            const docs = book.documents.map(f => f.id === fileId ? { ...f, name: nextName, updatedAt: Date.now() } : f);
            return { ...book, documents: docs, updatedAt: Date.now() };
        }));
        setRenamingFileId(null);
        setRenameDraft('');
    }, [activeBookId, renameDraft]);

    const handleOpenCreateModal = useCallback(() => {
        setCreateVisibility('私密');
        setCreateCategory('小说');
        setCreateTitle('');
        setCreateSummary('');
        setCreateCover(null);
        setIsCreateModalOpen(true);
    }, []);

    const handleCoverChange = useCallback((file: File | null) => {
        if (!file) {
            setCreateCover(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setCreateCover(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const handleCreateAndStart = useCallback(() => {
        const title = createTitle.trim() || '未命名作品';
        const now = Date.now();
        const firstDoc: Module12File = {
            id: `${now}_${Math.random().toString(16).slice(2)}`,
            name: '第一章',
            content: '',
            createdAt: now,
            updatedAt: now
        };
        const newBook: Module12Book = {
            id: `${now}_${Math.random().toString(16).slice(2)}`,
            title,
            summary: createSummary.trim(),
            category: createCategory,
            visibility: createVisibility,
            status: '连载中',
            cover: createCover || undefined,
            createdAt: now,
            updatedAt: now,
            documents: [firstDoc],
            activeFileId: firstDoc.id
        };
        setBooks(prev => [newBook, ...prev]);
        setActiveBookId(newBook.id);
        setIsCreateModalOpen(false);
        setView('editor');
    }, [createCategory, createCover, createSummary, createTitle, createVisibility]);

    const handleOpenBook = useCallback((bookId: string) => {
        setActiveBookId(bookId);
        setView('editor');
    }, []);

    const handleDeleteBook = useCallback((bookId: string) => {
        setBooks(prev => prev.filter(b => b.id !== bookId));
        if (activeBookId === bookId) {
            setActiveBookId(null);
            setView('shelf');
        }
    }, [activeBookId]);

    const getWritingConfig = useCallback(() => {
        const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        let model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
        if (model === 'deepseek-ai/DeepSeek-V3') {
            model = 'deepseek-ai/DeepSeek-R1';
        }
        return { apiKey, baseUrl, model };
    }, []);

    const buildSystemPrompt = useCallback(() => {
        const title = activeBook?.title || '未命名作品';
        const summary = activeBook?.summary || '暂无简介';
        const category = activeBook?.category || '未分类';
        const chapterName = activeFile?.name || '当前章节';
        const chapterContent = editorContent ? editorContent.slice(-4000) : '';
        
        return [
            '你是一个专业的对话式写作Agent（智能体）。',
            '你的核心能力包括：',
            '1. **LLM搜索分析**：当用户开启联网模式或询问需要外部知识的问题时，你应该模拟或执行搜索分析流程，提供基于事实的、有深度的背景资料。',
            '2. **剧情推演**：根据用户的简单描述（如开头和结局），构建完整的逻辑链条。',
            '3. **正文写作**：通过对话协作输出可直接写入正文的内容，保持中文输出。',
            '',
            `作品标题：${title}`,
            `作品类型：${category}`,
            `作品简介：${summary}`,
            `当前章节：${chapterName}`,
            chapterContent ? `当前章节片段：\n${chapterContent}` : '当前章节暂无正文',
            '',
            '请始终保持作为“写作搭档”的身份，引导用户完成创作。',
            isSearchEnabled ? '【当前状态：联网搜索模式已开启】\n请在回答前进行（模拟）深度搜索分析，补充相关的背景知识、设定参考或市场热点分析。' : ''
        ].join('\n');
    }, [activeBook, activeFile, editorContent, isSearchEnabled]);

    const handleStopGenerate = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsGenerating(false);
    }, []);

    const handleApplyToChapter = useCallback((content: string, mode: 'append' | 'replace') => {
        if (!activeFileId) return;
        if (mode === 'replace') {
            setEditorContent(content);
            return;
        }
        const next = editorContent ? `${editorContent}\n${content}` : content;
        setEditorContent(next);
    }, [activeFileId, editorContent]);

    const handleSendChat = useCallback(async () => {
        const trimmed = chatInput.trim();
        if (!trimmed || isGenerating) return;
        const userMessage: Module12ChatMessage = {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            role: 'user',
            content: trimmed,
            createdAt: Date.now()
        };
        const assistantId = `${Date.now()}_${Math.random().toString(16).slice(2)}_assistant`;
        const assistantMessage: Module12ChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: '',
            createdAt: Date.now()
        };
        setChatMessages(prev => [...prev, userMessage, assistantMessage]);
        setChatInput('');
        setIsGenerating(true);
        
        if (useMemoryAgent && memoryAgent) {
            // 使用记忆Agent
            try {
                const response = await memoryAgent.process(trimmed);
                
                // 更新进度
                const progress = memoryAgent.getProgress();
                setAgentProgress(progress);
                
                // 更新对话
                setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: response.content } : m));
                
                // 如果是写作结果，更新编辑器内容
                if (response.type === 'writing') {
                    setEditorContent(response.content);
                }
            } catch (e: any) {
                setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: e?.message || '生成失败' } : m));
            } finally {
                setIsGenerating(false);
            }
        } else {
            // 传统方式
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            const { apiKey, baseUrl, model } = getWritingConfig();
            const systemPrompt = buildSystemPrompt();
            const history = [...chatMessages, userMessage];
            const historyText = history.slice(-6).map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n\n');
            const userPrompt = `${historyText}\n\n用户: ${trimmed}\n助手:`;
            try {
                await generateAIContentStream(
                    apiKey,
                    systemPrompt,
                    userPrompt,
                    baseUrl,
                    model,
                    (chunk) => {
                        setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: chunk } : m));
                    },
                    abortControllerRef.current?.signal
                );
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: e?.message || '生成失败' } : m));
                }
            } finally {
                setIsGenerating(false);
            }
        }
    }, [chatInput, isGenerating, chatMessages, getWritingConfig, buildSystemPrompt, memoryAgent, useMemoryAgent]);

    const wordCount = useMemo(() => {
        if (!activeBook) return 0;
        return activeBook.documents.reduce((sum, doc) => sum + (doc.content?.length || 0), 0);
    }, [activeBook]);

    const bookStats = useCallback((book: Module12Book) => {
        const totalWords = book.documents.reduce((sum, doc) => sum + (doc.content?.length || 0), 0);
        return { words: totalWords, chapters: book.documents.length };
    }, []);

    const FilePanel = (
        <>
            <div className="p-3 border-b border-ink/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-ink/80">章节</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={createNewFile}
                        className="p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                        title="新建章节"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsFilePanelCollapsed(true)}
                        className="hidden md:flex p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                        title="收起章节列表"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                {activeBook?.documents.map(file => {
                    const isActive = file.id === activeFileId;
                    const isRenaming = file.id === renamingFileId;
                    return (
                        <div
                            key={file.id}
                            className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${isActive ? 'bg-purple-50' : 'hover:bg-white/60'}`}
                        >
                            <button
                                onClick={() => {
                                    setActiveFileId(file.id);
                                    setEditorContent(file.content || '');
                                    setRenamingFileId(null);
                                    setRenameDraft('');
                                    setIsFilePanelOpen(false);
                                }}
                                className="flex-1 min-w-0 text-left"
                                title={file.name}
                            >
                                {isRenaming ? (
                                    <input
                                        value={renameDraft}
                                        onChange={(e) => setRenameDraft(e.target.value)}
                                        onBlur={() => commitRename(file.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitRename(file.id);
                                            if (e.key === 'Escape') {
                                                setRenamingFileId(null);
                                                setRenameDraft('');
                                            }
                                        }}
                                        className="w-full text-sm px-2 py-1 rounded-md border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="min-w-0">
                                        <div className={`text-sm truncate ${isActive ? 'text-purple-800 font-semibold' : 'text-ink/80'}`}>
                                            {file.name || '未命名'}
                                        </div>
                                        <div className="text-[11px] text-ink/40 truncate">
                                            {file.content ? `${file.content.length} 字` : '空章节'}
                                        </div>
                                    </div>
                                )}
                            </button>

                            {!isRenaming && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startRenaming(file)}
                                        className="p-1 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-md transition-colors"
                                        title="重命名"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => deleteFile(file.id)}
                                        className="p-1 hover:bg-red-50 text-ink/40 hover:text-red-600 rounded-md transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );

    return (
        <div className="h-[calc(100vh-6rem)] p-4 overflow-hidden relative">
            {view === 'shelf' && (
                <div className="h-full flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleOpenCreateModal}
                            className="px-4 py-2 text-sm rounded-lg bg-daiqing text-white hover:opacity-90 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            新建作品
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {books.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-ink/40 gap-2">
                                <BookOpen className="w-10 h-10" />
                                <span>还没有作品，先新建一本吧</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {books.map(book => {
                                    const stats = bookStats(book);
                                    return (
                                        <div
                                            key={book.id}
                                            className="group rounded-xl bg-white/60 border border-ink/10 p-3 hover:bg-white transition-colors cursor-pointer"
                                            onClick={() => handleOpenBook(book.id)}
                                        >
                                            <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                                {book.cover ? (
                                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText className="w-10 h-10 text-purple-400 opacity-70" />
                                                )}
                                                <span className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/90 text-white">
                                                    {book.status}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteBook(book.id);
                                                    }}
                                                    className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/80 text-ink/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="删除作品"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-ink/80 truncate">{book.title}</div>
                                                    <div className="text-xs text-ink/40 mt-1">{stats.words} 字 · {stats.chapters} 章</div>
                                                </div>
                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1.5 rounded-lg text-ink/30 hover:bg-ink/5"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'editor' && (
                <div className={`flex h-full min-h-0 overflow-hidden relative ${isFilePanelCollapsed ? 'gap-0' : 'gap-4'}`}>
                    <div className={`shrink-0 hidden md:flex flex-col glass-card rounded-xl overflow-hidden transition-[width] duration-300 ${isFilePanelCollapsed ? 'w-0 border-transparent' : 'w-[220px]'}`} aria-hidden={isFilePanelCollapsed}>
                        {FilePanel}
                    </div>

                    {isFilePanelOpen && (
                        <div className="md:hidden fixed inset-0 z-50">
                            <button
                                className="absolute inset-0 bg-black/20"
                                onClick={() => setIsFilePanelOpen(false)}
                                aria-label="关闭文件面板"
                            />
                            <div className="absolute left-3 top-3 bottom-3 w-[78vw] max-w-[280px] glass-card rounded-xl overflow-hidden flex flex-col">
                                {FilePanel}
                            </div>
                        </div>
                    )}
                    
                    {showMemoryInfo && memoryAgent && (
                        <div className="fixed inset-0 z-50">
                            <button
                                className="absolute inset-0 bg-black/20"
                                onClick={() => setShowMemoryInfo(false)}
                                aria-label="关闭记忆信息"
                            />
                            <div className="absolute right-3 top-3 bottom-3 w-[78vw] max-w-[320px] glass-card rounded-xl overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-ink/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-purple-600" />
                                        <span className="font-semibold text-ink/80">记忆信息</span>
                                    </div>
                                    <button
                                        onClick={() => setShowMemoryInfo(false)}
                                        className="p-1 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-4 space-y-4">
                                    <div>
                                        <div className="text-xs text-ink/50 mb-2">理解度</div>
                                        <div className="bg-ink/5 rounded-lg p-2">
                                            <div className="text-sm font-semibold text-ink/80">{(agentProgress?.understandingScore || 0)}%</div>
                                            <div className="w-full bg-ink/10 rounded-full h-1.5 mt-1">
                                                <div 
                                                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" 
                                                    style={{ width: `${(agentProgress?.understandingScore || 0)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-ink/50 mb-2">已知角色</div>
                                        <div className="bg-ink/5 rounded-lg p-2">
                                            <div className="text-sm font-semibold text-ink/80">{agentProgress?.knownCharacters || 0} 个</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-ink/50 mb-2">场景设定</div>
                                        <div className="bg-ink/5 rounded-lg p-2">
                                            <div className="text-sm font-semibold text-ink/80">{agentProgress?.knownSettings || 0} 个</div>
                                        </div>
                                    </div>
                                    {agentProgress?.understanding && (
                                        <div>
                                            <div className="text-xs text-ink/50 mb-2">理解信息</div>
                                            <div className="bg-ink/5 rounded-lg p-2">
                                                {agentProgress.understanding.plot?.goal && (
                                                    <div className="text-xs text-ink/60 mb-1">
                                                        <span className="font-semibold">目标:</span> {agentProgress.understanding.plot.goal}
                                                    </div>
                                                )}
                                                {agentProgress.understanding.plot?.conflict && (
                                                    <div className="text-xs text-ink/60 mb-1">
                                                        <span className="font-semibold">冲突:</span> {agentProgress.understanding.plot.conflict}
                                                    </div>
                                                )}
                                                {agentProgress.understanding.scene?.setting && (
                                                    <div className="text-xs text-ink/60 mb-1">
                                                        <span className="font-semibold">场景:</span> {agentProgress.understanding.scene.setting}
                                                    </div>
                                                )}
                                                {agentProgress.understanding.style?.tone && (
                                                    <div className="text-xs text-ink/60">
                                                        <span className="font-semibold">基调:</span> {agentProgress.understanding.style.tone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 云端作品面板 */}
                    {showCloudPanel && (
                        <div className="fixed inset-0 z-50">
                            <button
                                className="absolute inset-0 bg-black/20"
                                onClick={() => setShowCloudPanel(false)}
                                aria-label="关闭云端面板"
                            />
                            <div className="absolute right-3 top-3 bottom-3 w-[78vw] max-w-[360px] glass-card rounded-xl overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-ink/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <Cloud className="w-4 h-4 text-blue-600" />
                                        <span className="font-semibold text-ink/80">云端作品</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={loadCloudBooks}
                                            disabled={isLoadingCloud}
                                            className="p-1 hover:bg-blue-50 text-ink/40 hover:text-blue-600 rounded transition-colors"
                                            title="刷新"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isLoadingCloud ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => setShowCloudPanel(false)}
                                            className="p-1 hover:bg-blue-50 text-ink/40 hover:text-blue-600 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4">
                                    {isLoadingCloud ? (
                                        <div className="flex items-center justify-center py-8 text-ink/40">
                                            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                                            加载中...
                                        </div>
                                    ) : cloudBooks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-ink/40">
                                            <CloudOff className="w-10 h-10 mb-2" />
                                            <span>云端暂无作品</span>
                                            <span className="text-xs mt-1">点击同步按钮将作品保存到云端</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {cloudBooks.map(cloudBook => {
                                                const isLocal = books.some(b => b.id === cloudBook.id);
                                                return (
                                                    <div
                                                        key={cloudBook.id}
                                                        className="p-3 rounded-lg border border-ink/10 bg-white/50 hover:bg-white/80 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-ink/80 truncate">{cloudBook.title}</div>
                                                                <div className="text-xs text-ink/50 mt-1">
                                                                    {cloudBook.documents.length} 章 · 
                                                                    {cloudBook.documents.reduce((sum, d) => sum + d.content.length, 0)} 字
                                                                </div>
                                                                <div className="text-[10px] text-ink/40 mt-1">
                                                                    更新于 {new Date(cloudBook.updatedAt).toLocaleString('zh-CN')}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 ml-2">
                                                                {isLocal && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                                                        本地
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <button
                                                                onClick={() => handleRestoreFromCloud(cloudBook)}
                                                                className="flex-1 px-3 py-1.5 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                {isLocal ? '更新本地' : '恢复到本地'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCloudBook(cloudBook.id)}
                                                                className="p-1.5 rounded-md text-ink/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title="删除云端"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 flex flex-col glass-card rounded-xl transition-all duration-300 w-full relative z-10">
                        <div className="p-3 border-b border-ink/5 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-xl">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    onClick={() => {
                                        setView('shelf');
                                    }}
                                    className="p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                                    title="返回书架"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsFilePanelOpen(true)}
                                    className="md:hidden p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                                    title="打开章节列表"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsFilePanelCollapsed(prev => !prev)}
                                    className="hidden md:flex p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                                    title={isFilePanelCollapsed ? '展开章节列表' : '收起章节列表'}
                                >
                                    {isFilePanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                </button>
                                <span className="font-semibold text-ink/80 truncate">{activeBook?.title || '未命名作品'}</span>
                                <span className="text-xs text-ink/40">{wordCount} 字</span>
                            </div>
                            <div className="flex items-center gap-2">
                            {useMemoryAgent && agentProgress && (
                                <div className="flex items-center gap-1 text-xs">
                                    <Brain className="w-3 h-3 text-purple-600" />
                                    <span className="text-ink/60">理解度: {agentProgress.understandingScore}%</span>
                                </div>
                            )}
                            {useMemoryAgent && (
                                <button
                                    onClick={() => setShowProgressBar(!showProgressBar)}
                                    className={`p-1.5 rounded-lg transition-colors ${showProgressBar ? 'bg-purple-50 text-purple-600' : 'text-ink/40 hover:bg-purple-50 hover:text-purple-600'}`}
                                    title={showProgressBar ? "隐藏进度条" : "显示进度条"}
                                >
                                    <span className="text-xs font-medium">{contextProgress}%</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowMemoryInfo(!showMemoryInfo)}
                                className="p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                                title="记忆信息"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setUseMemoryAgent(!useMemoryAgent)}
                                className={`p-1.5 rounded-lg transition-colors ${useMemoryAgent ? 'bg-purple-50 text-purple-600' : 'text-ink/40 hover:bg-purple-50 hover:text-purple-600'}`}
                                title={useMemoryAgent ? "关闭记忆Agent" : "打开记忆Agent"}
                            >
                                <Brain className="w-4 h-4" />
                            </button>
                            {/* 云端同步按钮 */}
                            <button
                                onClick={handleManualSync}
                                disabled={syncStatus === 'syncing'}
                                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                                    syncStatus === 'syncing' ? 'text-blue-400' :
                                    syncStatus === 'synced' ? 'text-green-600 bg-green-50' :
                                    syncStatus === 'error' ? 'text-red-600 bg-red-50' :
                                    'text-ink/40 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                                title={syncStatus === 'syncing' ? '同步中...' : syncStatus === 'synced' ? '已同步' : syncStatus === 'error' ? '同步失败' : '点击同步到云端'}
                            >
                                {syncStatus === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                                 syncStatus === 'synced' ? <Cloud className="w-4 h-4" /> :
                                 syncStatus === 'error' ? <CloudOff className="w-4 h-4" /> :
                                 <Cloud className="w-4 h-4" />}
                                {lastSyncedAt && (
                                    <span className="text-[10px]">
                                        {new Date(lastSyncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => { setShowCloudPanel(true); loadCloudBooks(); }}
                                className="p-1.5 hover:bg-purple-50 text-ink/40 hover:text-purple-600 rounded-lg transition-colors"
                                title="云端作品"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={createNewFile}
                                className="px-2 py-1 text-xs rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                新建章节
                            </button>
                        </div>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col">
                            {/* 章节进度条 - 仅在记忆Agent模式下显示 */}
                            {useMemoryAgent && showProgressBar && (
                                <div className="px-4 pt-4">
                                    <ChapterProgressBar
                                        progress={contextProgress}
                                        dimensions={contextDimensions}
                                        className="shadow-sm"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-6 space-y-4">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-ink/40 gap-2">
                                        <Bot className="w-8 h-8" />
                                        <span>从对话开始创作吧</span>
                                    </div>
                                ) : (
                                    chatMessages.map(message => (
                                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[78%]">
                                                <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${message.role === 'user' ? 'bg-daiqing text-white' : 'bg-ink/5 text-ink/80'}`}>
                                                    {message.content || (message.role === 'assistant' && isGenerating ? '生成中...' : '')}
                                                </div>
                                                {message.role === 'assistant' && message.content && (
                                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                                        <button
                                                            onClick={() => handleApplyToChapter(message.content, 'append')}
                                                            className="px-2 py-1 rounded-md border border-ink/10 text-ink/60 hover:bg-ink/5"
                                                        >
                                                            追加到本章
                                                        </button>
                                                        <button
                                                            onClick={() => handleApplyToChapter(message.content, 'replace')}
                                                            className="px-2 py-1 rounded-md border border-ink/10 text-ink/60 hover:bg-ink/5"
                                                        >
                                                            覆盖本章
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="border-t border-ink/10 p-4">
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendChat();
                                        }
                                    }}
                                    className="w-full min-h-[88px] max-h-[160px] resize-none rounded-xl border border-ink/10 bg-white/70 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                                    placeholder="描述你的需求或直接下达写作指令…"
                                    spellCheck={false}
                                />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="text-xs text-ink/40 truncate">当前章节：{activeFile?.name || '未选择章节'}</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleStopGenerate}
                                            disabled={!isGenerating}
                                            className="px-3 py-1.5 text-xs rounded-md border border-ink/10 text-ink/60 disabled:opacity-50 hover:bg-ink/5"
                                        >
                                            停止
                                        </button>
                                        <button
                                            onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                                            className={`px-3 py-1.5 text-xs rounded-md border flex items-center gap-1 transition-colors ${isSearchEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-ink/10 text-ink/60 hover:bg-ink/5'}`}
                                            title={isSearchEnabled ? "点击关闭联网搜索" : "点击开启联网搜索"}
                                        >
                                            {isSearchEnabled ? <Globe className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                                            {isSearchEnabled ? '联网开启' : '联网'}
                                        </button>
                                        <button
                                            onClick={handleSendChat}
                                            disabled={!chatInput.trim() || isGenerating}
                                            className="px-3 py-1.5 text-xs rounded-md bg-daiqing text-white disabled:opacity-60"
                                        >
                                            发送
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative w-[90vw] max-w-3xl bg-white rounded-2xl shadow-xl border border-ink/10">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
                            <div className="text-sm font-semibold text-ink/80">创建新作品</div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-ink/40 hover:text-ink/70">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                            <div className="space-y-3">
                                <div className="w-full aspect-[3/4] rounded-xl border border-ink/10 bg-ink/5 flex items-center justify-center overflow-hidden">
                                    {createCover ? (
                                        <img src={createCover} alt="封面预览" className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen className="w-10 h-10 text-ink/30" />
                                    )}
                                </div>
                                <label className="block text-xs text-ink/50">
                                    作品封面（可选）
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        onChange={(e) => handleCoverChange(e.target.files?.[0] || null)}
                                        className="mt-2 block w-full text-xs"
                                    />
                                </label>
                                <div className="text-[11px] text-ink/40">最大5MB，支持 JPEG、PNG</div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-ink/60 mb-1">作品类型</label>
                                    <select
                                        value={createCategory}
                                        onChange={(e) => setCreateCategory(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm"
                                    >
                                        <option value="小说">小说</option>
                                        <option value="散文">散文</option>
                                        <option value="剧本">剧本</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-ink/60 mb-1">作品标题</label>
                                    <input
                                        value={createTitle}
                                        onChange={(e) => setCreateTitle(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm"
                                        placeholder="输入作品标题"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-ink/60 mb-1">作品简介（可选）</label>
                                    <textarea
                                        value={createSummary}
                                        onChange={(e) => setCreateSummary(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm min-h-[120px]"
                                        placeholder="可暂不填写，写完后可用 AI 生成"
                                    />
                                    <div className="mt-1 text-[11px] text-ink/40">写作完成后可使用 AI 自动生成作品简介</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ink/10">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-ink/10 text-ink/70 hover:bg-ink/5"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreateAndStart}
                                className="px-4 py-2 text-sm rounded-lg bg-daiqing text-white hover:opacity-90"
                            >
                                创建并开始
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
