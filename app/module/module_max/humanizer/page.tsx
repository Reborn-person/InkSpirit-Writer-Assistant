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
    Zap
} from 'lucide-react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { aiDetector, aiRewriter, HumanizeScore, HumanizeResult } from '@/lib/humanizer';

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

    // Core State
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<HumanizeResult | null>(null);
    const [score, setScore] = useState<HumanizeScore | null>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'analyze' | 'rewrite'>('analyze');
    
    const handleAnalyze = () => {
        if (!inputText.trim()) return;
        setLoading(true);
        // Simulate slight delay for "processing" feel if local, or just run it
        setTimeout(() => {
            const analyzed = aiDetector.analyze(inputText);
            setScore(analyzed);
            setResult(null);
            setLoading(false);
        }, 500);
    };

    const handleRewrite = async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        try {
            const rewritten = await aiRewriter.rewrite(inputText);
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
        <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-[#18181b] text-gray-300 font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
            
            {/* Header */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#18181b] shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-[#27272a] rounded-lg p-1">
                        <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxHome ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>MAX 主页</Link>
                        <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxIdea ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>脑洞风暴</Link>
                        <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxDismantle ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>拆书</Link>
                        <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxOutline ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>大纲生成</Link>
                        <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxCreation ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>万字冲刺</Link>
                        <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxPolish ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>自循环</Link>
                        <Link href="/module/module_max/humanizer" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxHumanizer ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>AI去味</Link>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <h1 className="text-sm font-bold text-white flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-purple-400" />
                        AI率检测 / 人性化改写
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden bg-[#09090b]">
                <div className="max-w-7xl mx-auto w-full h-full flex gap-6 p-6">
                    
                    {/* Left Column: Input */}
                    <div className="w-1/2 flex flex-col gap-4">
                        <div className="flex bg-[#27272a] rounded-lg p-1 w-fit border border-white/10">
                            <button
                                onClick={() => setMode('analyze')}
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                    mode === 'analyze' 
                                        ? 'bg-[#3f3f46] text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Activity className="w-3.5 h-3.5" />
                                AI率分析
                            </button>
                            <button
                                onClick={() => setMode('rewrite')}
                                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                                    mode === 'rewrite' 
                                        ? 'bg-[#3f3f46] text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                人性化改写
                            </button>
                        </div>

                        <div className="flex-1 relative group">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="在此处粘贴需要分析或改写的AI生成文本..."
                                className="w-full h-full p-6 bg-[#18181b] border border-white/10 rounded-xl resize-none focus:outline-none focus:border-purple-500/50 transition-all text-sm leading-relaxed text-gray-300 placeholder:text-gray-600 custom-scrollbar font-mono"
                            />
                            <div className="absolute bottom-4 right-4 text-xs text-gray-600 font-mono">
                                {inputText.length} 字
                            </div>
                        </div>

                        <div className="h-12">
                            {mode === 'analyze' ? (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!inputText.trim() || loading}
                                    className="w-full h-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                    开始分析
                                </button>
                            ) : (
                                <button
                                    onClick={handleRewrite}
                                    disabled={!inputText.trim() || loading}
                                    className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
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
                            <div className="h-full bg-[#18181b] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-600 p-8 text-center">
                                <div className="w-16 h-16 bg-[#27272a] rounded-full flex items-center justify-center mb-6">
                                    {mode === 'analyze' ? <Activity className="w-8 h-8 opacity-50" /> : <Wand2 className="w-8 h-8 opacity-50" />}
                                </div>
                                <h3 className="text-sm font-bold text-gray-400 mb-2">
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
                                <div className="bg-[#18181b] border border-white/10 rounded-xl p-6 relative overflow-hidden">
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="relative">
                                            <svg className="w-24 h-24 transform -rotate-90">
                                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * score.overall) / 100} className={`${getScoreColor(score.overall)} transition-all duration-1000 ease-out`} />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className={`text-2xl font-bold font-mono ${getScoreColor(score.overall)}`}>{score.overall}</span>
                                                <span className="text-[10px] text-gray-500 font-medium">人性化</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-200">文本检测评分</h2>
                                            <p className="text-gray-500 text-xs mt-1">分数越高，越接近人类自然写作风格</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-2 mt-6 relative z-10">
                                        {Object.entries(score.breakdown).map(([key, value]) => (
                                            <div key={key} className="bg-[#27272a] rounded-lg p-2 text-center border border-white/5">
                                                <div className={`text-sm font-bold font-mono mb-1 ${getScoreColor(value)}`}>{value}</div>
                                                <div className="text-[10px] text-gray-500">
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
                                <div className="flex-1 bg-[#18181b] border border-white/10 rounded-xl p-6 overflow-hidden flex flex-col">
                                    <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2 text-sm">
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
                                                    'border-white/10 bg-white/5'
                                                }`}>
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                                                            issue.severity === 'high' ? 'text-red-400' : 
                                                            issue.severity === 'medium' ? 'text-yellow-400' : 'text-gray-400'
                                                        }`} />
                                                        <div>
                                                            <div className="font-bold text-xs text-gray-300 mb-1">{issue.title}</div>
                                                            <div className="text-[10px] text-gray-500 leading-relaxed">{issue.suggestion}</div>
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
                                <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 flex items-center justify-around">
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">改写前</div>
                                        <div className={`text-xl font-bold font-mono ${getScoreColor(result.scoreBefore.overall)}`}>
                                            {result.scoreBefore.overall}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-600" />
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">改写后</div>
                                        <div className={`text-2xl font-bold font-mono ${getScoreColor(result.scoreAfter.overall)}`}>
                                            {result.scoreAfter.overall}
                                        </div>
                                    </div>
                                </div>

                                {/* Output Text */}
                                <div className="flex-1 bg-[#18181b] border border-white/10 rounded-xl relative group overflow-hidden flex flex-col">
                                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyToClipboard(result.rewritten)}
                                            className="p-2 bg-[#27272a] text-white rounded-lg shadow-lg hover:bg-[#3f3f46] border border-white/10 transition-colors"
                                            title="复制结果"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="p-3 border-b border-white/5 bg-[#18181b]/50">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">改写结果</span>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={result.rewritten}
                                        className="flex-1 w-full p-6 bg-transparent outline-none text-gray-300 font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                                    />
                                </div>

                                {/* Changes Log */}
                                {result.changes.length > 0 && (
                                    <div className="h-1/3 bg-[#18181b] border border-white/10 rounded-xl p-4 flex flex-col">
                                        <h3 className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider">主要变更点</h3>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                            {result.changes.map((change, i) => (
                                                <div key={i} className="text-[10px] flex gap-2 pb-2 border-b border-white/5 last:border-0 last:pb-0">
                                                    <span className="text-blue-400 shrink-0 font-medium">[{change.reason}]</span>
                                                    <span className="text-gray-500 truncate">
                                                        <span className="line-through opacity-50 mr-2">{change.original}</span>
                                                        →
                                                        <span className="ml-2 text-gray-300">{change.replacement}</span>
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
