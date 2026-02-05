'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, X, Send, Loader2, Maximize2, Minimize2, Trash2, Settings2, Image as ImageIcon, Check, Download, PenTool, Eraser, Undo2, BookOpen, AtSign, FileText, Calculator, User, Settings, Globe, List, Type, Smile, Book, Zap, Copy, Users, Wand2, Sparkles } from 'lucide-react';
import { generateAIContent, generateAIContentStream, generateImage } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePathname } from 'next/navigation';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

interface ToolStep {
    title: string;
    status: 'running' | 'done' | 'error';
    detail?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    id: string;
    kind?: 'tool';
    steps?: ToolStep[];
}

interface CardItem {
    id: string;
    title: string;
    type?: string;
    tags?: string[];
    analysis?: string;
    example?: string;
}

const BOOK_COVER_STYLES = [
    { label: '简约留白', prompt: 'minimalist design, large negative space for title, clean background, elegant composition, high quality' },
    { label: '古风水墨', prompt: 'Chinese traditional ink painting style, watercolor, artistic, mountains and rivers, zen atmosphere, ethereal' },
    { label: '玄幻大片', prompt: 'epic fantasy art, magical visual effects, dramatic lighting, grand scale, intricate details, 8k resolution, masterpiece' },
    { label: '悬疑惊悚', prompt: 'mystery thriller novel cover, dark atmosphere, fog, cinematic lighting, suspenseful, moody, high contrast' },
    { label: '科幻未来', prompt: 'sci-fi book cover, cyberpunk city, neon lights, futuristic technology, high tech, digital art' },
    { label: '唯美青春', prompt: 'anime art style, beautiful scenery, cherry blossoms, sunshine, warm colors, sentimental, emotional' }
];

const PROVIDER_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'deepseek-ai/DeepSeek-V3',
        'deepseek-ai/DeepSeek-R1',
        'moonshotai/Kimi-K2-Thinking',
        'zai-org/GLM-4.6',
        'MiniMaxAI/MiniMax-M2',
        'zai-org/GLM-4.6V'
    ],
    'vectorengine': [
        'grok-4.1',
        'gpt-5.2',
        'doubao-seed-1-8-251228',
        'gemini-3-pro-preview-11-2025',
        'qwen-plus',
        'claude-opus-4-5-20251101'
    ],
    'alibaba': [
        'qwen-turbo',
        'qwen-plus',
        'qwen-max',
        'qwen-long'
    ],
    'openai': [
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
    ],
    'custom': [] // Custom provider allows manual entry or generic list if needed
};

const IMAGE_PROVIDER_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'deepseek-ai/Janus-Pro-7B',
        'Qwen/Qwen-Image',
        'black-forest-labs/FLUX.1-schnell',
        'black-forest-labs/FLUX.1-dev',
        'stabilityai/stable-diffusion-3-medium',
        'stabilityai/stable-diffusion-3-5-large',
        'stabilityai/stable-diffusion-xl-base-1.0',
        'Qwen/Qwen-Image-Edit'
    ],
    'vectorengine': [
        'grok-4-image'
    ],
    'alibaba': [
        'wanx-v1',
        'wanx-background-generation-v2'
    ],
    'openai': [
        'dall-e-3',
        'dall-e-2'
    ],
    'custom': []
};

interface NovelFile {
    id: string;
    title: string;
    content?: string;
    type: 'book' | 'volume' | 'chapter' | 'doc';
    docType?: 'character' | 'world' | 'style' | 'goldfinger' | 'requirement' | 'summary' | 'force' | 'setting' | 'system_panel' | 'vocabulary' | 'meme' | 'sample' | 'story' | 'cool_point' | 'writing_skill' | 'ai_reference' | 'other';
    children?: NovelFile[];
    _bookTitle?: string; // Augmented property for UI display
    _chapterIndex?: number; // Augmented property for chapter index
    _wordCount?: number; // Augmented property for word count
}

