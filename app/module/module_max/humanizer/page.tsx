'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Wand2, 
    AlertTriangle, 
    CheckCircle, 
    Loader, 
    Copy, 
    ArrowRight, 
    Layout, 
    Sparkles,
    FileText,
    Activity,
    Zap,
    Settings,
    ChevronDown
} from 'lucide-react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { aiDetector, aiRewriter, HumanizeScore, HumanizeResult, RewriteMode } from '@/lib/humanizer';
import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';

export default function HumanizerPage() {
    const pathname = usePathname();
    const { isAiOpen } = useEditorAgent();

    // Navigation State
    const isMaxHome = pathname === '/module/module_max';
    const isMaxIdea = pathname === '/module/module_max/idea';
    const isMaxDismantle = pathname === '/module/module_max/dismantle';
    const isMaxOutline = pathname === '/module/module_max/outline';
    const isMaxCreation = pathname === '/module/module_max/creation';
    const isMaxPolish = pathname === '/module/module_max/polish';
    const isMaxHumanizer = pathname === '/module/module_max/humanizer';
    const isMaxConsistency = pathname === '/module/module_max/consistency';
    const isMaxGodMode = pathname === '/module/module_max/godmode';

    // Core State
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<HumanizeResult | null>(null);
    const [score, setScore] = useState<HumanizeScore | null>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'analyze' | 'rewrite'>('analyze');
    const [rewriteMode, setRewriteMode] = useState<RewriteMode>('balanced');
    const [customPrompt, setCustomPrompt] = useState(''); // User custom prompt
    const [systemPrompt, setSystemPrompt] = useState(''); // Full system prompt override
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    
    // Model Config
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        provider: 'vectorengine',
        model: 'gpt-5.1',
        apiKey: '',
        baseUrl: 'https://api.vectorengine.cn/v1'
    });
    
    // useEffect(() => {
    //     // Force enable Max Mode styles globally
    //     document.body.classList.add('max-mode');
    //     return () => {
    //         document.body.classList.remove('max-mode');
    //     };
    // }, []);

    const handleAnalyze = () => {
        if (!inputText.trim()) return;
        setLoading(true);
        // Simulate slight delay for "processing" feel if local, or just run it
        setTimeout(() => {
            try {
                const analyzed = aiDetector.analyze(inputText);
                setScore(analyzed);
                setResult(null);
            } catch (error: any) {
                alert(error?.message || '分析失败');
            } finally {
                setLoading(false);
            }
        }, 500);
    };

    const handleRewrite = async () => {
        if (!inputText.trim()) return;
        
        const { apiKey, baseUrl, model } = modelConfig;
        if (!model) {
            alert('请先配置模型');
            return;
        }

        setLoading(true);
        try {
            const rewritten = await aiRewriter.rewrite(inputText, rewriteMode, { 
                apiKey, 
                baseUrl, 
                model, 
                customPrompt,
                systemPrompt: systemPrompt || undefined 
            });
            setResult(rewritten);
            setScore(null);
        } catch (error: any) {
            alert(error.message || '改写失败');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Optional: show toast
    };

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBg = (s: number) => {
        if (s >= 80) return 'bg-green-500/20 border-green-500/30';
        if (s >= 50) return 'bg-yellow-500/20 border-yellow-500/30';
        return 'bg-red-500/20 border-red-500/30';
    };

    return (
        <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-max-bg-alt text-max-text font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
            
            {/* Header */}
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
                        <Wand2 className="w-4 h-4 text-max-accent" />
                        AI率检测 / 人性化改写
                    </h1>
                    <div className="ml-4">
                        <ModelConfigPanel moduleKey="humanizer" onConfigChange={setModelConfig} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden bg-max-surface-alt">
                <div className="max-w-7xl mx-auto w-full h-full flex gap-6 p-6">
                    
                    {/* Left Column: Input */}
                    <div className="w-1/2 flex flex-col gap-4">
                        <div className="flex bg-max-surface rounded-lg p-1 w-fit border border-max-border">
                            <button
                                onClick={() => setMode('analyze')}
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                    mode === 'analyze' 
                                        ? 'bg-max-accent text-white shadow-sm' 
                                        : 'text-max-text-muted hover:text-max-text'
                                }`}
                            >
                                <Activity className="w-3.5 h-3.5" />
                                AI率分析
                            </button>
                            <button
                                onClick={() => setMode('rewrite')}
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                    mode === 'rewrite' 
                                        ? 'bg-max-accent text-white shadow-sm' 
                                        : 'text-max-text-muted hover:text-max-text'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                人性化改写
                            </button>
                        </div>

                        {mode === 'rewrite' && (
                            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-max-text-muted font-bold px-1">改写模式:</span>
                                    <div className="flex bg-max-surface rounded-lg p-0.5 border border-max-border">
                                        <button
                                            onClick={() => setRewriteMode('conservative')}
                                            className={`px-3 py-1 text-[10px] rounded-md transition-colors ${
                                                rewriteMode === 'conservative' ? 'bg-max-accent text-white shadow-sm' : 'text-max-text-muted hover:text-max-text'
                                            }`}
                                            title="仅修饰连接词，最大程度保留原文"
                                        >
                                            保守
                                        </button>
                                        <button
                                            onClick={() => setRewriteMode('balanced')}
                                            className={`px-3 py-1 text-[10px] rounded-md transition-colors ${
                                                rewriteMode === 'balanced' ? 'bg-max-accent text-white shadow-sm' : 'text-max-text-muted hover:text-max-text'
                                            }`}
                                            title="兼顾自然度与内容完整性 (推荐)"
                                        >
                                            平衡
                                        </button>
                                        <button
                                            onClick={() => setRewriteMode('creative')}
                                            className={`px-3 py-1 text-[10px] rounded-md transition-colors ${
                                                rewriteMode === 'creative' ? 'bg-max-accent text-white shadow-sm' : 'text-max-text-muted hover:text-max-text'
                                            }`}
                                            title="大幅改写，增加细节与沉浸感"
                                        >
                                            强力
                                        </button>
                                    </div>
                                </div>

                                <div className="px-1">
                                    <div className="text-xs text-max-text-muted font-bold mb-1 flex items-center gap-1">
                                        <span>额外指令</span>
                                        <span className="text-[10px] font-normal opacity-50">(可选)</span>
                                    </div>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="例如：请使用更古风的措辞；或者，请模仿鲁迅的文风..."
                                        className="w-full h-16 p-2 bg-max-surface border border-max-border rounded-lg text-xs resize-none focus:outline-none focus:border-max-accent transition-all placeholder:text-max-text-muted/50 custom-scrollbar text-max-text"
                                    />
                                </div>

                                {/* Advanced Prompt Editor */}
                                <div className="px-1 border-t border-max-border pt-2 mt-1">
                                    <button
                                        onClick={() => setShowPromptEditor(!showPromptEditor)}
                                        className="flex items-center gap-1 text-xs text-max-text-muted hover:text-max-accent transition-colors w-full"
                                    >
                                        <Settings className="w-3 h-3" />
                                        <span className="font-bold">高级：编辑完整提示词 (System Prompt)</span>
                                        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showPromptEditor ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {showPromptEditor && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] text-max-text-muted">
                                                    当前完整提示词 (编辑后将覆盖上方设置)
                                                </span>
                                                {systemPrompt && (
                                                    <button 
                                                        onClick={() => setSystemPrompt('')}
                                                        className="text-[10px] text-max-accent hover:underline"
                                                    >
                                                        重置为默认
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={systemPrompt || (score ? aiRewriter.getSystemPrompt(score, rewriteMode, { customPrompt }) : '')}
                                                onChange={(e) => setSystemPrompt(e.target.value)}
                                                className="w-full h-48 p-2 bg-max-surface border border-max-border rounded-lg text-[10px] font-mono leading-relaxed resize-y focus:outline-none focus:border-max-accent transition-all custom-scrollbar text-max-text"
                                                spellCheck={false}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 relative group">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="在此处粘贴需要分析或改写的AI生成文本..."
                                className="w-full h-full p-6 bg-max-bg border border-max-border rounded-xl resize-none focus:outline-none focus:border-max-accent transition-all text-sm leading-relaxed text-max-text placeholder:text-max-text-muted/50 custom-scrollbar font-mono"
                            />
                            <div className="absolute bottom-4 right-4 text-xs text-max-text-muted font-mono">
                                {inputText.length} 字
                            </div>
                        </div>

                        <div className="h-12">
                            {mode === 'analyze' ? (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!inputText.trim() || loading}
                                    className="w-full h-full bg-max-accent hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-max-accent/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                    开始分析
                                </button>
                            ) : (
                                <button
                                    onClick={handleRewrite}
                                    disabled={!inputText.trim() || loading}
                                    className="w-full h-full bg-max-accent hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-max-accent/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            正在改写中...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            开始人性化改写
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Result */}
                    <div className="w-1/2 flex flex-col gap-4">
                        {/* Placeholder */}
                        {!score && !result && (
                            <div className="h-full bg-max-bg border border-dashed border-max-border rounded-xl flex flex-col items-center justify-center text-max-text-muted p-8 text-center">
                                <div className="w-16 h-16 bg-max-surface rounded-full flex items-center justify-center mb-6">
                                    {mode === 'analyze' ? <Activity className="w-8 h-8 opacity-50" /> : <Wand2 className="w-8 h-8 opacity-50" />}
                                </div>
                                <h3 className="text-sm font-bold text-max-text-muted mb-2">
                                    {mode === 'analyze' ? '等待分析' : '等待改写'}
                                </h3>
                                <p className="text-xs max-w-xs opacity-70">
                                    {mode === 'analyze' 
                                        ? '请在左侧输入文本，点击“开始分析”以检测文本的AI特征含量' 
                                        : '请在左侧输入文本，点击“开始人性化改写”以降低AI特征，使其更自然'}
                                </p>
                            </div>
                        )}

                        {/* Analysis Result */}
                        {mode === 'analyze' && score && (
                            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Score Card */}
                                <div className="bg-max-bg border border-max-border rounded-xl p-6 relative overflow-hidden">
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="relative">
                                            <svg className="w-24 h-24 transform -rotate-90">
                                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-max-text-muted/10" />
                                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * score.overall) / 100} className={`${getScoreColor(score.overall)} transition-all duration-1000 ease-out`} />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className={`text-2xl font-bold font-mono ${getScoreColor(score.overall)}`}>{score.overall}</span>
                                                <span className="text-[10px] text-max-text-muted font-medium">人性化</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-max-text">文本检测评分</h2>
                                            <p className="text-max-text-muted text-xs mt-1">分数越高，越接近人类自然写作风格</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-2 mt-6 relative z-10">
                                        {Object.entries(score.breakdown).map(([key, value]) => (
                                            <div key={key} className="bg-max-surface rounded-lg p-2 text-center border border-max-border">
                                                <div className={`text-sm font-bold font-mono mb-1 ${getScoreColor(value)}`}>{value}</div>
                                                <div className="text-[10px] text-max-text-muted">
                                                    {key === 'repetition' ? '重复度' :
                                                        key === 'structure' ? '结构' :
                                                            key === 'vocabulary' ? '词汇' :
                                                                key === 'emotion' ? '情感' : '细节'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Issues List */}
                                <div className="flex-1 bg-max-bg border border-max-border rounded-xl p-6 overflow-hidden flex flex-col">
                                    <h3 className="font-bold text-max-text mb-4 flex items-center gap-2 text-sm">
                                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                        检测到的问题
                                    </h3>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                        {score.issues.length === 0 ? (
                                            <div className="text-center py-12 text-green-500/50 flex flex-col items-center">
                                                <CheckCircle className="w-12 h-12 mb-3" />
                                                <p className="text-sm">未发现明显的AI特征</p>
                                            </div>
                                        ) : (
                                            score.issues.map((issue) => (
                                                <div key={issue.id} className={`p-3 rounded-lg border ${
                                                    issue.severity === 'high' ? 'border-red-500/20 bg-red-500/5' : 
                                                    issue.severity === 'medium' ? 'border-yellow-500/20 bg-yellow-500/5' : 
                                                    'border-max-border bg-max-surface'
                                                }`}>
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                                                            issue.severity === 'high' ? 'text-red-400' : 
                                                            issue.severity === 'medium' ? 'text-yellow-400' : 'text-max-text-muted'
                                                        }`} />
                                                        <div>
                                                            <div className="font-bold text-xs text-max-text mb-1">{issue.title}</div>
                                                            <div className="text-[10px] text-max-text-muted leading-relaxed">{issue.suggestion}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rewrite Result */}
                        {mode === 'rewrite' && result && (
                            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Comparison Header */}
                                <div className="bg-max-bg border border-max-border rounded-xl p-4 flex items-center justify-around">
                                    <div className="text-center">
                                        <div className="text-xs text-max-text-muted mb-1">改写前</div>
                                        <div className={`text-xl font-bold font-mono ${getScoreColor(result.scoreBefore.overall)}`}>
                                            {result.scoreBefore.overall}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-max-text-muted" />
                                    <div className="text-center">
                                        <div className="text-xs text-max-text-muted mb-1">改写后</div>
                                        <div className={`text-2xl font-bold font-mono ${getScoreColor(result.scoreAfter.overall)}`}>
                                            {result.scoreAfter.overall}
                                        </div>
                                    </div>
                                </div>

                                {/* Output Text */}
                                <div className="flex-1 bg-max-bg border border-max-border rounded-xl relative group overflow-hidden flex flex-col">
                                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyToClipboard(result.rewritten)}
                                            className="p-2 bg-max-surface text-max-text rounded-lg shadow-lg hover:bg-max-surface-alt border border-max-border transition-colors"
                                            title="复制结果"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="p-3 border-b border-max-border bg-max-bg/50">
                                        <span className="text-xs font-bold text-max-text-muted uppercase tracking-wider">改写结果</span>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={result.rewritten || ''}
                                        className="flex-1 w-full p-6 bg-transparent outline-none text-max-text font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                                    />
                                </div>

                                {/* Changes Log */}
                                {result.changes && result.changes.length > 0 && (
                                    <div className="h-1/3 bg-max-bg border border-max-border rounded-xl p-4 flex flex-col">
                                        <h3 className="font-bold text-max-text-muted mb-3 text-xs uppercase tracking-wider">主要变更点</h3>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                            {result.changes.map((change, i) => (
                                                <div key={i} className="text-[10px] flex gap-2 pb-2 border-b border-max-border last:border-0 last:pb-0">
                                                    <span className="text-blue-400 shrink-0 font-medium">[{change.reason}]</span>
                                                    <span className="text-max-text-muted truncate">
                                                        <span className="line-through opacity-50 mr-2">{change.original}</span>
                                                        →
                                                        <span className="ml-2 text-max-text">{change.replacement}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
