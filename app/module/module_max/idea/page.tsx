'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lightbulb, Sparkles, RefreshCw, Copy, Plus, X, Zap, Layers, Search, Check, Globe, Download, Heart, Share2, User } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { generateAIContentStream } from '@/lib/ai';
import { APIConfigValidator } from '@/lib/api-validator';
import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';

interface IdeaItem {
    id: string;
    title: string;
    hook: string;
    summary: string;
    anchor?: string;
    base?: string;
    prototype?: string;
    entryPoint?: string;
}

interface Card {
    id: string;
    type: string;
    title: string;
    example: string;
    analysis: string;
    tags: string[];
}

export default function MaxIdeaPage() {
    const pathname = usePathname();
    const { isAiOpen, registerPageSkill, unregisterPageSkill } = useEditorAgent();

    // Navigation State
    const isMaxHome = pathname === '/module/module_max';
    const isMaxDismantle = pathname === '/module/module_max/dismantle';
    const isMaxCreation = pathname === '/module/module_max/creation';
    const isMaxPolish = pathname === '/module/module_max/polish';
    const isMaxOutline = pathname === '/module/module_max/outline';
    const isMaxIdea = pathname === '/module/module_max/idea';
    const isMaxConsistency = pathname === '/module/module_max/consistency';
    const isMaxHumanizer = pathname === '/module/module_max/humanizer';
    const isMaxGodMode = pathname === '/module/module_max/godmode';

    // State
    const [keywords, setKeywords] = useState('');
    const [genre, setGenre] = useState('玄幻');
    const [ideaCount, setIdeaCount] = useState(3);
    const [generatedIdeas, setGeneratedIdeas] = useState<IdeaItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    // Model Config
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        provider: 'siliconflow',
        model: 'deepseek-ai/DeepSeek-V3',
        apiKey: '',
        baseUrl: 'https://api.siliconflow.cn/v1'
    });

    // Card State
    const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
    const [selectedCards, setSelectedCards] = useState<Card[]>([]);
    const [showCardSelector, setShowCardSelector] = useState(false);
    const [cardSearch, setCardSearch] = useState('');

    // Market State
    const [activeTab, setActiveTab] = useState<'mine' | 'market'>('mine');
    const [marketIdeas, setMarketIdeas] = useState<any[]>([]);
    const [likedIdeaIds, setLikedIdeaIds] = useState<string[]>([]);
    const [isLoadingMarket, setIsLoadingMarket] = useState(false);

    // useEffect(() => {
    //     // Force enable Max Mode styles globally
    //     document.body.classList.add('max-mode');
    //     return () => {
    //         document.body.classList.remove('max-mode');
    //     };
    // }, []);

    const fetchMarketIdeas = useCallback(async () => {
        setIsLoadingMarket(true);
        try {
            const res = await fetch('/api/market/ideas');
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    setMarketIdeas(json.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch market ideas', error);
        } finally {
            setIsLoadingMarket(false);
        }
    }, []);

    const handleLikeIdea = async (id: string) => {
        if (likedIdeaIds.includes(id)) return;
        try {
            const res = await fetch(`/api/market/ideas/${id}/like`, {
                method: 'POST'
            });
            if (res.ok) {
                setLikedIdeaIds(prev => [...prev, id]);
                setMarketIdeas(prev => prev.map(idea => 
                    idea.id === id ? { ...idea, likeCount: (idea.likeCount || 0) + 1 } : idea
                ));
            }
        } catch (error) {
            console.error('Like error', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'market') {
            fetchMarketIdeas();
        }
    }, [activeTab, fetchMarketIdeas]);

    const handleImportIdea = (idea: any) => {
        const newIdea = {
            id: crypto.randomUUID(),
            title: idea.title,
            hook: idea.hook,
            summary: idea.summary
        };
        setGeneratedIdeas(prev => [newIdea, ...prev]);
        setActiveTab('mine');
        alert('灵感已成功导入到我的库中！');
    };

    const handleShareIdea = async (idea: IdeaItem) => {
        if(!confirm('确定要将这个灵感分享到市场吗？\n分享后其他作者可以查看并引用。')) {
            return;
        }

        try {
            const res = await fetch('/api/auth/me');
            const userData = await res.json();
            const uploaderName = userData.user?.username || '匿名';
            const uploaderId = userData.user?.id || null;

            const shareRes = await fetch('/api/market/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: idea.title,
                    hook: idea.hook,
                    summary: idea.summary,
                    tags: ['脑洞', '创意'],
                    uploaderName,
                    uploaderId
                })
            });

            if (shareRes.ok) {
                alert('分享成功！感谢您的贡献。');
                if (activeTab === 'market') {
                    fetchMarketIdeas();
                }
            } else {
                if (shareRes.status === 401) {
                    alert('分享失败：请先登录后再分享。');
                    return;
                }
                const json = await shareRes.json().catch(() => ({}));
                alert(`分享失败: ${json?.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('Share error', error);
            alert('分享失败，请检查网络');
        }
    };

    // Persistence
    useEffect(() => {
        const loadSaved = async () => {
            const savedIdeas = await StorageManager.getJSONAsync('novel_writer_max_ideas');
            if (Array.isArray(savedIdeas)) setGeneratedIdeas(savedIdeas);
            const savedKeywords = StorageManager.get('novel_writer_max_idea_keywords');
            if (savedKeywords) setKeywords(savedKeywords);
            const savedGenre = StorageManager.get('novel_writer_max_idea_genre');
            if (savedGenre) setGenre(savedGenre);

            // Load Cards
            try {
                const savedCards = await StorageManager.getJSONAsync('novel_writer_card_library');
                if (Array.isArray(savedCards)) setCardLibrary(savedCards);
                
                // Load Selected Cards
                const savedSelectedCards = await StorageManager.getJSONAsync('novel_writer_max_idea_cards');
                if (Array.isArray(savedSelectedCards)) setSelectedCards(savedSelectedCards);
            } catch (e) {
                console.error('Failed to load cards', e);
            }
        };
        loadSaved();
    }, []);

    useEffect(() => {
        StorageManager.setJSON('novel_writer_max_ideas', generatedIdeas);
    }, [generatedIdeas]);

    useEffect(() => {
        StorageManager.setJSON('novel_writer_max_idea_cards', selectedCards);
    }, [selectedCards]);

    useEffect(() => {
        StorageManager.set('novel_writer_max_idea_keywords', keywords);
    }, [keywords]);

    useEffect(() => {
        StorageManager.set('novel_writer_max_idea_genre', genre);
    }, [genre]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const getBigModelConfig = () => {
        const apiKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        const baseUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        const model = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL) || 'deepseek-ai/DeepSeek-V3';
        const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
        return { apiKey, baseUrl, model, validation };
    };

    const handleGenerateIdeas = async () => {
        if (!keywords.trim() && !genre.trim()) {
            setError('请输入关键词或选择题材');
            return;
        }

        const { apiKey, baseUrl, model } = modelConfig;
        // Basic validation
        if (!model) {
             setError('请先配置模型');
             return;
        }

        setIsGenerating(true);
        setError('');
        abortControllerRef.current = new AbortController();

        const systemPrompt = '你是资深网文主编，擅长深度融合提供的设定资料，构思出极具吸引力、脑洞大开的小说创意。你能够自然地将资料中的元素内化为故事逻辑，绝不生硬地提及“卡牌”或“资料来源”。';
        const cardContext = selectedCards.length > 0 
            ? selectedCards.map(c => `设定资料（${c.type} - ${c.title}）：\n${c.analysis || c.example}`).join('\n\n')
            : '无';

        const userPrompt = `
任务：生成 ${ideaCount} 个差异化的小说脑洞创意。
题材：${genre}
关键词/元素：${keywords}
参考设定/背景资料：
${cardContext}

要求：
1. **深度融合**：请将“参考设定/背景资料”中的细节、逻辑、角色或世界观元素深度融合到你的脑洞中，使其成为故事不可或缺的一部分。
2. **禁止生硬引用**：严禁在生成的文字中出现“根据资料”、“卡牌显示”、“资料中的设定”等字眼。资料内容应直接转化为故事中的设定和情节。
3. 每个创意包含：【书名】、【一句话核心梗/钩子】、【简要大纲/卖点】、【核心锚点】、【基础基底】、【核心人物雏形】、【开篇切入点】。
4. 脑洞要新颖，反套路，符合当前网文市场热点。
5. 格式必须严格遵循 JSON 数组格式，不要Markdown代码块，例如：
[
  { 
    "title": "书名", 
    "hook": "核心梗", 
    "summary": "简要大纲/卖点", 
    "anchor": "核心锚点", 
    "base": "基础基底", 
    "prototype": "核心人物雏形", 
    "entryPoint": "开篇切入点" 
  },
  ...
]
`;

        try {
            let fullText = '';
            await generateAIContentStream(
                apiKey,
                systemPrompt,
                userPrompt,
                baseUrl,
                model,
                (chunk) => {
                    fullText = chunk;
                },
                abortControllerRef.current.signal
            );

            // Attempt to parse JSON
            try {
                // Find JSON array in text
                const match = fullText.match(/\[[\s\S]*\]/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    const newIdeas = parsed.map((item: any) => ({
                        id: crypto.randomUUID(),
                        title: item.title,
                        hook: item.hook,
                        summary: item.summary,
                        anchor: item.anchor,
                        base: item.base,
                        prototype: item.prototype,
                        entryPoint: item.entryPoint
                    }));
                    setGeneratedIdeas(prev => [...newIdeas, ...prev]);
                } else {
                    // Fallback if not JSON
                     const fallbackId = crypto.randomUUID();
                     setGeneratedIdeas(prev => [{
                        id: fallbackId,
                        title: '生成结果（非JSON格式）',
                        hook: '请查看详情',
                        summary: fullText
                     }, ...prev]);
                }
            } catch (e) {
                console.error('JSON Parse Error', e);
                // Fallback
                const fallbackId = crypto.randomUUID();
                 setGeneratedIdeas(prev => [{
                    id: fallbackId,
                    title: '生成结果（解析失败）',
                    hook: '请手动整理',
                    summary: fullText
                 }, ...prev]);
            }

        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setError(e.message || '生成失败');
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleDeleteIdea = (id: string) => {
        setGeneratedIdeas(prev => prev.filter(i => i.id !== id));
    };

    const handleCopyIdea = (idea: IdeaItem) => {
        const text = `书名：${idea.title}
核心梗：${idea.hook}
简介：${idea.summary}${idea.anchor ? `\n核心锚点：${idea.anchor}` : ''}${idea.base ? `\n基础基底：${idea.base}` : ''}${idea.prototype ? `\n核心人物雏形：${idea.prototype}` : ''}${idea.entryPoint ? `\n开篇切入点：${idea.entryPoint}` : ''}`;
        navigator.clipboard.writeText(text);
        alert('已复制到剪贴板');
    };

    // Page Skill
    useEffect(() => {
        const handlePageSkill = async (payload: { action: string; value?: any }) => {
            const { action, value } = payload;
            if (action === 'set_keywords') setKeywords(String(value));
            if (action === 'set_genre') setGenre(String(value));
            if (action === 'generate_ideas') handleGenerateIdeas();
            if (action === 'clear_ideas') setGeneratedIdeas([]);
        };

        registerPageSkill('page_control', handlePageSkill);
        return () => unregisterPageSkill('page_control');
    }, [registerPageSkill, unregisterPageSkill, handleGenerateIdeas]);

    return (
        <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-max-bg-alt text-max-text font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
            
            {/* Top Bar */}
            <header className="h-14 border-b border-max-border flex items-center justify-between px-4 bg-max-bg shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-max-surface rounded-lg p-1 border border-max-border overflow-x-auto no-scrollbar max-w-[60vw]">
                        <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHome ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>MAX 主页</Link>
                        <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxIdea ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>脑洞风暴</Link>
                        <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxDismantle ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>拆书</Link>
                        <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxOutline ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>大纲生成</Link>
                        <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxCreation ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>万字冲刺</Link>
                        <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxPolish ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>自循环</Link>
                        <Link href="/module/module_max/consistency" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxConsistency ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>一致性</Link>
                        <Link href="/module/module_max/humanizer" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHumanizer ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>AI去味</Link>
                        <Link href="/module/module_max/godmode" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxGodMode ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>上帝模式</Link>
                    </div>
                    <div className="h-4 w-[1px] bg-max-border"></div>
                    <h1 className="text-sm font-bold text-max-text flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        脑洞风暴
                    </h1>
                    <div className="ml-4">
                        <ModelConfigPanel moduleKey="idea" onConfigChange={setModelConfig} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden bg-max-surface-alt flex">
                
                {/* Left: Inputs */}
                <div className="w-80 border-r border-max-border p-6 flex flex-col gap-6 bg-max-bg">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-max-text-muted mb-2">题材类型</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['玄幻', '都市', '科幻', '悬疑', '仙侠', '历史', '游戏', '轻小说', '女频'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setGenre(t)}
                                        className={`px-2 py-1.5 text-xs rounded-md border transition-all ${
                                            genre === t 
                                            ? 'bg-max-accent/20 border-max-accent text-max-accent' 
                                            : 'bg-max-surface border-max-border text-max-text-muted hover:text-max-text'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <input 
                                type="text"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="mt-2 w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent"
                                placeholder="或手动输入..."
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-max-text-muted">关联卡牌 ({selectedCards.length})</label>
                                <button 
                                    onClick={() => setShowCardSelector(true)}
                                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> 添加/管理
                                </button>
                            </div>
                            {selectedCards.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedCards.map(c => (
                                        <span key={c.id} className="text-[10px] px-2 py-1 bg-max-surface border border-max-border rounded text-max-text flex items-center gap-1 group relative cursor-pointer" onClick={() => setSelectedCards(prev => prev.filter(x => x.id !== c.id))}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                c.type === '角色' ? 'bg-blue-400' : 'bg-green-400'
                                            }`}></span>
                                            {c.title}
                                            <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-max-text-muted hover:text-red-400" />
                                        </span>
                                    ))}
                                </div>
                            )}
                            {(selectedCards.length === 0) && (
                                <div 
                                    onClick={() => setShowCardSelector(true)}
                                    className="w-full py-2 border border-dashed border-max-border rounded-lg flex flex-col items-center justify-center text-max-text-muted hover:bg-max-surface hover:text-max-text hover:border-max-border/50 transition-all cursor-pointer gap-1 mb-4"
                                >
                                    <Layers className="w-4 h-4 opacity-50" />
                                    <span className="text-[10px]">点击选择角色卡 / 设定卡</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-max-text-muted mb-2">关键词 / 元素 / 灵感</label>
                            <textarea
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                rows={5}
                                className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent resize-none placeholder:text-max-text-muted"
                                placeholder="例如：赛博朋克、修仙、系统、复仇、废土..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-max-text-muted mb-2">生成数量: {ideaCount}</label>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value={ideaCount}
                                onChange={(e) => setIdeaCount(Number(e.target.value))}
                                className="w-full h-2 bg-max-surface-alt rounded-lg appearance-none cursor-pointer accent-max-accent"
                            />
                        </div>

                        {error && (
                            <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerateIdeas}
                            disabled={isGenerating}
                            className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    正在裂变脑洞...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    开始头脑风暴
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Results */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 flex flex-col">
                    {/* Tab Header */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex bg-max-surface rounded-lg p-1 border border-max-border">
                            <button
                                onClick={() => setActiveTab('mine')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                    activeTab === 'mine' 
                                        ? 'bg-max-accent text-white shadow-sm' 
                                        : 'text-max-text-muted hover:text-max-text'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                我的生成
                            </button>
                            <button
                                onClick={() => setActiveTab('market')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                    activeTab === 'market' 
                                        ? 'bg-max-accent text-white shadow-sm' 
                                        : 'text-max-text-muted hover:text-max-text'
                                }`}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                灵感市场
                            </button>
                        </div>
                        <span className="text-xs text-max-text-muted">
                            {activeTab === 'mine' ? `共 ${generatedIdeas.length} 个创意` : '全网实时同步'}
                        </span>
                    </div>

                    {/* Content */}
                    {activeTab === 'mine' ? (
                        generatedIdeas.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-max-text-muted gap-4 border-2 border-dashed border-max-border rounded-xl min-h-[300px]">
                                <Lightbulb className="w-12 h-12 opacity-20" />
                                <p>左侧输入关键词，点击生成，让 AI 为你打开脑洞</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                                {generatedIdeas.map((idea) => (
                                    <div key={idea.id} className="bg-max-bg border border-max-border rounded-xl p-5 hover:border-max-accent/50 transition-all group relative flex flex-col h-full shadow-lg shadow-black/20 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button 
                                                onClick={() => handleShareIdea(idea)}
                                                className="p-1.5 bg-max-surface text-max-text-muted hover:text-max-accent rounded-md border border-max-border transition-colors"
                                                title="分享到市场"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleCopyIdea(idea)}
                                                className="p-1.5 bg-max-surface text-max-text-muted hover:text-max-text rounded-md border border-max-border transition-colors"
                                                title="复制"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteIdea(idea.id)}
                                                className="p-1.5 bg-max-surface text-max-text-muted hover:text-red-400 rounded-md border border-max-border transition-colors"
                                                title="删除"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        
                                        <h3 className="text-base font-bold text-max-text mb-2 pr-20 truncate">{idea.title}</h3>
                                        
                                        <div className="mb-3">
                                            <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-medium">核心梗</span>
                                            <p className="mt-1 text-sm text-max-text-muted leading-relaxed font-bold line-clamp-2" title={idea.hook}>{idea.hook}</p>
                                        </div>
                                        
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-medium">大纲/卖点</span>
                                                <p className="mt-1 text-xs text-max-text-muted leading-relaxed whitespace-pre-wrap line-clamp-4">{idea.summary}</p>
                                            </div>

                                            {idea.anchor && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-medium">核心锚点</span>
                                                        <p className="mt-1 text-[11px] text-max-text-muted line-clamp-2">{idea.anchor}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded font-medium">基础基底</span>
                                                        <p className="mt-1 text-[11px] text-max-text-muted line-clamp-2">{idea.base}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {idea.prototype && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded font-medium">核心人物雏形</span>
                                                        <p className="mt-1 text-[11px] text-max-text-muted line-clamp-2">{idea.prototype}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-medium">开篇切入点</span>
                                                        <p className="mt-1 text-[11px] text-max-text-muted line-clamp-2">{idea.entryPoint}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        isLoadingMarket ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-max-text-muted gap-4">
                                <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
                                <p>正在加载灵感市场...</p>
                            </div>
                        ) : marketIdeas.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-max-text-muted gap-4 border-2 border-dashed border-max-border rounded-xl min-h-[300px]">
                                <Globe className="w-12 h-12 opacity-20" />
                                <p>灵感市场空空如也，快来分享你的创意吧！</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                                {marketIdeas.map((idea) => {
                                    const tags = typeof idea.tags === 'string' ? JSON.parse(idea.tags) : (Array.isArray(idea.tags) ? idea.tags : []);
                                    return (
                                        <div key={idea.id} className="bg-max-bg border border-max-border rounded-xl p-5 hover:border-blue-500/50 transition-all group relative flex flex-col h-full shadow-lg shadow-black/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button 
                                                    onClick={() => handleImportIdea(idea)}
                                                    className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold shadow-lg shadow-blue-900/20 flex items-center gap-1 transition-colors"
                                                    title="一键导入"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    导入
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-between mb-2 pr-16">
                                                <h3 className="text-base font-bold text-max-text truncate">{idea.title}</h3>
                                            </div>

                                            <div className="flex items-center gap-4 mb-3 text-xs text-max-text-muted">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3" />
                                                    {idea.uploaderName || '匿名'}
                                                </span>
                                                <button 
                                                    onClick={() => handleLikeIdea(idea.id)}
                                                    disabled={likedIdeaIds.includes(idea.id)}
                                                    className={`flex items-center gap-1.5 transition-colors ${likedIdeaIds.includes(idea.id) ? 'text-red-500' : 'text-max-text-muted hover:text-red-400'}`}
                                                >
                                                    <Heart className={`w-3 h-3 ${likedIdeaIds.includes(idea.id) ? 'fill-current' : ''}`} />
                                                    {idea.likeCount || 0}
                                                </button>
                                            </div>
                                            
                                            <div className="mb-3">
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-medium">核心梗</span>
                                                <p className="mt-1 text-sm text-max-text-muted leading-relaxed font-bold line-clamp-2">{idea.hook}</p>
                                            </div>
                                            
                                            <div className="flex-1 mb-3">
                                                <p className="text-xs text-max-text-muted leading-relaxed whitespace-pre-wrap line-clamp-3">{idea.summary}</p>
                                            </div>

                                            {tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-auto pt-3 border-t border-max-border">
                                                    {tags.map((tag: string) => (
                                                        <span key={tag} className="text-[10px] text-max-text-muted bg-max-surface px-1.5 py-0.5 rounded">#{tag}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Card Selector Modal */}
            {showCardSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-max-backdrop backdrop-blur-sm p-4">
                    <div className="bg-max-bg border border-max-border rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                        <div className="h-14 border-b border-max-border flex items-center justify-between px-6 bg-max-surface/50 rounded-t-xl">
                            <h3 className="font-bold text-max-text flex items-center gap-2">
                                <Layers className="w-5 h-5 text-max-accent" />
                                选择关联卡牌
                            </h3>
                            <button 
                                onClick={() => setShowCardSelector(false)}
                                className="p-2 hover:bg-max-surface-alt rounded-lg text-max-text-muted hover:text-max-text transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-max-border bg-max-surface/20">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-max-text-muted" />
                                <input 
                                    type="text" 
                                    value={cardSearch}
                                    onChange={(e) => setCardSearch(e.target.value)}
                                    className="w-full bg-max-surface-alt border border-max-border rounded-lg pl-9 pr-4 py-2 text-sm text-max-text focus:border-max-accent outline-none"
                                    placeholder="搜索卡牌名称、标签..."
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {cardLibrary.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-max-text-muted gap-2">
                                    <Layers className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">暂无卡牌数据</p>
                                    <p className="text-xs">请先在【卡牌库】或【创作】页面添加卡牌</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {cardLibrary
                                        .filter(c => 
                                            c.title.includes(cardSearch) || 
                                            c.tags.some(t => t.includes(cardSearch)) ||
                                            c.type.includes(cardSearch)
                                        )
                                        .map(card => {
                                            const isSelected = selectedCards.some(s => s.id === card.id);
                                            return (
                                                <div 
                                                    key={card.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedCards(prev => prev.filter(c => c.id !== card.id));
                                                        } else {
                                                            setSelectedCards(prev => [...prev, card]);
                                                        }
                                                    }}
                                                    className={`
                                                        group relative p-3 rounded-lg border cursor-pointer transition-all
                                                        ${isSelected 
                                                            ? 'bg-max-accent/10 border-max-accent/50' 
                                                            : 'bg-max-surface/50 border-max-border hover:border-max-text/20 hover:bg-max-surface'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                            card.type === '角色' 
                                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        }`}>
                                                            {card.type}
                                                        </span>
                                                        {isSelected && <Check className="w-4 h-4 text-max-accent" />}
                                                    </div>
                                                    <h4 className="font-bold text-max-text text-sm mb-1 truncate">{card.title}</h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {card.tags.slice(0, 3).map((tag, i) => (
                                                            <span key={i} className="text-[10px] text-max-text-muted bg-max-surface px-1 rounded">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-max-border bg-max-surface/50 flex justify-between items-center rounded-b-xl">
                            <span className="text-xs text-max-text-muted">
                                已选 {selectedCards.length} 张卡牌
                            </span>
                            <button 
                                onClick={() => setShowCardSelector(false)}
                                className="px-6 py-2 bg-max-accent hover:opacity-90 text-white text-sm font-bold rounded-lg transition-colors"
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