export default function FloatingAI() {
    const pathname = usePathname();
    const { activeEditor, activeEditorId, isAiOpen, setIsAiOpen, readEditorContent, readSelection, writeToEditor, deleteSelection, undo, pendingPrompt, setPendingPrompt, shouldAutoSend, isMaxMode, runPageSkill, userLevel } = useEditorAgent();
    const isMaxRoute = pathname.startsWith('/module/module_max');
    const isDocked = activeEditorId === 'module7' || isMaxMode || isMaxRoute || activeEditorId === 'module12';
    const isNeonMode = activeEditorId === 'module12'; // Use this for status light only
    
    // const [isOpen, setIsOpen] = useState(false); // Moved to context
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '你好！我是墨灵写作助手。有什么我可以帮你的吗？\n你可以问我关于小说设定的问题，或者让我帮你润色一段文字。', id: 'init' }
    ]);
    const [input, setInput] = useState('');

    // Persistence: Load messages
    useEffect(() => {
        const savedMessages = StorageManager.getJSON(STORAGE_KEYS.FLOATING_AI_MESSAGES);
        if (Array.isArray(savedMessages) && savedMessages.length > 0) {
            setMessages(savedMessages);
        }
    }, []);

    // Persistence: Save messages
    useEffect(() => {
        if (messages.length > 1 || (messages.length === 1 && messages[0].id !== 'init')) {
            StorageManager.setJSON(STORAGE_KEYS.FLOATING_AI_MESSAGES, messages);
        }
    }, [messages]);

    // Handle pending prompt from external triggers (e.g. Editor Toolbar)
    // Moved to bottom to avoid ReferenceError with handleSend

    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [showProviderSelector, setShowProviderSelector] = useState(false);
    const [currentModel, setCurrentModel] = useState('');
    const [currentProvider, setCurrentProvider] = useState('siliconflow');
    const [isImageMode, setIsImageMode] = useState(false);
    const [isBookCoverMode, setIsBookCoverMode] = useState(false);
    const [selectedCoverStyle, setSelectedCoverStyle] = useState<string>('');

    // Review Prompt State
    const [showReviewSettings, setShowReviewSettings] = useState(false);
    const [reviewPrompt, setReviewPrompt] = useState('');

    const [showMcpPanel, setShowMcpPanel] = useState(false);
    const [mcpTool, setMcpTool] = useState<'material' | 'outline_check' | 'card_link' | 'task_plan' | 'chart_scan'>('material');
    const [mcpQuery, setMcpQuery] = useState('');
    const [mcpFocus, setMcpFocus] = useState('结构完整性、节奏、钩子强度、冲突密度');
    const [mcpTaskCount, setMcpTaskCount] = useState(30);
    const [mcpLoading, setMcpLoading] = useState(false);
    const [mcpCardResults, setMcpCardResults] = useState<CardItem[]>([]);
    const [mcpSelectedCardIds, setMcpSelectedCardIds] = useState<string[]>([]);
    const [mcpApplyCardLink, setMcpApplyCardLink] = useState(false);
    const [mcpApplyTaskPlan, setMcpApplyTaskPlan] = useState(false);
    const [mcpScanSource, setMcpScanSource] = useState('qidian_monthly');
    const [mcpScanResults, setMcpScanResults] = useState('');

    // @ Context Reference State
    const [showAtMenu, setShowAtMenu] = useState(false);
    // const [selectableFiles, setSelectableFiles] = useState<NovelFile[]>([]); // Removed flat list
    const [filteredItems, setFilteredItems] = useState<NovelFile[]>([]);
    const [atMenuMode, setAtMenuMode] = useState<'book' | 'file'>('book');
    const [activeBookForSearch, setActiveBookForSearch] = useState<NovelFile | null>(null);

    // Multi-select State
    const [pendingSelection, setPendingSelection] = useState<NovelFile[]>([]);

    const [atQuery, setAtQuery] = useState('');

    const [linkedFiles, setLinkedFiles] = useState<NovelFile[]>([]); // Keep this

    // Filter providers based on user level
    const visibleProviders = useMemo(() => {
        // Only PROMAX users can see all providers (including SiliconFlow and Alibaba)
        if (userLevel === 'PROMAX') {
            return ['siliconflow', 'vectorengine', 'alibaba', 'openai', 'custom'];
        }
        // Other users (MAX, PRO, PRO_PLUS) can only see platform-provided/allowed providers
        return ['vectorengine', 'openai', 'custom'];
    }, [userLevel]);

    // Ensure current provider is valid for the user level
    useEffect(() => {
        if (!visibleProviders.includes(currentProvider)) {
            // Default to vectorengine if available, otherwise first available
            if (visibleProviders.includes('vectorengine')) {
                setCurrentProvider('vectorengine');
            } else if (visibleProviders.length > 0) {
                setCurrentProvider(visibleProviders[0]);
            }
        }
    }, [visibleProviders, currentProvider]);

    // MAX Mode Visual State
    // const [isMaxSettingEnabled, setIsMaxSettingEnabled] = useState(false);

    // useEffect(() => {
    //   const checkMaxSetting = () => {
    //       // Direct localStorage check to bypass any potential StorageManager async issues
    //       // and ensure we catch the string value correctly
    //       const stored = localStorage.getItem('novel_writer_enable_max_mode');
    //       const enabled = stored === 'true';
    //       setIsMaxSettingEnabled(enabled);
    //   };

    //   checkMaxSetting();
    //   window.addEventListener('local-storage-update', checkMaxSetting);
    //   window.addEventListener('storage', checkMaxSetting);

    //   return () => {
    //       window.removeEventListener('local-storage-update', checkMaxSetting);
    //       window.removeEventListener('storage', checkMaxSetting);
    //   };
    // }, [activeEditorId, isAiOpen]); // Re-check on navigation or open

    const isVisualMax = isMaxMode || isMaxRoute;
    const MCP_CARD_LINKS_KEY = 'novel_writer_mcp_card_links';
    const MCP_TASKS_KEY = 'novel_writer_mcp_chapter_tasks';
    const MCP_CHANGE_HISTORY_KEY = 'novel_writer_mcp_change_history';

    // Effect to switch provider/model settings when mode changes
    useEffect(() => {
        if (isImageMode) {
            // Switch to Image Settings
            const imgProvider = StorageManager.get(STORAGE_KEYS.IMAGE_PROVIDER) || 'siliconflow';
            const imgModel = StorageManager.get(STORAGE_KEYS.IMAGE_MODEL) || 'black-forest-labs/FLUX.1-schnell';
            setCurrentProvider(imgProvider);
            setCurrentModel(imgModel);

            if (isBookCoverMode) {
                setImageSize('768x1024'); // Default book cover size
            }
        } else {
            // Switch back to Chat Settings
            const chatProvider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
            const chatModel = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || 'deepseek-ai/DeepSeek-V3';
            setCurrentProvider(chatProvider);
            setCurrentModel(chatModel);
        }
    }, [isImageMode, isBookCoverMode]);

    const [imageSize, setImageSize] = useState('1024x1024');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Drag State
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const isDragging = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const [expandDirection, setExpandDirection] = useState<'up' | 'down'>('up');

    // Hydration fix
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Load position from storage
        const savedPos = StorageManager.getJSON('floating_ai_position');
        if (savedPos) setPosition(savedPos);
    }, []);

    // Check collision and decide direction
    useEffect(() => {
        if (isAiOpen && !isDocked) {
            // If top space < chatHeight, expand down
            // Assuming the button is at the bottom right corner of the chat window when expanded up
            // 'bottom-16' means 4rem (64px) from bottom.

            // Actually, let's look at where the button is.
            // If we expand UP, top = buttonY - chatHeight
            // If we expand DOWN, bottom = buttonY + buttonHeight + chatHeight

            // Let's simplify: if button is in the top half of screen, expand down.
            const buttonY = position ? position.y : window.innerHeight - 80;
            if (buttonY < window.innerHeight / 2) {
                setExpandDirection('down');
            } else {
                setExpandDirection('up');
            }
        }
    }, [isAiOpen, isDocked, isExpanded, position]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isDocked && isAiOpen) return; // Locked when docked and open
        isDragging.current = false;
        dragStartPos.current = { x: e.clientX, y: e.clientY };

        const startX = e.clientX;
        const startY = e.clientY;
        const initialPos = position || { x: window.innerWidth - 80, y: window.innerHeight - 80 }; // Default approximate pos

        // Calculate offset from the element's top-left
        // Actually, better to just track delta

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                isDragging.current = true;
            }

            if (isDragging.current) {
                setPosition({
                    x: initialPos.x + deltaX,
                    y: initialPos.y + deltaY
                });
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            if (isDragging.current) {
                // Save final position
                const finalX = initialPos.x + (upEvent.clientX - startX);
                const finalY = initialPos.y + (upEvent.clientY - startY);
                // Boundary checks
                const boundedX = Math.min(Math.max(0, finalX), window.innerWidth - 60);
                const boundedY = Math.min(Math.max(0, finalY), window.innerHeight - 60);

                const newPos = { x: boundedX, y: boundedY };
                setPosition(newPos);
                StorageManager.setJSON('floating_ai_position', newPos);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isAiOpen]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'; // Limit max height
        }
    }, [input, isAiOpen]);

    useEffect(() => {
        // Load initial model from storage
        const storedProvider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
        let storedModel = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || '';

        // Validate stored model against provider list
        const availableModels = PROVIDER_MODELS[storedProvider as keyof typeof PROVIDER_MODELS] || [];
        if (availableModels.length > 0 && storedModel && !availableModels.includes(storedModel) && storedProvider !== 'custom') {
            storedModel = availableModels[0];
        } else if (!storedModel) {
            storedModel = availableModels[0] || 'deepseek-ai/DeepSeek-V3';
        }

        setCurrentModel(storedModel);
        setCurrentProvider(storedProvider);
    }, [isAiOpen]);

    const handleModelChange = (newModel: string) => {
        setCurrentModel(newModel);
        if (isImageMode) {
            StorageManager.set(STORAGE_KEYS.IMAGE_MODEL, newModel);
        } else {
            StorageManager.set(STORAGE_KEYS.CHAT_MODEL, newModel);
        }
        setShowModelSelector(false);
    };

    const handleProviderChange = (newProvider: string) => {
        setCurrentProvider(newProvider);

        if (isImageMode) {
            StorageManager.set(STORAGE_KEYS.IMAGE_PROVIDER, newProvider);
        } else {
            StorageManager.set(STORAGE_KEYS.CHAT_PROVIDER, newProvider);
        }

        // Update Base URL based on provider
        let newBaseUrl = '';
        if (newProvider === 'siliconflow') {
            newBaseUrl = 'https://api.siliconflow.cn/v1';
        } else if (newProvider === 'openai') {
            newBaseUrl = 'https://api.openai.com/v1';
        } else if (newProvider === 'vectorengine') {
            newBaseUrl = 'https://api.vectorengine.ai/v1';
        } else if (newProvider === 'alibaba') {
            newBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        }

        if (newBaseUrl) {
            if (isImageMode) {
                StorageManager.set(STORAGE_KEYS.IMAGE_BASE_URL, newBaseUrl);
            } else {
                StorageManager.set(STORAGE_KEYS.CHAT_BASE_URL, newBaseUrl);
            }
        }

        // Switch to default model for the new provider
        const modelList = isImageMode ? IMAGE_PROVIDER_MODELS : PROVIDER_MODELS;
        const availableModels = modelList[newProvider as keyof typeof modelList] || [];

        if (availableModels.length > 0) {
            handleModelChange(availableModels[0]);
        } else if (newProvider === 'custom') {
            // Keep current or clear? Let's keep current to avoid jarring change if custom is same
        }

        setShowProviderSelector(false);
    };

    // Helper to flatten book files
    const flattenBookFiles = (book: NovelFile): NovelFile[] => {
        const files: NovelFile[] = [];
        let chapterCount = 0;

        const traverse = (nodes: NovelFile[]) => {
            for (const node of nodes) {
                if (node.type === 'chapter') {
                    chapterCount++;
                    files.push({ ...node, _bookTitle: book.title, _chapterIndex: chapterCount });
                } else if (node.type === 'doc') {
                    files.push({ ...node, _bookTitle: book.title });
                }

                // Recurse into children (volumes or folders)
                if (node.children && node.children.length > 0) {
                    traverse(node.children);
                }
            }
        };

        traverse(book.children || []);
        return files;
    };

    // Helper to enrich files with word count from storage
    const enrichFilesWithStats = async (files: NovelFile[]): Promise<NovelFile[]> => {
        return await Promise.all(files.map(async (file) => {
            if (file.type === 'book') return file;

            let wordCount = file.content?.length || 0;

            // Try fetch latest content length if not present or 0
            // We assume content is stored in chapter_content_{id}
            if (wordCount === 0 || !file.content) {
                try {
                    const savedContent = await StorageManager.getAsync(`chapter_content_${file.id}`);
                    if (savedContent) {
                        wordCount = savedContent.length;
                        // Optionally update content too, but wordCount is enough for list display
                        // file.content = savedContent; 
                    }
                } catch {
                }
            }

            return { ...file, _wordCount: wordCount };
        }));
    };

    const appendAssistantMessage = (content: string) => {
        setMessages(prev => [...prev, { role: 'assistant', content, id: Date.now().toString() }]);
    };

    const appendToolMessage = (steps: ToolStep[]) => {
        if (steps.length === 0) return;
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: Date.now().toString(), kind: 'tool', steps }]);
    };

    const resolveChatConfig = () => {
        const provider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || currentProvider || 'siliconflow';
        const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
        let apiKey = storedKeys[provider] || StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';
        if (!apiKey) {
            const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
            if (Array.isArray(savedKeys)) {
                const fallbackKey = savedKeys.find((k: any) => k.provider === provider);
                if (fallbackKey) apiKey = fallbackKey.key;
            }
        }
        if (!apiKey && provider === 'siliconflow') {
            apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        }
        const baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        const model = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || currentModel || 'deepseek-ai/DeepSeek-V3';
        return { apiKey, baseUrl, model, provider };
    };

    const loadOutlineText = async () => {
        const maxOutline = await StorageManager.getAsync('novel_writer_max_outline');
        const moduleOutline = await StorageManager.getAsync(STORAGE_KEYS.MODULE_OUTPUT('module2'));
        const outlineText = (typeof maxOutline === 'string' && maxOutline.trim())
            ? maxOutline
            : (typeof moduleOutline === 'string' ? moduleOutline : '');
        return outlineText || '';
    };

    const applyMcpChange = async (key: string, nextValue: any, type: string) => {
        const previous = await StorageManager.getJSONAsync(key);
        const changeId = `mcp_${Date.now()}`;
        const history = await StorageManager.getJSONAsync(MCP_CHANGE_HISTORY_KEY);
        const nextHistory = Array.isArray(history) ? [...history, { id: changeId, key, type, previous }] : [{ id: changeId, key, type, previous }];
        StorageManager.setJSON(key, nextValue);
        StorageManager.setJSON(MCP_CHANGE_HISTORY_KEY, nextHistory);
        return changeId;
    };

    const undoLastMcpChange = async () => {
        const history = await StorageManager.getJSONAsync(MCP_CHANGE_HISTORY_KEY);
        if (!Array.isArray(history) || history.length === 0) {
            appendAssistantMessage('暂无可撤销的写入记录。');
            return;
        }
        const nextHistory = [...history];
        const last = nextHistory.pop();
        if (last && last.key) {
            if (last.previous === null || typeof last.previous === 'undefined') {
                StorageManager.remove(last.key);
            } else {
                StorageManager.setJSON(last.key, last.previous);
            }
            StorageManager.setJSON(MCP_CHANGE_HISTORY_KEY, nextHistory);
            appendAssistantMessage(`已撤销上次写入：${last.type || '变更'}。`);
        }
    };

    const runMcpMaterialSearch = async () => {
        if (!mcpQuery.trim()) {
            appendAssistantMessage('请先输入检索关键词。');
            return;
        }
        setMcpLoading(true);
        try {
            const query = mcpQuery.trim().toLowerCase();
            const cardsRaw = await StorageManager.getJSONAsync('novel_writer_card_library');
            const cards = Array.isArray(cardsRaw) ? cardsRaw : [];
            const matchedCards = cards.filter((card: CardItem) => {
                const tags = Array.isArray(card.tags) ? card.tags.join(' ') : '';
                const text = `${card.title || ''} ${card.type || ''} ${card.analysis || ''} ${card.example || ''} ${tags}`.toLowerCase();
                return text.includes(query);
            });

            const booksRaw = await StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS);
            const books = Array.isArray(booksRaw) ? booksRaw : [];
            const allFiles = books.flatMap((book: NovelFile) => flattenBookFiles(book));
            const matchedFiles = allFiles.filter((file) => (file.title || '').toLowerCase().includes(query));

            const cardLines = matchedCards.slice(0, 6).map((card: CardItem) => `- ${card.title || '未命名卡牌'}${card.type ? `（${card.type}）` : ''}`).join('\n');
            const fileLines = matchedFiles.slice(0, 6).map((file) => `- ${file._bookTitle ? `${file._bookTitle} / ` : ''}${file.title || '未命名'}${file.type === 'chapter' && file._chapterIndex ? `（第${file._chapterIndex}章）` : ''}`).join('\n');

            appendAssistantMessage([
                `素材检索结果`,
                ``,
                `卡牌：${matchedCards.length} 条`,
                cardLines || '- 无匹配卡牌',
                ``,
                `书架内容：${matchedFiles.length} 条`,
                fileLines || '- 无匹配内容'
            ].join('\n'));
        } finally {
            setMcpLoading(false);
        }
    };

    const runMcpOutlineCheck = async () => {
        setMcpLoading(true);
        try {
            const outlineText = await loadOutlineText();
            if (!outlineText.trim()) {
                appendAssistantMessage('未找到可用的大纲内容，请先生成或输入大纲。');
                return;
            }
            const { apiKey, baseUrl, model, provider } = resolveChatConfig();
            if (!apiKey && provider !== 'siliconflow') {
                appendAssistantMessage(`请先在设置中配置 ${provider} 的 API Key。`);
                return;
            }
            const systemPrompt = '你是资深网文总编，擅长对大纲做结构质量评审。';
            const userPrompt = `请只输出 JSON，不要输出其他文字。\n字段：score(1-10), issues(数组), suggestions(数组)。\n评审侧重点：${mcpFocus}\n大纲内容：\n${outlineText}`;
            const raw = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            const data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
            const score = data.score ?? '未知';
            const issues = Array.isArray(data.issues) ? data.issues : [];
            const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
            appendAssistantMessage([
                `大纲校验结果`,
                ``,
                `评分：${score}`,
                ``,
                `问题：`,
                issues.length ? issues.slice(0, 6).map((item: any) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n') : '- 暂无',
                ``,
                `建议：`,
                suggestions.length ? suggestions.slice(0, 6).map((item: any) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n') : '- 暂无'
            ].join('\n'));
        } catch (e: any) {
            appendAssistantMessage(e?.message || '大纲校验失败，请稍后重试。');
        } finally {
            setMcpLoading(false);
        }
    };

    const runMcpCardSearch = async () => {
        const query = mcpQuery.trim().toLowerCase();
        const cardsRaw = await StorageManager.getJSONAsync('novel_writer_card_library');
        const cards = Array.isArray(cardsRaw) ? cardsRaw : [];
        const matched = query
            ? cards.filter((card: CardItem) => {
                const tags = Array.isArray(card.tags) ? card.tags.join(' ') : '';
                const text = `${card.title || ''} ${card.type || ''} ${card.analysis || ''} ${card.example || ''} ${tags}`.toLowerCase();
                return text.includes(query);
            })
            : cards;
        setMcpCardResults(matched.slice(0, 12));
    };

    const runMcpCardLink = async () => {
        if (mcpSelectedCardIds.length === 0) {
            appendAssistantMessage('请先选择要关联的卡牌。');
            return;
        }
        if (linkedFiles.length === 0) {
            appendAssistantMessage('请先通过“关联内容”选择目标章节或资料。');
            return;
        }
        const selectedCards = mcpCardResults.filter(card => mcpSelectedCardIds.includes(card.id));
        const targets = linkedFiles.map(file => ({ id: file.id, title: file.title }));
        const previewLines = selectedCards.map(card => `- ${card.title} → ${targets.map(t => t.title).join(' / ')}`).join('\n');
        if (mcpApplyCardLink) {
            const existingLinks = await StorageManager.getJSONAsync(MCP_CARD_LINKS_KEY);
            const baseLinks = Array.isArray(existingLinks) ? existingLinks : [];
            const nextLinks = [
                ...baseLinks,
                ...selectedCards.flatMap(card => targets.map(target => ({
                    id: `${card.id}_${target.id}_${Date.now()}`,
                    cardId: card.id,
                    cardTitle: card.title,
                    targetId: target.id,
                    targetTitle: target.title,
                    createdAt: Date.now()
                })))
            ];
            const changeId = await applyMcpChange(MCP_CARD_LINKS_KEY, nextLinks, '卡牌联动');
            appendAssistantMessage(`卡牌联动已写入（变更ID：${changeId}）\n${previewLines}`);
        } else {
            appendAssistantMessage(`卡牌联动预览（未写入）\n${previewLines}`);
        }
    };

    const runMcpTaskPlan = async () => {
        setMcpLoading(true);
        try {
            const outlineText = await loadOutlineText();
            if (!outlineText.trim()) {
                appendAssistantMessage('未找到可用的大纲内容，请先生成或输入大纲。');
                return;
            }
            const { apiKey, baseUrl, model, provider } = resolveChatConfig();
            if (!apiKey && provider !== 'siliconflow') {
                appendAssistantMessage(`请先在设置中配置 ${provider} 的 API Key。`);
                return;
            }
            const systemPrompt = '你是资深网文总编，擅长把大纲拆解为章节任务。';
            const userPrompt = `请只输出 JSON 数组，不要输出其他文字。每项包含 title, goal, conflict, wordCount。\n目标章节数：${mcpTaskCount}\n大纲内容：\n${outlineText}`;
            const raw = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            const tasks = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
            if (!Array.isArray(tasks)) {
                appendAssistantMessage('章节任务解析失败，请重试。');
                return;
            }
            const previewLines = tasks.slice(0, 6).map((task: any, index: number) => `- ${index + 1}. ${task.title || '未命名'}（${task.wordCount || '字数未定'}）`).join('\n');
            if (mcpApplyTaskPlan) {
                const payload = { createdAt: Date.now(), tasks };
                const existing = await StorageManager.getJSONAsync(MCP_TASKS_KEY);
                const nextValue = Array.isArray(existing) ? [...existing, payload] : [payload];
                const changeId = await applyMcpChange(MCP_TASKS_KEY, nextValue, '章节任务编排');
                appendAssistantMessage(`章节任务已写入（变更ID：${changeId}）\n${previewLines}`);
            } else {
                appendAssistantMessage(`章节任务预览（未写入）\n${previewLines}`);
            }
        } catch (e: any) {
            appendAssistantMessage(e?.message || '章节任务编排失败，请稍后重试。');
        } finally {
            setMcpLoading(false);
        }
    };

    const runMcpChartScan = async () => {
        setMcpLoading(true);
        try {
            appendAssistantMessage('正在尝试获取起点月票榜数据，请稍候...');
            const res = await fetch('/api/mcp/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: mcpScanSource })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            const listText = data.books.map((b: any) => `${b.rank}. 《${b.title}》 - ${b.author}\n   简介：${b.intro || '无'}`).join('\n\n');
            setMcpScanResults(listText);
            appendAssistantMessage(`扫榜成功！已获取榜单前 ${data.books.length} 名。\n\n你可以点击“分析热门题材”来获取趋势分析。`);
        } catch (e: any) {
            appendAssistantMessage(`扫榜失败：${e.message}\n\n建议手动复制榜单内容到输入框。`);
        } finally {
            setMcpLoading(false);
        }
    };

    const runMcpTrendAnalysis = async () => {
        if (!mcpScanResults.trim()) {
            appendAssistantMessage('请先扫榜或在下方输入榜单内容。');
            return;
        }
        setMcpLoading(true);
        try {
            const { apiKey, baseUrl, model, provider } = resolveChatConfig();
            if (!apiKey && provider !== 'siliconflow') {
                appendAssistantMessage(`请先在设置中配置 ${provider} 的 API Key。`);
                return;
            }
            const systemPrompt = '你是资深网文市场分析师，擅长从榜单中提炼热门题材和创新点。';
            const userPrompt = `请分析以下小说榜单，总结当前的【热门题材】、【核心爽点】和【创新趋势】。\n\n榜单内容：\n${mcpScanResults}`;
            
            appendAssistantMessage('正在分析热门题材，请稍候...');
            const analysis = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
            appendAssistantMessage(`【热门题材分析】\n\n${analysis}`);
            
        } catch (e: any) {
            appendAssistantMessage(`分析失败：${e.message}`);
        } finally {
            setMcpLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        // Regex for Book Mode: @BookName (no slash)
        // Matches last occurrence of @ followed by non-slash chars
        const bookMatch = val.match(/@([^@/]*)$/);

        // Regex for File Mode: @BookName/FileName
        const fileMatch = val.match(/@([^@/]+)\/([^@/]*)$/);

        if (fileMatch) {
            // Mode: File Selection
            const bookName = fileMatch[1];
            const query = fileMatch[2];

            setAtMenuMode('file');
            setAtQuery(query);
            setShowAtMenu(true);

            // Find the book (Async)
            StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS)
                .then((savedBooks: any[]) => {
                    if (!Array.isArray(savedBooks)) savedBooks = [];
                    const targetBook = savedBooks.find((b: any) => b && b.title === bookName);

                    if (targetBook) {
                        setActiveBookForSearch(targetBook);
                        const files = flattenBookFiles(targetBook);
                        const filtered = files.filter(f => f && f.title && f.title.toLowerCase().includes(query.toLowerCase()));
                        enrichFilesWithStats(filtered).then(enriched => {
                            setFilteredItems(enriched);
                        });
                    } else {
                        setFilteredItems([]); // Book not found
                    }
                })
                .catch(err => {
                    console.error("Failed to load books for search:", err);
                    setFilteredItems([]);
                });

        } else if (bookMatch) {
            // Mode: Book Selection
            const query = bookMatch[1];

            setAtMenuMode('book');
            setAtQuery(query);
            setShowAtMenu(true);
            setActiveBookForSearch(null);

            // Filter books (Async)
            StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS)
                .then((savedBooks: any[]) => {
                    if (!Array.isArray(savedBooks)) savedBooks = [];
                    setFilteredItems(savedBooks.filter((b: any) => b && b.title && b.title.toLowerCase().includes(query.toLowerCase())));
                })
                .catch(err => {
                    console.error("Failed to load books for filter:", err);
                    setFilteredItems([]);
                });

        } else {
            setShowAtMenu(false);
        }
    };

    const handleSelectItem = (item: NovelFile) => {
        if (atMenuMode === 'book') {
            // Selected a Book -> Auto-complete to @BookName/
            const lastAtIndex = input.lastIndexOf('@');
            if (lastAtIndex !== -1) {
                const prefix = input.slice(0, lastAtIndex);
                setInput(`${prefix}@${item.title}/`);

                setAtMenuMode('file');
                setAtQuery('');
                setActiveBookForSearch(item);

                const files = flattenBookFiles(item);
                enrichFilesWithStats(files).then(enriched => {
                    setFilteredItems(enriched);
                });
            }
        } else {
            // Selected a File -> Toggle in pending list
            if (pendingSelection.find(f => f.id === item.id)) {
                setPendingSelection(prev => prev.filter(f => f.id !== item.id));
            } else {
                setPendingSelection(prev => [...prev, item]);
            }
            // Don't close menu yet, allow multiple selection
        }
    };

    const confirmSelection = () => {
        applySelectionAndClose(pendingSelection);
    };

    const applySelectionAndClose = (items: NovelFile[]) => {
        if (items.length === 0) return;
        setLinkedFiles(prev => {
            const newFiles = [...prev];
            items.forEach(item => {
                if (!newFiles.find(f => f.id === item.id)) {
                    newFiles.push(item);
                }
            });
            return newFiles;
        });
        setPendingSelection([]);
        setShowAtMenu(false);
        const lastAtIndex = input.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            setInput(input.slice(0, lastAtIndex));
        }
    };

    // Removed old loadSelectableFiles, handleSelectFile (replaced by handleSelectItem)


    const removeLinkedFile = (id: string) => {
        setLinkedFiles(prev => prev.filter(f => f.id !== id));
    };

    const getTotalWordCount = () => {
        return linkedFiles.reduce((acc, f) => acc + (f._wordCount || f.content?.length || 0), 0);
    };

    // Helper to get latest content from storage
    const getLatestFileContent = async (fileId: string): Promise<string> => {
        const savedBooks = await StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS) || [];

        // Helper to fetch content for a single node (chapter/doc)
        const fetchNodeContent = async (node: any): Promise<string> => {
            let content = node.content || '';
            // Try to get latest content from separate storage key
            try {
                const savedContent = await StorageManager.getAsync(`chapter_content_${node.id}`);
                if (savedContent !== null) {
                    content = savedContent;
                }
            } catch (e) {
                // Ignore error, use fallback
            }
            return content;
        };

        const aggregateContent = async (node: any): Promise<string> => {
            if (node.type === 'chapter' || node.type === 'doc') {
                const content = await fetchNodeContent(node);
                return `\n=== ${node.title} ===\n${content}\n`;
            }
            if (node.children && node.children.length > 0) {
                // Parallel fetch for children
                const childContents = await Promise.all(node.children.map((child: any) => aggregateContent(child)));
                return childContents.join('\n');
            }
            return '';
        };

        let targetNode: any = null;
        const findRecursive = (nodes: any[]) => {
            for (const node of nodes) {
                if (node.id === fileId) {
                    targetNode = node;
                    return;
                }
                if (node.children) findRecursive(node.children);
                if (targetNode) return;
            }
        };

        findRecursive(savedBooks);

        if (targetNode) {
            return await aggregateContent(targetNode);
        }
        return '';
    };

    const handleAutoFormatInput = () => {
        if (!input.trim()) return;

        // Simple Chinese Novel Formatting
        // 1. Replace periods with newlines to split sentences
        // 2. Trim and add indentation
        const formatted = input
            .replace(/。/g, '。\n') // Treat periods as line breaks
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => '　　' + line) // Add 2 full-width spaces
            .join('\n\n'); // Double newline for paragraph spacing

        setInput(formatted);
    };

    const handleReviewChapter = async () => {
        // Load custom prompt for Module 8 (Review)
        const savedPrompt = await StorageManager.getAsync('custom_prompt_module8');

        if (savedPrompt && savedPrompt.trim()) {
            // Use the custom prompt from Module 8
            handleSend("请对当前章节进行评审。", savedPrompt);
        } else {
            // Fallback to default hardcoded criteria
            handleSend(`请对当前章节内容进行专业评审。

【评审维度】
1. 剧情节奏（是否拖沓/过快？）
2. 人物塑造（性格是否鲜明？）
3. 期待感（结尾钩子是否有效？）
4. 逻辑与细节（有无BUG？）

【输出要求】
- 评分：(1-10分)
- 毒舌点评：(一针见血指出问题)
- 修改建议：(具体的优化方向)`);
        }
    };

    const handleOpenReviewSettings = async () => {
        const savedPrompt = await StorageManager.getAsync('custom_prompt_module8');
        setReviewPrompt(savedPrompt || '');
        setShowReviewSettings(true);
    };

    const handleSaveReviewPrompt = () => {
        StorageManager.set('custom_prompt_module8', reviewPrompt);
        setShowReviewSettings(false);
        // Optionally notify user
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '*(✅ 评审提示词已更新，将在下次评审时生效)*',
            id: Date.now().toString()
        }]);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            // Add a system message indicating interruption
            setMessages(prev => [...prev, { role: 'assistant', content: '*(用户已终止生成)*', id: Date.now().toString() }]);
        }
    };

    const handleSend = async (overrideInput?: string, systemPromptOverride?: string) => {
        const contentToSend = overrideInput || input;
        if (!contentToSend.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: contentToSend, id: Date.now().toString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Create new AbortController
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Prepare assistant message placeholder
        const assistantMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId }]);

        try {
            // Get API Config
            let apiKey = '';
            let baseUrl = '';

            if (isImageMode) {
                // Explicitly load Image Settings
                apiKey = StorageManager.get(STORAGE_KEYS.IMAGE_API_KEY) || '';
                baseUrl = StorageManager.get(STORAGE_KEYS.IMAGE_BASE_URL) || '';

                // Fallback if keys are missing but provider matches
                if (!apiKey) {
                    const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
                    apiKey = storedKeys[currentProvider];
                }

                if (!baseUrl) {
                    if (currentProvider === 'siliconflow') baseUrl = 'https://api.siliconflow.cn/v1';
                    else if (currentProvider === 'openai') baseUrl = 'https://api.openai.com/v1';
                    else if (currentProvider === 'vectorengine') baseUrl = 'https://api.vectorengine.ai/v1';
                    else if (currentProvider === 'alibaba') baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
                }
            } else {
                // Chat Mode Settings
                const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
                apiKey = storedKeys[currentProvider];

                // Smart Fallback: If no cached key, look for any saved key for this provider
                if (!apiKey) {
                    const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
                    if (Array.isArray(savedKeys)) {
                        const fallbackKey = savedKeys.find((k: any) => k.provider === currentProvider);
                        if (fallbackKey) apiKey = fallbackKey.key;
                    }
                }

                // If no specific key for this provider, try fallback logic or global keys
                if (!apiKey) {
                    apiKey = StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';
                }

                // Fallback to writing key only if using default provider or if strictly needed (optional logic)
                if (!apiKey && currentProvider === 'siliconflow') {
                    apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
                }

                baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
            }

            // Use currentModel state instead of reading from storage again

            if (!apiKey && currentProvider !== 'siliconflow') {
                setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: `请先在设置中配置 ${currentProvider === 'siliconflow' ? '硅基流动' : currentProvider === 'vectorengine' ? '向量引擎' : currentProvider} 的 API Key。` } : m
                ));
                setIsLoading(false);
                return;
            }

            if (isImageMode) {
                const imageApiKey = apiKey;
                const imageBaseUrl = baseUrl;
                let imageModel = currentModel || StorageManager.get(STORAGE_KEYS.IMAGE_MODEL) || 'black-forest-labs/FLUX.1-schnell';

                // Auto-correct: Qwen-Image-Edit is for editing, Qwen-Image is for generation
                if (imageModel === 'Qwen/Qwen-Image-Edit') {
                    imageModel = 'Qwen/Qwen-Image';
                }

                // 1. Optimize Prompt using Chat Model
                let optimizedPrompt = contentToSend;
                try {
                    // Always use Chat Settings for optimization, even in Image Mode
                    // Retrieve Chat settings explicitly to avoid using Image settings for LLM call
                    const chatProvider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';

                    // Get Chat Key
                    let chatApiKey = StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';
                    if (!chatApiKey) {
                        const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
                        chatApiKey = storedKeys[chatProvider];
                    }
                    // Fallback Chat Key
                    if (!chatApiKey) {
                        const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
                        if (Array.isArray(savedKeys)) {
                            const fallbackKey = savedKeys.find((k: any) => k.provider === chatProvider);
                            if (fallbackKey) chatApiKey = fallbackKey.key;
                        }
                    }
                    if (!chatApiKey) chatApiKey = apiKey; // Last resort: use current (image) key if compatible

                    const chatBaseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || (chatProvider === 'siliconflow' ? 'https://api.siliconflow.cn/v1' : baseUrl);
                    const chatModel = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || 'deepseek-ai/DeepSeek-V3';

                    setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId ? { ...m, content: '正在优化绘画提示词...' } : m
                    ));

                    let systemPrompt = `你是一个专业的 AI 绘画提示词专家 (Stable Diffusion/Midjourney)。
你的任务是将用户的简短画面描述改写为高质量的英文提示词 (Prompt)。

要求：
1. **只返回英文提示词**，不要包含任何中文、解释或前缀后缀。
2. 丰富画面细节，包括：主体描述、环境背景、光影效果、艺术风格、视角、画质词 (e.g., 4k, 8k, masterpiece)。
3. **除非用户明确提到人物（如女孩、男孩、男人、女人等），否则不要在提示词中添加任何人物主体**。如果用户只描述了风景或物品（如“下雨的街道”、“一把椅子”），请专注于描绘该场景或物品本身，不要强行加入人物。
4. 保持提示词的连贯性和艺术感。`;

                    if (isBookCoverMode) {
                        const stylePrompt = BOOK_COVER_STYLES.find(s => s.label === selectedCoverStyle)?.prompt || '';
                        systemPrompt += `\n\n【书封模式特殊要求】
1. 这是一个小说封面设计 (Book Cover Design)。
2. 必须包含大量留白 (Negative Space) 用于放置书名标题，通常在顶部或底部。
3. 风格基调：${stylePrompt}
4. 构图必须专业、干净，适合印刷。
5. 宽高比已固定为 3:4，请确保构图垂直延伸。`;
                    }

                    systemPrompt += `\n\n示例：
用户输入：下雨的街道
输出：cinematic shot of a rainy empty street at night, neon lights reflecting on wet asphalt, cyberpunk atmosphere, heavy rain, mist, dramatic lighting, high detail, 8k, photorealistic, no humans

用户输入：一只猫
输出：close up shot of a fluffy cat sitting on a windowsill, looking out at the rain, cozy atmosphere, soft indoor lighting, detailed fur texture, depth of field, 8k, masterpiece`;

                    const optimized = await generateAIContent(chatApiKey, systemPrompt, contentToSend, chatBaseUrl, chatModel, undefined, signal);
                    if (optimized && optimized.length > 10) {
                        optimizedPrompt = optimized;
                    }
                } catch (e) {
                    console.warn('Prompt optimization failed, using original:', e);
                }

                // 2. Generate Image
                setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: `正在绘图...\n\n> Prompt: ${optimizedPrompt}` } : m
                ));

                let imageUrl = '';
                try {
                    // Force 3:4 size if in book cover mode (using nearest standard sizes)
                    const finalSize = isBookCoverMode ? imageSize : imageSize; // imageSize is already locked in UI for cover mode
                    imageUrl = await generateImage(imageApiKey, optimizedPrompt, imageBaseUrl, imageModel, finalSize, signal);
                } catch (error: any) {
                    // Handle "Platform does not support this interface" (VectorEngine/Grok case)
                    // or "Model does not exist"
                    if (
                        error.message.includes('不支持该类型的接口') ||
                        error.message.includes('not support this type of interface') ||
                        error.message.includes('20012') ||
                        error.message.includes('Model does not exist')
                    ) {
                        const fallbackModel = 'black-forest-labs/FLUX.1-schnell';
                        setMessages(prev => prev.map(m =>
                            m.id === assistantMsgId ? { ...m, content: `⚠️ 模型 ${imageModel} 不可用或不支持生图接口，正在尝试使用 ${fallbackModel} 重试...\n\n> Prompt: ${optimizedPrompt}` } : m
                        ));
                        try {
                            // For fallback, force using SiliconFlow's URL if the original was VectorEngine (which might be chat-only)
                            let retryBaseUrl = imageBaseUrl;
                            let retryKey = imageApiKey;

                            // If VectorEngine failed, try to switch to SiliconFlow for fallback if key exists
                            if (currentProvider === 'vectorengine' || imageBaseUrl.includes('vectorengine')) {
                                retryBaseUrl = 'https://api.siliconflow.cn/v1';
                                const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
                                const sfKey = storedKeys['siliconflow'];
                                if (sfKey) {
                                    retryKey = sfKey;
                                } else {
                                    // Try global key as last resort
                                    retryKey = StorageManager.get('novel_writer_api_key') || imageApiKey;
                                }
                            }

                            imageUrl = await generateImage(retryKey, optimizedPrompt, retryBaseUrl, fallbackModel, imageSize, signal);

                            // Update stored model to avoid future errors if it was a persistent failure
                            if (currentProvider === 'siliconflow') {
                                StorageManager.set(STORAGE_KEYS.IMAGE_MODEL, fallbackModel);
                            }
                        } catch (retryError: any) {
                            throw retryError;
                        }
                    } else {
                        throw error;
                    }
                }

                setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: `![${contentToSend}](${imageUrl})\n\n> **Prompt**: ${optimizedPrompt}` } : m
                ));
                setIsLoading(false);
                return;
            }

            let selectionText = '';
            let editorContent = '';
            if (activeEditor && !isImageMode) {
                selectionText = (await readSelection()) || '';
                editorContent = (await readEditorContent()) || '';
            }

            const toolSteps: ToolStep[] = [];
            if (linkedFiles.length > 0) {
                for (const file of linkedFiles) {
                    const detail = file._wordCount ? `${file._wordCount} 字` : undefined;
                    toolSteps.push({ title: `读取 ${file.title}`, status: 'done', detail });
                }
            }
            if (selectionText) {
                toolSteps.push({ title: '读取选中文本', status: 'done' });
            }
            if (editorContent) {
                const editorTitle = activeEditorId?.startsWith('module_max') ? '读取当前 Max 创作中心内容' : '读取当前编辑器全文';
                toolSteps.push({ title: editorTitle, status: 'done' });
            }
            appendToolMessage(toolSteps);

            // Build context from previous messages (limit to last 10 to save tokens)
            let contextPrompt = systemPromptOverride || (
                isNeonMode
                    ? `你是一个对话式写作的共写助手。你的目标是通过对话协作，产出可直接进入正文的内容。所有回复请使用中文。`
                    : `你是一个专业的小说写作助手。请简短、直接地回答用户的问题。所有回复请使用中文。`
            );

            // Append instructions even if overridden, unless we want complete replacement?
            // Usually we want to keep the tool instructions (XML tags)

            contextPrompt += `
      
【重要指令协议】
如果你认为需要直接修改编辑器中的内容（例如：用户要求润色、改错、续写、删除选中内容等），请务必使用以下 XML 标签包裹你的输出，前端会自动执行这些操作，无需用户手动点击。

1. **替换/插入**：
<write>
这里放你生成的新内容。
这将自动替换用户当前选中的文本；如果未选中，则插入到光标处。
</write>

2. **删除**：
<delete/>
这将直接删除用户当前选中的文本。

示例 1（用户求润色）：
<write>
那晚的月色凄凉，如同一把生锈的刀，锯着他的心。
</write>

示例 2（用户求删除）：
<delete/>

注意：
- 只有当你确信用户希望你直接修改正文时才使用这些标签。
- 如果只是回答问题或解释，不要使用标签。
- 使用标签时，标签外不要有多余的解释性文字，除非你觉得有必要说明。
`;

            if (isNeonMode) {
                contextPrompt += `\n\n【模块12：对话式写作】\n- 如果用户是在要求写作/续写/润色/改写，请优先用 <write> 直接输出最终正文。\n- 如果用户是在讨论设定/策略/结构而不是要落字，不要使用标签。`;
            }

            if (isMaxMode || isMaxRoute) {
                contextPrompt += `\n\n【Max 模式技能】\n当你需要操控 Max 页面时，仅输出技能 XML，不要附加其他说明。\n<skill name="page_control">{\"action\":\"动作\",\"value\":\"值\"}</skill>\n`;

                if (pathname.includes('/dismantle')) {
                    contextPrompt += `当前页面：拆书/向量分析\n可用动作：\n- set_source_text (设置原文)\n- append_source_text (追加原文)\n- build_index (开始向量化)\n- set_query (设置分析问题)\n- search (执行检索)\n- analyze (生成分析总结)`;
                } else if (pathname.includes('/outline')) {
                    contextPrompt += `当前页面：大纲生成\n可用动作：\n- set_idea (设置核心创意)\n- set_paradigm (设置生成范式)\n- set_chapter_count (设置目标章节数)\n- generate_outline (生成大纲)\n- set_optimize_focus (设置优化侧重点)\n- optimize_outline (执行大纲优化)`;
                } else if (pathname.includes('/creation')) {
                    contextPrompt += `当前页面：万字冲刺/批量创作\n可用动作：\n- set_outline_idea (设置大纲创意)\n- set_world_setting (设置世界观)\n- set_style (设置文风)\n- generate_outline (生成细纲)\n- set_outline_text (设置细纲文本)\n- batch_generate (开始批量生成)\n- create_work (创建新作品，value为标题)`;
                } else if (pathname.includes('/polish')) {
                    contextPrompt += `当前页面：自循环润色\n可用动作：\n- set_input (设置原文)\n- append_input (追加原文)\n- set_focus (设置润色侧重点)\n- set_target_score (设置目标分数)\n- set_max_rounds (设置最大轮次)\n- run_polish (开始润色循环)\n- clear_result (清空结果)`;
                } else if (pathname.includes('/idea')) {
                    contextPrompt += `当前页面：脑洞风暴/创意生成\n可用动作：\n- set_keywords (设置关键词)\n- set_genre (设置题材)\n- generate_ideas (开始生成脑洞)\n- clear_ideas (清空创意库)`;
                }
            }

            // 普通模块页面的 skill 能力（module0_5 到 module8）
            const isModulePage = pathname.startsWith('/module/module') && !pathname.startsWith('/module/module_max');
            if (isModulePage) {
                let pageContext = `当前页面：${pathname}\n`;

                // 尝试获取页面状态和输入字段以增强 AI 上下文
                try {
                    // 先获取状态以拿到字段列表
                    const status = await runPageSkill('page_control', { action: 'get_status' });

                    if (status && status.inputFields && Array.isArray(status.inputFields)) {
                        pageContext += `可用输入字段 (Key)：${status.inputFields.join(', ')}\n`;

                        // 获取当前输入值，让 AI 知道当前填了什么
                        const currentInput = await runPageSkill('page_control', { action: 'get_input' });
                        if (currentInput && Object.keys(currentInput).length > 0) {
                            // 简化并截断内容，避免 Token 过多
                            const inputStr = JSON.stringify(currentInput);
                            pageContext += `当前已填写内容 (JSON)：${inputStr.slice(0, 3000)}${inputStr.length > 3000 ? '...(已截断)' : ''}\n`;
                        } else {
                            pageContext += `当前已填写内容：(空)\n`;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch page active state for prompt:', e);
                }

                contextPrompt += `\n\n【页面操控技能】
当你需要操控当前模块页面时，输出技能 XML：
<skill name="page_control">{"action":"动作","key":"字段名","value":"值"}</skill>

${pageContext}
可用动作：
- set_input (设置输入字段，需指定 key 和 value)
- get_input (获取输入，可选 key)
- get_output (获取当前输出)
- generate (触发生成)
- clear_input (清空所有输入)
- clear_output (清空输出)

示例：
用户说"帮我填写脑洞为穿越系统文"：
<skill name="page_control">{"action":"set_input","key":"brainhole","value":"穿越系统文"}</skill>

用户说"开始生成"：
<skill name="page_control">{"action":"generate"}</skill>
`;
            }

            // Inject Linked Files Content
            if (linkedFiles.length > 0) {
                contextPrompt += `\n\n【用户关联的参考资料 (Referenced Content)】\n`;
                for (const [index, file] of linkedFiles.entries()) {
                    // Fetch latest content from storage to ensure we have the most up-to-date version
                    // regardless of when the file was selected
                    const latestContent = (await getLatestFileContent(file.id)) || file.content || '';
                    contextPrompt += `\n[资料 ${index + 1}: ${file.title} (${file.type === 'chapter' ? '章节' : '设定'})]\n${latestContent || '(无内容)'}\n-------------------\n`;
                }
                contextPrompt += `\n请根据以上参考资料回答用户问题。\n`;
            }

            if (activeEditor && !isImageMode) {
                if (selectionText) {
                    contextPrompt += `\n\n【用户当前选中的文本（User Selected Text）】:\n"${selectionText}"\n\n请针对选中的文本进行操作（如润色、纠错、续写等）。建议使用 <write> 标签直接返回修改后的结果。`;
                }

                if (editorContent) {
                    const isMaxMode = activeEditorId?.startsWith('module_max');
                    const contextTitle = isMaxMode ? '【当前 Max 创作中心输出内容】' : '【当前编辑器全文】';
                    contextPrompt += `\n\n${contextTitle}（仅供参考，除非用户要求修改，否则不要重复输出原文）:\n${editorContent.slice(-10000)}`;
                }
            }

            const historyText = messages.filter(m => m.kind !== 'tool').slice(-6).map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n\n');
            const fullUserPrompt = `${historyText}\n\n用户: ${userMsg.content}\n助手:`;

            await generateAIContentStream(
                apiKey,
                contextPrompt,
                fullUserPrompt,
                baseUrl,
                currentModel,
                (chunk) => {
                    setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId ? { ...m, content: chunk } : m
                    ));
                },
                signal
            ).then(async (fullContent) => {
                // Post-processing for auto-execution tags
                // We do this after stream completes to avoid partial tag execution
                // Regex for <write>...</write> and <delete/>

            // Post-processing for auto-execution tags
            // We do this after stream completes to avoid partial tag execution
            // Regex for <write>...</write> and <delete/>
            
            // First, process simple <write> tags which are shorthand for insert/replace in editor
            const writeMatch = fullContent.match(/<write>([\s\S]*?)<\/write>/);
            const deleteMatch = fullContent.match(/<delete\s*\/>/);
            
            // Check if we are on a MAX page that might have specific skill handling for write
            // If the write content looks like it belongs to a specific input field, we might want to use set_input instead
            // But for now, let's keep <write> as "Insert to Editor" and <skill> as "Control Page"
            
            let updatedContent = fullContent;
            
            // Process Skills
            const skillMatches = [...fullContent.matchAll(/<skill\s+name="([^"]+)"\s*>([\s\S]*?)<\/skill>/g)];
            if (skillMatches.length > 0) {
                for (const match of skillMatches) {
                    const skillName = match[1];
                    const rawPayload = match[2] || '';
                    let payload: any = null;
                    try {
                        payload = JSON.parse(rawPayload);
                    } catch {
                        payload = null;
                    }
                    const executed = payload ? await runPageSkill(skillName, payload) : false;
                    updatedContent = updatedContent.replace(match[0], executed ? '\n\n*(⚙️ 已执行页面操作)*' : '\n\n*(⚠️ 页面操作未执行)*');
                }
                setMessages(prev => prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: updatedContent } : m
                ));
            }
            
            // Process Editor Write/Delete (only if active editor exists and not image mode)
            if (activeEditor && !isImageMode) {
                 if (deleteMatch) {
                    await deleteSelection();
                    setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId ? { ...m, content: updatedContent.replace(/<delete\s*\/>/, '\n\n*(🗑️ 已自动删除选中内容)*') } : m
                    ));
                } else if (writeMatch) {
                    const contentToWrite = writeMatch[1];
                    
                    // Special handling for Outline Page: If we are on outline page, <write> might mean set_idea
                    if (pathname.includes('/outline') && !skillMatches.length) {
                        // Try to treat simple write as set_idea if it's short, or just insert to editor if it's long?
                        // Actually, better to just let it insert to editor. The user can manually copy if needed.
                        // But wait, the user complaint is that "赛博朋克" didn't go into the input box.
                        // The input box is controlled by page state, NOT the editor content.
                        
                        // Let's try to infer intent: if content is short and we are on outline page, maybe set_idea?
                        // No, that's too magic. The Prompt should have told AI to use set_idea.
                        
                        // FIX: We manually check if there's a registered skill for 'set_idea' and if the content is likely an idea
                        // But the correct fix is ensuring the AI uses <skill> tag.
                    }

                    await writeToEditor(contentToWrite);
                    setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId ? { ...m, content: updatedContent.replace(/<write>([\s\S]*?)<\/write>/, '$1\n\n*(✨ 已自动同步到编辑器)*') } : m
                    ));
                }
            } else if (writeMatch) {
                 const contentToWrite = writeMatch[1].trim();
                 let executed = false;
                 let feedbackMsg = '';

                 // Smart mapping for MAX pages when no editor is active
                 if (pathname.includes('/outline')) {
                     executed = await runPageSkill('page_control', { action: 'set_idea', value: contentToWrite });
                     feedbackMsg = '*(💡 已自动填入大纲创意)*';
                 } else if (pathname.includes('/dismantle')) {
                     executed = await runPageSkill('page_control', { action: 'set_source_text', value: contentToWrite });
                     feedbackMsg = '*(📄 已自动填入拆书原文)*';
                 } else if (pathname.includes('/creation')) {
                     executed = await runPageSkill('page_control', { action: 'set_outline_text', value: contentToWrite });
                     feedbackMsg = '*(📝 已自动填入细纲内容)*';
                 } else if (pathname.includes('/idea')) {
                     executed = await runPageSkill('page_control', { action: 'set_keywords', value: contentToWrite });
                     feedbackMsg = '*(🧠 已自动填入脑洞关键词)*';
                 } else if (pathname.includes('/polish')) {
                     executed = await runPageSkill('page_control', { action: 'set_input', value: contentToWrite });
                     feedbackMsg = '*(✨ 已自动填入待润色文本)*';
                 }

                 if (executed) {
                     setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId ? { ...m, content: updatedContent.replace(/<write>([\s\S]*?)<\/write>/, `$1\n\n${feedbackMsg}`) } : m
                    ));
                 }
            }
            });

        } catch (error: any) {
            const errorMessage = error.message || String(error);
            if (error.name === 'AbortError' || errorMessage.includes('BodyStreamBuffer was aborted') || errorMessage.includes('The user aborted a request')) {
                // Already handled by handleStop, but ensure state is correct
                setIsLoading(false);
                return;
            }
            setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: `Error: ${errorMessage}` } : m
            ));
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Handle pending prompt from external triggers (e.g. Editor Toolbar)
    useEffect(() => {
        if (pendingPrompt) {
            if (!isAiOpen) setIsAiOpen(true);

            // Format: Add newline after Chinese period for better readability
            const formattedPrompt = pendingPrompt.replace(/。/g, '。\n\n');

            setInput(formattedPrompt);
            // Auto-send if it's an external prompt
            if (shouldAutoSend) {
                handleSend(formattedPrompt);
            } else {
                // Focus and move cursor to end if not auto-sending
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(formattedPrompt.length, formattedPrompt.length);
                        // Trigger resize logic manually just in case
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
                    }
                }, 100);
            }
            setPendingPrompt(null);
        }
    }, [pendingPrompt, isAiOpen, setIsAiOpen, setPendingPrompt, shouldAutoSend, handleSend]);

    const handleClear = () => {
        const initMsg: Message = { role: 'assistant', content: '对话已清空。', id: Date.now().toString() };
        setMessages([initMsg]);
        StorageManager.setJSON(STORAGE_KEYS.FLOATING_AI_MESSAGES, [initMsg]);
    };

    const handleImageDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `ai-image-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (e) {
            console.error('Download failed:', e);
            window.open(url, '_blank');
        }
    };

    const renderMessageContent = (msg: Message) => {
        if (msg.role === 'assistant') {
            if (msg.kind === 'tool') {
                const steps = msg.steps || [];
                return (
                    <div className={`text-xs space-y-2 ${isVisualMax ? 'text-gray-300' : 'text-ink/80'}`}>
                        {steps.map((step, index) => (
                            <div key={`${step.title}-${index}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isVisualMax ? 'bg-[#1b1b1f] border-white/10' : 'bg-ink/5 border-ink/10'}`}>
                                {step.status === 'running' ? (
                                    <Loader2 className={`w-3 h-3 animate-spin ${isVisualMax ? 'text-purple-400' : 'text-daiqing'}`} />
                                ) : step.status === 'error' ? (
                                    <X className="w-3 h-3 text-red-400" />
                                ) : (
                                    <Check className={`w-3 h-3 ${isVisualMax ? 'text-green-400' : 'text-green-600'}`} />
                                )}
                                <span className="flex-1">{step.title}</span>
                                {step.detail && <span className="text-[10px] text-gray-500">{step.detail}</span>}
                            </div>
                        ))}
                    </div>
                );
            }
            // Check for image markdown
            const imageMatch = msg.content.match(/!\[(.*?)\]\((.*?)\)/);
            if (imageMatch) {
                const alt = imageMatch[1];
                const url = imageMatch[2];
                return (
                    <div className="relative group">
                        <img
                            src={url}
                            alt={alt}
                            className="rounded-lg max-w-full cursor-zoom-in border border-ink/10"
                            onClick={() => setPreviewImage(url)}
                        />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleImageDownload(url); }}
                                className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
                                title="下载图片"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            }

            // Format content: Add newlines after Chinese periods for better readability
            // Also ensure paragraphs have proper spacing
            const formattedContent = msg.content.replace(/。/g, '。\n\n');

            return (
                <div className={`prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed ${isVisualMax
                    ? 'text-gray-300 prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-white prose-code:text-purple-300 prose-pre:bg-white/10 prose-pre:text-gray-200 prose-a:text-purple-400'
                    : 'text-ink/90 prose-pre:bg-gray-100 prose-pre:text-ink'
                    }`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Remove whiteSpace: pre-wrap to let Markdown handle blocking, but ensure margins
                            p: ({ node, ...props }) => { void node; return <p className="mb-2" {...props} />; }
                        }}
                    >
                        {formattedContent}
                    </ReactMarkdown>
                    {activeEditor && !isImageMode && (
                        <div className={`mt-2 pt-2 border-t flex justify-end gap-2 ${isVisualMax ? 'border-white/10' : 'border-ink/5'}`}>
                            <button
                                onClick={() => undo()}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors group ${isVisualMax ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10' : 'text-ink/50 hover:bg-ink/5'}`}
                                title="撤销上一步操作"
                            >
                                <Undo2 className="w-3 h-3 group-hover:-rotate-45 transition-transform" />
                                撤销
                            </button>
                            <button
                                onClick={() => deleteSelection()}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors group ${isVisualMax ? 'text-red-400 hover:bg-red-500/10' : 'text-cinnabar hover:bg-cinnabar/10'}`}
                                title="删除选中的文本"
                            >
                                <Eraser className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                删除选中
                            </button>
                            <button
                                onClick={() => writeToEditor(formattedContent)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors group ${isVisualMax ? 'text-purple-400 hover:bg-purple-500/10' : 'text-daiqing hover:bg-daiqing/10'}`}
                                title="插入到编辑器（若有选中则替换）"
                            >
                                <PenTool className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                插入/替换
                            </button>
                        </div>
                    )}
                </div>
            );
        }
        return msg.content;
    };

    // Calculate style based on position or fallback to fixed bottom-right
    const containerStyle = position && (!isDocked || !isAiOpen) ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto'
    } : {};

    if (!mounted) return null;

    return (
        <div
            className={`fixed z-50 font-sans ${!position ? 'bottom-6 right-6' : ''}`}
            style={containerStyle}
        >
            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-full max-h-full">
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <button
                            className="absolute bottom-4 right-4 p-3 bg-white text-black rounded-full shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium"
                            onClick={(e) => { e.stopPropagation(); handleImageDownload(previewImage); }}
                        >
                            <Download className="w-5 h-5" />
                            <span>下载原图</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Review Settings Modal */}
            {showReviewSettings && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className={`${isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-white border-ink/10'} border rounded-xl shadow-2xl w-[600px] max-w-full flex flex-col max-h-[80vh]`}>
                        <div className={`p-4 border-b flex items-center justify-between rounded-t-xl ${isVisualMax ? 'bg-white/5 border-white/10' : 'bg-paper/50 border-ink/10'}`}>
                            <h3 className={`font-bold flex items-center gap-2 ${isVisualMax ? 'text-[#f4f4f5]' : 'text-ink'}`}>
                                <Settings2 className={`w-4 h-4 ${isVisualMax ? 'text-purple-400' : 'text-daiqing'}`} />
                                配置评审提示词 (模块8)
                            </h3>
                            <button onClick={() => setShowReviewSettings(false)} className={`${isVisualMax ? 'text-gray-400 hover:text-white' : 'text-ink/40 hover:text-ink'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-hidden flex flex-col">
                            <p className={`text-xs mb-2 ${isVisualMax ? 'text-gray-400' : 'text-ink/50'}`}>
                                此处修改将同步更新【模块8：文章评审】的自定义提示词。
                                <br />建议包含：评审角色、评分标准、输出格式等。
                            </p>
                            <textarea
                                value={reviewPrompt}
                                onChange={(e) => setReviewPrompt(e.target.value)}
                                className={`flex-1 w-full p-3 border rounded-lg outline-none resize-none text-sm font-mono leading-relaxed ${isVisualMax 
                                    ? 'bg-[#18181b] border-white/10 text-gray-300 focus:border-purple-500' 
                                    : 'bg-paper/30 border-ink/20 text-ink focus:border-daiqing'}`}
                                placeholder="请输入评审提示词..."
                            />
                        </div>
                        <div className={`p-4 border-t flex justify-end gap-2 rounded-b-xl ${isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-white border-ink/10'}`}>
                            <button
                                onClick={() => setShowReviewSettings(false)}
                                className={`px-4 py-2 text-xs rounded-lg transition-colors ${isVisualMax ? 'text-gray-400 hover:bg-white/10' : 'text-ink/60 hover:bg-paper'}`}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveReviewPrompt}
                                className={`px-4 py-2 text-xs text-white rounded-lg transition-colors shadow-sm ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'}`}
                            >
                                保存并生效
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Chat Window */}
            {isAiOpen && (
                <div
                    className={`${isDocked
                        ? `fixed top-0 right-0 h-full w-[360px] rounded-l-none border-l shadow-[-5px_0_20px_-5px_rgba(0,0,0,0.1)] z-40 ${
                            isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-[#FBF9F6] border-ink/10'
                        }`
                        : `absolute ${expandDirection === 'up' ? 'bottom-16 origin-bottom-right' : 'top-16 origin-top-right'} right-0 backdrop-blur-md border rounded-2xl shadow-2xl ${isExpanded ? 'w-[800px] h-[80vh]' : 'w-[400px] h-[600px]'} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] ${isVisualMax ? 'bg-[#18181b]/95 border-white/10' : 'bg-white/95 border-ink/10'}`
                        } flex flex-col transition-all duration-500 ease-in-out overflow-hidden`}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-4 border-b cursor-move relative ${
                        isDocked ? (isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-[#F5F2EC] border-ink/5') : (isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-paper/80 border-ink/5')
                    }`}>
                        <div className={`flex items-center gap-2 ${
                            isVisualMax ? 'text-[#ff9966]' : 'text-daiqing'
                        }`}>
                            <Bot className="w-5 h-5" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm flex items-center gap-2">
                                    <span className={
                                        isVisualMax ? 'text-[#f4f4f5]' : 'text-ink'
                                    }>
                                        墨灵助手
                                    </span>
                                    {isVisualMax && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9966]/20 text-[#ff9966] border border-[#ff9966]/30">MAX</span>
                                    )}
                                    {activeEditor ? (
                                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                            isNeonMode ? 'bg-[#00ffcc] shadow-[0_0_8px_#00ffcc,0_0_12px_#00ffcc]' : (isVisualMax ? 'bg-[#ff9966]' : 'bg-green-500')
                                        }`} title={isNeonMode ? "霓虹模式 (已连接)" : (isVisualMax ? "MAX 模式已激活" : "已连接到编辑器")}></span>
                                    ) : (
                                        <span className={`w-1.5 h-1.5 rounded-full ${isVisualMax ? 'text-[#f4f4f5]/30' : 'bg-gray-300'}`} title={isVisualMax ? "MAX 模式 (未连接)" : "未连接编辑器"}></span>
                                    )}
                                </span>
                                <div className={`flex items-center gap-2 text-[10px] ${isVisualMax ? 'text-[#f4f4f5]/60' : 'text-ink/40'}`}>
                                    <div
                                        className={`flex items-center gap-1 cursor-pointer transition-colors ${isVisualMax ? 'hover:text-[#ff9966]' : 'hover:text-daiqing'}`}
                                        onClick={() => setShowProviderSelector(!showProviderSelector)}
                                    >
                                        <span>{currentProvider === 'siliconflow' ? '硅基流动' : currentProvider === 'vectorengine' ? '向量引擎' : currentProvider === 'openai' ? 'OpenAI' : '自定义'}</span>
                                        <Settings2 className="w-3 h-3" />
                                    </div>
                                    <span className={isVisualMax ? 'text-white/10' : 'text-ink/20'}>|</span>
                                    <div
                                        className={`flex items-center gap-1 cursor-pointer transition-colors ${isVisualMax ? 'hover:text-[#ff9966]' : 'hover:text-daiqing'}`}
                                        onClick={() => setShowModelSelector(!showModelSelector)}
                                    >
                                        <span>{currentModel.split('/').pop()}</span>
                                        <Settings2 className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Provider Selector Dropdown */}
                        {showProviderSelector && (
                            <div className={`absolute top-14 left-4 z-50 border rounded-lg shadow-xl py-1 w-32 animate-fade-in-up ${isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-white border-ink/10'}`}>
                                <div className={`px-3 py-2 text-xs font-bold border-b mb-1 ${isVisualMax ? 'text-[#f4f4f5]/60 border-white/10' : 'text-ink/40 border-ink/5'}`}>切换服务商</div>
                                {visibleProviders.map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => handleProviderChange(provider)}
                                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${isVisualMax ? 'hover:bg-white/5' : 'hover:bg-paper'} ${currentProvider === provider ? (isVisualMax ? 'text-[#ff9966] bg-[#ff9966]/10 font-medium' : 'text-daiqing bg-daiqing/5 font-medium') : (isVisualMax ? 'text-[#f4f4f5]/60' : 'text-ink/70')}`}
                                    >
                                        {provider === 'siliconflow' ? '硅基流动' : provider === 'vectorengine' ? '向量引擎' : provider === 'alibaba' ? '阿里大模型' : provider === 'openai' ? 'OpenAI' : '自定义'}
                                        {currentProvider === provider && <span className={`w-1.5 h-1.5 rounded-full ${isVisualMax ? 'bg-[#ff9966]' : 'bg-daiqing'}`}></span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Model Selector Dropdown */}
                        {showModelSelector && (
                            <div className={`absolute top-14 left-24 z-50 border rounded-lg shadow-xl py-1 w-64 animate-fade-in-up ${isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-white border-ink/10'}`}>
                                <div className={`px-3 py-2 text-xs font-bold border-b mb-1 ${isVisualMax ? 'text-[#f4f4f5]/60 border-white/10' : 'text-ink/40 border-ink/5'}`}>
                                    {isImageMode ? '切换生图模型' : '切换对话模型'} ({currentProvider})
                                </div>
                                {((isImageMode ? IMAGE_PROVIDER_MODELS : PROVIDER_MODELS)[currentProvider as keyof typeof PROVIDER_MODELS] || []).map(model => (
                                    <button
                                        key={model}
                                        onClick={() => handleModelChange(model)}
                                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${isVisualMax ? 'hover:bg-white/5' : 'hover:bg-paper'} ${currentModel === model ? (isVisualMax ? 'text-[#ff9966] bg-[#ff9966]/10 font-medium' : 'text-daiqing bg-daiqing/5 font-medium') : (isVisualMax ? 'text-[#f4f4f5]/60' : 'text-ink/70')}`}
                                    >
                                        {model.split('/').pop()}
                                        {currentModel === model && <span className={`w-1.5 h-1.5 rounded-full ${isVisualMax ? 'bg-[#ff9966]' : 'bg-daiqing'}`}></span>}
                                    </button>
                                ))}
                                {currentProvider === 'custom' && (
                                    <div className={`px-3 py-2 text-xs italic ${isVisualMax ? 'text-[#f4f4f5]/60' : 'text-ink/50'}`}>
                                        自定义模式请在设置中手动输入模型名称
                                    </div>
                                )}

                                {mcpTool === 'chart_scan' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={mcpScanSource}
                                                onChange={(e) => setMcpScanSource(e.target.value)}
                                                className={`flex-1 px-3 py-2 rounded-lg border outline-none ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-200' : 'bg-white border-ink/10 text-ink/80'}`}
                                            >
                                                <option value="qidian_monthly">起点月票榜</option>
                                                <option value="fanqie">番茄热榜 (需手动粘贴)</option>
                                            </select>
                                            <button
                                                onClick={runMcpChartScan}
                                                disabled={mcpLoading || mcpScanSource === 'fanqie'}
                                                className={`px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'} disabled:opacity-60`}
                                            >
                                                {mcpLoading ? '扫描中...' : '开始扫榜'}
                                            </button>
                                        </div>
                                        <textarea
                                            value={mcpScanResults}
                                            onChange={(e) => setMcpScanResults(e.target.value)}
                                            className={`w-full h-32 px-3 py-2 rounded-lg border outline-none resize-none ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-200' : 'bg-white border-ink/10 text-ink/80'}`}
                                            placeholder="榜单内容将显示在这里，也可以手动粘贴..."
                                        />
                                        <button
                                            onClick={runMcpTrendAnalysis}
                                            disabled={mcpLoading}
                                            className={`w-full px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'} disabled:opacity-60`}
                                        >
                                            {mcpLoading ? '分析中...' : '分析热门题材'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsImageMode(!isImageMode)}
                                className={`p-1.5 rounded-lg transition-colors ${isImageMode ? (isVisualMax ? 'text-purple-300 bg-purple-500/20' : 'text-daiqing bg-daiqing/10') : (isVisualMax ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-ink/40 hover:text-ink hover:bg-paper')}`}
                                title={isImageMode ? "退出生图模式" : "切换到生图模式"}
                            >
                                <ImageIcon className="w-4 h-4" />
                            </button>
                            <button onClick={handleClear} className={`p-1.5 rounded-lg transition-colors ${isVisualMax ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-ink/40 hover:text-cinnabar hover:bg-cinnabar/5'}`} title="清空对话">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            {!isDocked && (
                                <button onClick={() => setIsExpanded(!isExpanded)} className={`p-1.5 rounded-lg transition-colors ${isVisualMax ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-ink/40 hover:text-ink hover:bg-paper'}`}>
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            )}
                            <button onClick={() => setIsAiOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isVisualMax ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-ink/40 hover:text-ink hover:bg-paper'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${
                        isVisualMax ? 'bg-[#0b0b0c]' : 'bg-rice-texture'
                    }`}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? (isVisualMax ? 'bg-purple-600 text-white rounded-br-none' : 'bg-daiqing text-white rounded-br-none')
                                        : (isVisualMax ? 'bg-[#27272a] text-gray-200 border border-white/10 rounded-bl-none' : 'bg-white text-ink border border-ink/5 rounded-bl-none')
                                        }`}
                                >
                                    {renderMessageContent(msg)}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start items-center gap-2">
                                <div className={`rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2 ${
                                    isVisualMax ? 'bg-[#27272a] border border-white/10' : 'bg-white border border-ink/5'
                                }`}>
                                    <Loader2 className={`w-4 h-4 animate-spin ${
                                        isVisualMax ? 'text-purple-400' : 'text-daiqing'
                                    }`} />
                                    <span className="text-xs animate-pulse text-gray-400">正在思考...</span>
                                </div>
                                <button
                                    onClick={handleStop}
                                    className={`p-2 border rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-colors ${isVisualMax ? 'bg-[#27272a] border-white/10 hover:bg-red-500/10' : 'bg-white border-ink/5 hover:bg-red-50'}`}
                                    title="停止生成"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className={`p-4 border-t ${
                        isVisualMax ? 'bg-[#18181b] border-white/5' : (isDocked ? 'bg-[#F5F2EC] border-ink/5' : 'bg-white/80 border-ink/5')
                    }`}>

                        {/* Linked Files Toolbar */}
                        {!isImageMode && (
                            <div className="flex flex-wrap gap-2 mb-2 items-center">
                                {/* Add File Button */}
                                <button
                                    onClick={() => {
                                        // loadSelectableFiles(); // No longer needed
                                        setShowAtMenu(true);
                                        setAtMenuMode('book');
                                        setAtQuery('');
                                        // Focus input and append @ if not present
                                        if (!input.endsWith('@')) {
                                            setInput(prev => prev + '@');
                                        }

                                        // Initialize with Book List
                                        StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS)
                                            .then((savedBooks: any[]) => {
                                                if (!Array.isArray(savedBooks)) savedBooks = [];
                                                setFilteredItems(savedBooks);
                                            })
                                            .catch(err => {
                                                console.error("Failed to load books for menu:", err);
                                                setFilteredItems([]);
                                            });
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1 border rounded-lg text-xs transition-colors ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-400 hover:text-purple-300 hover:border-purple-500/50' : 'bg-white border-ink/10 text-ink/70 hover:text-daiqing hover:border-daiqing'}`}
                                    title="引用书籍/章节 (@)"
                                >
                                    <AtSign className="w-3 h-3" />
                                    <span>关联内容</span>
                                </button>

                                {/* Auto Format Button */}
                                <button
                                    onClick={handleAutoFormatInput}
                                    className={`flex items-center gap-1 px-2 py-1 border rounded-lg text-xs transition-colors ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-400 hover:text-purple-300 hover:border-purple-500/50' : 'bg-white border-ink/10 text-ink/70 hover:text-daiqing hover:border-daiqing'}`}
                                    title="自动排版 (段首缩进+空行)"
                                >
                                    <Type className="w-3 h-3" />
                                    <span>排版</span>
                                </button>

                                <button
                                    onClick={() => setShowMcpPanel(prev => !prev)}
                                    className={`flex items-center gap-1 px-2 py-1 border rounded-lg text-xs transition-colors ${isVisualMax ? (showMcpPanel ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'bg-[#27272a] border-white/10 text-gray-400 hover:text-purple-300 hover:border-purple-500/50') : (showMcpPanel ? 'bg-daiqing/10 border-daiqing text-daiqing' : 'bg-white border-ink/10 text-ink/70 hover:text-daiqing hover:border-daiqing')}`}
                                    title="墨灵助手 MCP 工具"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>MCP工具</span>
                                </button>

                                {/* Review Button */}
                                <button
                                    onClick={handleReviewChapter}
                                    className={`flex items-center gap-1 px-2 py-1 border rounded-lg text-xs transition-colors ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-400 hover:text-purple-300 hover:border-purple-500/50' : 'bg-white border-ink/10 text-ink/70 hover:text-daiqing hover:border-daiqing'}`}
                                    title="AI 章节评审"
                                >
                                    <Check className="w-3 h-3" />
                                    <span>评审</span>
                                </button>

                                {/* Word Count Summary */}
                                {linkedFiles.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs">
                                        <Calculator className="w-3 h-3" />
                                        <span>总计: {(getTotalWordCount() / 1000).toFixed(1)}k字 ({linkedFiles.length}个片段)</span>
                                    </div>
                                )}

                                {/* Selected File Tags */}
                                {linkedFiles.map(file => (
                                    <div key={file.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs group animate-in fade-in zoom-in-95 duration-200 border ${isVisualMax ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-daiqing/5 text-daiqing border-daiqing/10'}`}>
                                        {file.type === 'chapter' ? <FileText className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                                        <span className="max-w-[100px] truncate">{file.title}</span>
                                        <button
                                            onClick={() => removeLinkedFile(file.id)}
                                            className={`opacity-0 group-hover:opacity-100 rounded-full p-0.5 transition-all ${isVisualMax ? 'hover:bg-purple-200' : 'hover:bg-daiqing/20'}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isImageMode && showMcpPanel && (
                            <div className={`mb-2 border rounded-xl p-3 text-xs space-y-3 ${isVisualMax ? 'bg-[#1f1f22] border-white/10 text-gray-300' : 'bg-white/80 border-ink/10 text-ink/70'}`}>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setMcpTool('material')}
                                        className={`px-3 py-1 rounded-lg border transition-colors ${mcpTool === 'material' ? (isVisualMax ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' : 'bg-daiqing/10 text-daiqing border-daiqing') : (isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing')}`}
                                    >
                                        素材检索
                                    </button>
                                    <button
                                        onClick={() => setMcpTool('outline_check')}
                                        className={`px-3 py-1 rounded-lg border transition-colors ${mcpTool === 'outline_check' ? (isVisualMax ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' : 'bg-daiqing/10 text-daiqing border-daiqing') : (isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing')}`}
                                    >
                                        大纲校验
                                    </button>
                                    <button
                                        onClick={() => setMcpTool('card_link')}
                                        className={`px-3 py-1 rounded-lg border transition-colors ${mcpTool === 'card_link' ? (isVisualMax ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' : 'bg-daiqing/10 text-daiqing border-daiqing') : (isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing')}`}
                                    >
                                        卡牌联动
                                    </button>
                                    <button
                                        onClick={() => setMcpTool('task_plan')}
                                        className={`px-3 py-1 rounded-lg border transition-colors ${mcpTool === 'task_plan' ? (isVisualMax ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' : 'bg-daiqing/10 text-daiqing border-daiqing') : (isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing')}`}
                                    >
                                        章节编排
                                    </button>
                                    <button
                                        onClick={() => setMcpTool('chart_scan')}
                                        className={`px-3 py-1 rounded-lg border transition-colors ${mcpTool === 'chart_scan' ? (isVisualMax ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' : 'bg-daiqing/10 text-daiqing border-daiqing') : (isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing')}`}
                                    >
                                        扫榜分析
                                    </button>
                                </div>

                                {mcpTool === 'material' && (
                                    <div className="space-y-2">
                                        <input
                                            value={mcpQuery}
                                            onChange={(e) => setMcpQuery(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-200' : 'bg-white border-ink/10 text-ink/80'}`}
                                            placeholder="输入关键词，检索卡牌与书架内容"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={runMcpMaterialSearch}
                                                disabled={mcpLoading}
                                                className={`px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'} disabled:opacity-60`}
                                            >
                                                {mcpLoading ? '检索中...' : '开始检索'}
                                            </button>
                                            <button
                                                onClick={undoLastMcpChange}
                                                className={`px-3 py-1.5 rounded-lg border ${isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing'}`}
                                            >
                                                撤销上次写入
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {mcpTool === 'outline_check' && (
                                    <div className="space-y-2">
                                        <input
                                            value={mcpFocus}
                                            onChange={(e) => setMcpFocus(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-200' : 'bg-white border-ink/10 text-ink/80'}`}
                                            placeholder="输入评审侧重点"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={runMcpOutlineCheck}
                                                disabled={mcpLoading}
                                                className={`px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'} disabled:opacity-60`}
                                            >
                                                {mcpLoading ? '校验中...' : '开始校验'}
                                            </button>
                                            <button
                                                onClick={undoLastMcpChange}
                                                className={`px-3 py-1.5 rounded-lg border ${isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing'}`}
                                            >
                                                撤销上次写入
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {mcpTool === 'card_link' && (
                                    <div className="space-y-2">
                                        <input
                                            value={mcpQuery}
                                            onChange={(e) => setMcpQuery(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-200' : 'bg-white border-ink/10 text-ink/80'}`}
                                            placeholder="输入关键词，筛选卡牌"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={runMcpCardSearch}
                                                className={`px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'}`}
                                            >
                                                刷新卡牌
                                            </button>
                                            <button
                                                onClick={() => setMcpApplyCardLink(prev => !prev)}
                                                className={`px-3 py-1.5 rounded-lg border ${mcpApplyCardLink ? (isVisualMax ? 'border-green-400 text-green-300' : 'border-green-500 text-green-600') : (isVisualMax ? 'border-white/10 text-gray-400' : 'border-ink/10 text-ink/60')}`}
                                            >
                                                {mcpApplyCardLink ? '写入模式' : '仅预览'}
                                            </button>
                                            <button
                                                onClick={undoLastMcpChange}
                                                className={`px-3 py-1.5 rounded-lg border ${isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing'}`}
                                            >
                                                撤销上次写入
                                            </button>
                                        </div>
                                        <div className={`max-h-32 overflow-y-auto rounded-lg border ${isVisualMax ? 'border-white/10' : 'border-ink/10'}`}>
                                            {mcpCardResults.length === 0 ? (
                                                <div className="px-3 py-3 text-gray-400">暂无卡牌，请先刷新。</div>
                                            ) : (
                                                mcpCardResults.map((card) => {
                                                    const isSelected = mcpSelectedCardIds.includes(card.id);
                                                    return (
                                                        <button
                                                            key={card.id}
                                                            onClick={() => {
                                                                setMcpSelectedCardIds(prev => isSelected ? prev.filter(id => id !== card.id) : [...prev, card.id]);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 border-b last:border-0 flex items-center justify-between ${isVisualMax ? 'border-white/5 hover:bg-white/5' : 'border-ink/5 hover:bg-paper'} ${isSelected ? (isVisualMax ? 'bg-purple-500/10' : 'bg-daiqing/5') : ''}`}
                                                        >
                                                            <span className="truncate">{card.title || '未命名卡牌'}</span>
                                                            <span className={`text-[10px] ${isSelected ? (isVisualMax ? 'text-purple-300' : 'text-daiqing') : 'text-gray-400'}`}>{isSelected ? '已选' : '选择'}</span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {linkedFiles.length === 0 ? (
                                                <span className="text-[10px] text-gray-400">请先通过“关联内容”选择目标章节或资料</span>
                                            ) : (
                                                linkedFiles.map(file => (
                                                    <span key={file.id} className={`text-[10px] px-2 py-1 rounded-full ${isVisualMax ? 'bg-white/10 text-gray-300' : 'bg-daiqing/10 text-daiqing'}`}>{file.title}</span>
                                                ))
                                            )}
                                        </div>
                                        <button
                                            onClick={runMcpCardLink}
                                            className={`px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'}`}
                                        >
                                            生成联动
                                        </button>
                                    </div>
                                )}

                                {mcpTool === 'task_plan' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={5}
                                                max={200}
                                                value={mcpTaskCount}
                                                onChange={(e) => setMcpTaskCount(Number(e.target.value))}
                                                className={`w-24 px-3 py-2 rounded-lg border outline-none ${isVisualMax ? 'bg-[#27272a] border-white/10 text-gray-200' : 'bg-white border-ink/10 text-ink/80'}`}
                                            />
                                            <span>目标章节数</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setMcpApplyTaskPlan(prev => !prev)}
                                                className={`px-3 py-1.5 rounded-lg border ${mcpApplyTaskPlan ? (isVisualMax ? 'border-green-400 text-green-300' : 'border-green-500 text-green-600') : (isVisualMax ? 'border-white/10 text-gray-400' : 'border-ink/10 text-ink/60')}`}
                                            >
                                                {mcpApplyTaskPlan ? '写入模式' : '仅预览'}
                                            </button>
                                            <button
                                                onClick={undoLastMcpChange}
                                                className={`px-3 py-1.5 rounded-lg border ${isVisualMax ? 'border-white/10 text-gray-400 hover:text-white' : 'border-ink/10 text-ink/60 hover:text-daiqing'}`}
                                            >
                                                撤销上次写入
                                            </button>
                                        </div>
                                        <button
                                            onClick={runMcpTaskPlan}
                                            disabled={mcpLoading}
                                            className={`px-3 py-1.5 rounded-lg text-white ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'} disabled:opacity-60`}
                                        >
                                            {mcpLoading ? '编排中...' : '开始编排'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* @ Menu Dropdown */}
                        {showAtMenu && (
                            <div className={`absolute bottom-[80px] left-4 right-4 border rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-2 custom-scrollbar flex flex-col ${isVisualMax ? 'bg-[#1f1f22] border-white/10' : 'bg-white border-ink/10'}`}>
                                <div className={`px-3 py-2 text-xs font-bold border-b sticky top-0 flex justify-between items-center z-10 ${isVisualMax ? 'bg-[#1f1f22] text-gray-500 border-white/5' : 'bg-white text-ink/40 border-ink/5'}`}>
                                    <span>
                                        {atMenuMode === 'book' ? '选择书辑' : `选择内容 (${activeBookForSearch?.title || '未知书辑'})`}
                                        {atQuery && ` - 搜索: "${atQuery}"`}
                                    </span>
                                    {atMenuMode === 'file' && pendingSelection.length > 0 && (
                                        <button
                                            onClick={confirmSelection}
                                            className={`px-2 py-1 text-white rounded text-[10px] transition-colors ${isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90'}`}
                                        >
                                            确认选择 ({pendingSelection.length})
                                        </button>
                                    )}
                                </div>
                                {filteredItems.length === 0 ? (
                                    <div className="px-3 py-4 text-xs text-center text-gray-400">
                                        {atMenuMode === 'book' ? '未找到相关书辑' : '未找到相关内容'}
                                    </div>
                                ) : (
                                    filteredItems.map(item => {
                                        const isSelected = pendingSelection.find(f => f.id === item.id);
                                        const isLinked = linkedFiles.find(f => f.id === item.id);

                                        return (
                                            <div key={item.id} className={`w-full flex items-center border-b last:border-0 transition-colors group ${isVisualMax ? 'border-white/5 hover:bg-white/5' : 'border-ink/5 hover:bg-paper'} ${isSelected ? (isVisualMax ? 'bg-purple-500/10' : 'bg-daiqing/5') : ''}`}>
                                                <button
                                                    onClick={() => handleSelectItem(item)}
                                                    className="flex-1 text-left px-3 py-2 text-xs flex items-center gap-2"
                                                    disabled={!!isLinked}
                                                >
                                                    <div className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${isSelected ? (isVisualMax ? 'bg-purple-500 text-white' : 'bg-daiqing text-white') : (isVisualMax ? 'bg-white/10 group-hover:bg-white/20' : 'bg-gray-100 group-hover:bg-white')}`}>
                                                        {isSelected ? <Check className="w-3 h-3" /> : (
                                                            item.type === 'book' ? <BookOpen className="w-3 h-3 text-emerald-600" /> :
                                                                item.type === 'chapter' ? <FileText className="w-3 h-3 text-indigo-500" /> :
                                                                    (
                                                                        item.docType === 'character' ? <User className="w-3 h-3 text-pink-500" /> :
                                                                            item.docType === 'setting' ? <Settings className="w-3 h-3 text-gray-500" /> :
                                                                                item.docType === 'world' ? <Globe className="w-3 h-3 text-blue-500" /> :
                                                                                    item.docType === 'system_panel' ? <List className="w-3 h-3 text-purple-500" /> :
                                                                                        item.docType === 'vocabulary' ? <Type className="w-3 h-3 text-green-500" /> :
                                                                                            item.docType === 'meme' ? <Smile className="w-3 h-3 text-yellow-500" /> :
                                                                                                item.docType === 'sample' ? <FileText className="w-3 h-3 text-indigo-500" /> :
                                                                                                    item.docType === 'story' ? <Book className="w-3 h-3 text-amber-500" /> :
                                                                                                        item.docType === 'cool_point' ? <Zap className="w-3 h-3 text-yellow-600" /> :
                                                                                                            item.docType === 'writing_skill' ? <PenTool className="w-3 h-3 text-cyan-500" /> :
                                                                                                                item.docType === 'ai_reference' ? <Copy className="w-3 h-3 text-emerald-500" /> :
                                                                                                                    item.docType === 'force' ? <Users className="w-3 h-3 text-red-500" /> :
                                                                                                                        item.docType === 'style' ? <Wand2 className="w-3 h-3 text-purple-400" /> :
                                                                                                                            item.docType === 'goldfinger' ? <Sparkles className="w-3 h-3 text-yellow-400" /> :
                                                                                                                                <BookOpen className="w-3 h-3 text-amber-500" />
                                                                    )
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium truncate ${isLinked ? 'text-gray-500 line-through' : (isVisualMax ? 'text-gray-300' : 'text-ink/80')}`}>
                                                                {item.type === 'chapter' ? `第${item._chapterIndex}章 ${item.title}` :
                                                                    item.type === 'doc' && item.docType ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className={`text-[10px] px-1 rounded shrink-0 ${isVisualMax ? 'bg-white/10 text-gray-400' : 'bg-black/5 text-ink/50'}`}>
                                                                                {
                                                                                    item.docType === 'character' ? '人设' :
                                                                                        item.docType === 'setting' ? '设定' :
                                                                                            item.docType === 'world' ? '世界' :
                                                                                                item.docType === 'system_panel' ? '面板' :
                                                                                                    item.docType === 'vocabulary' ? '词库' :
                                                                                                        item.docType === 'meme' ? '热梗' :
                                                                                                            item.docType === 'sample' ? '样本' :
                                                                                                                item.docType === 'story' ? '故事' :
                                                                                                                    item.docType === 'cool_point' ? '爽点' :
                                                                                                                        item.docType === 'writing_skill' ? '技巧' :
                                                                                                                            item.docType === 'ai_reference' ? '参考' :
                                                                                                                                item.docType === 'force' ? '势力' :
                                                                                                                                    item.docType === 'style' ? '文风' :
                                                                                                                                        item.docType === 'goldfinger' ? '金手指' :
                                                                                                                                            item.docType === 'summary' ? '概要' : '设定'
                                                                                }
                                                                            </span>
                                                                            <span className="truncate">{item.title}</span>
                                                                        </span>
                                                                    ) : item.title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {item.type !== 'book' && (
                                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{item._wordCount ?? item.content?.length ?? 0}字</span>
                                                    )}
                                                </button>

                                                {item.type === 'book' && !isLinked && (() => {
                                                    const allBookFiles = flattenBookFiles(item);
                                                    const isWholeBookSelected = allBookFiles.length > 0 && allBookFiles.every(f => pendingSelection.some(p => p.id === f.id));

                                                    return (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                // Select all files in the book
                                                                const allIds = allBookFiles.map(f => f.id);

                                                                if (isWholeBookSelected) {
                                                                    // Deselect all
                                                                    setPendingSelection(prev => prev.filter(p => !allIds.includes(p.id)));
                                                                } else {
                                                                    // Select all (merge)
                                                                    // Must enrich with stats first to get word count
                                                                    const enrichedFiles = await enrichFilesWithStats(allBookFiles);

                                                                    applySelectionAndClose(enrichedFiles);
                                                                }
                                                            }}
                                                            className={`px-3 py-2 text-xs font-medium border-l transition-colors ${isVisualMax ? 'border-white/5' : 'border-ink/5'} ${isWholeBookSelected ? (isVisualMax ? 'text-purple-400' : 'text-daiqing') : 'text-gray-400'} ${isVisualMax ? 'hover:bg-purple-500/10 hover:text-purple-400' : 'hover:bg-daiqing/10 hover:text-daiqing'}`}
                                                            title="关联整本书所有章节"
                                                        >
                                                            {isWholeBookSelected ? '已选' : '全书'}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {/* Image Mode Controls */}
                        {isImageMode && (
                            <div className="flex flex-col gap-2 mb-2">
                                {/* Mode Toggle Row */}
                                <div className={`flex items-center justify-between pb-2 border-b ${isVisualMax ? 'border-white/10' : 'border-ink/5'}`}>
                                    <button
                                        onClick={() => setIsBookCoverMode(!isBookCoverMode)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isBookCoverMode
                                            ? (isVisualMax ? 'bg-amber-900/40 text-amber-200 border border-amber-700/50' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                            : (isVisualMax ? 'bg-white/10 text-gray-400 hover:bg-white/15' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
                                            }`}
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        {isBookCoverMode ? '书封模式 (3:4)' : '普通生图'}
                                    </button>

                                    {/* Style Selector for Book Cover */}
                                    {isBookCoverMode && (
                                        <div className="flex gap-1 overflow-x-auto custom-scrollbar max-w-[200px]">
                                            {BOOK_COVER_STYLES.map(style => (
                                                <button
                                                    key={style.label}
                                                    onClick={() => setSelectedCoverStyle(selectedCoverStyle === style.label ? '' : style.label)}
                                                    className={`px-2 py-1 text-[10px] rounded-full whitespace-nowrap transition-colors border ${selectedCoverStyle === style.label
                                                        ? (isVisualMax ? 'bg-purple-600 text-white border-purple-500' : 'bg-daiqing text-white border-daiqing')
                                                        : (isVisualMax ? 'bg-transparent text-gray-400 border-white/10 hover:border-purple-500/50' : 'bg-white text-ink/60 border-ink/10 hover:border-daiqing/30')
                                                        }`}
                                                >
                                                    {style.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Size Selector (Hidden/Locked in Book Cover Mode usually, but let's allow HD toggle) */}
                                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                    {isBookCoverMode ? (
                                        // Book Cover Sizes Only
                                        [
                                            { label: '3:4 (标准)', value: '768x1024' },
                                            { label: '3:4 (高清)', value: '1152x1536' }
                                        ].map(size => (
                                            <button
                                                key={size.value}
                                                onClick={() => setImageSize(size.value)}
                                                className={`px-2 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${imageSize === size.value
                                                    ? 'bg-amber-600 text-white border-amber-700'
                                                    : (isVisualMax ? 'bg-transparent text-gray-400 border-white/10 hover:text-amber-400' : 'bg-white text-ink/60 border-ink/10 hover:border-amber-300 hover:text-amber-600')
                                                    }`}
                                            >
                                                {size.label}
                                            </button>
                                        ))
                                    ) : (
                                        // Normal Sizes
                                        [
                                            { label: '1:1', value: '1024x1024' },
                                            { label: '3:4', value: '768x1024' },
                                            { label: '4:3', value: '1024x768' },
                                            { label: '9:16', value: '576x1024' },
                                            { label: '16:9', value: '1024x576' },
                                            { label: '3:4 (HD)', value: '1152x1536' },
                                            { label: '1:1 (HD)', value: '1408x1408' },
                                            { label: '16:9 (HD)', value: '1536x896' },
                                            { label: '9:16 (HD)', value: '896x1536' }
                                        ].map(size => (
                                            <button
                                                key={size.value}
                                                onClick={() => setImageSize(size.value)}
                                                className={`px-2 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${imageSize === size.value
                                                    ? 'bg-pink-500 text-white border-pink-600'
                                                    : (isVisualMax ? 'bg-transparent text-gray-400 border-white/10 hover:text-pink-400' : 'bg-white text-ink/60 border-ink/10 hover:border-pink-300 hover:text-pink-500')
                                                    }`}
                                            >
                                                {size.label}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isImageMode
                                    ? (isBookCoverMode
                                        ? `描述封面内容（已选风格：${selectedCoverStyle || '默认'}），例如：一把断剑插在雪地里...`
                                        : "输入画面描述，例如：一只在雨中漫步的猫...")
                                    : "输入问题，Shift+Enter 换行..."}
                                className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 outline-none resize-none text-sm max-h-[200px] custom-scrollbar ${
                                    isVisualMax ? 'bg-[#27272a] text-gray-200 placeholder:text-gray-500' : 'bg-paper/50 text-ink placeholder:text-ink/30'
                                    } ${isImageMode
                                        ? (isBookCoverMode ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400' : 'border-pink-300 focus:ring-pink-200 focus:border-pink-400')
                                        : (isVisualMax ? 'border-white/10 focus:ring-purple-500/20 focus:border-purple-500' : 'border-ink/10 focus:ring-daiqing/20 focus:border-daiqing')
                                    }`}
                                rows={1}
                                style={{ minHeight: '46px' }}
                            />
                            <button
                                onClick={() => isLoading ? handleStop() : handleSend()}
                                disabled={!input.trim() && !isLoading}
                                className={`absolute right-2 bottom-2 p-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ${isLoading
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                    : isImageMode
                                        ? (isBookCoverMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-pink-500 hover:bg-pink-600')
                                        : (isVisualMax ? 'bg-purple-600 hover:bg-purple-700' : 'bg-daiqing hover:bg-daiqing/90')
                                    }`}
                                title={isLoading ? "停止生成" : "发送"}
                            >
                                {isLoading ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {(!isDocked || !isAiOpen) && (
                <button
                    onMouseDown={handleMouseDown}
                    onClick={(e) => {
                        if (isDragging.current) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                        setIsAiOpen(!isAiOpen);
                    }}
                    className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center border border-white/20 backdrop-blur-sm cursor-move relative overflow-hidden ${isAiOpen
                        ? (isVisualMax ? 'bg-[#27272a] text-white border-white/10' : 'bg-ink text-white')
                        : (isVisualMax
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-daiqing text-white hover:bg-daiqing/90')
                        }`}
                >
                    {/* '墨' Character State */}
                    <span
                        className={`absolute inset-0 flex items-center justify-center font-serif font-bold text-xl select-none transition-all duration-300 ease-in-out ${isAiOpen
                            ? 'opacity-0 scale-50 rotate-90'
                            : 'opacity-100 scale-100 rotate-0'
                            }`}
                    >
                        墨
                    </span>

                    {/* Close Icon State */}
                    <div
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isAiOpen
                            ? 'opacity-100 scale-100 rotate-0'
                            : 'opacity-0 scale-50 -rotate-90'
                            }`}
                    >
                        <X className="w-6 h-6" />
                    </div>
                </button>
            )}
        </div>
    );
}
