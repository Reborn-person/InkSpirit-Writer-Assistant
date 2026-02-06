'use client';

import React, { useEffect } from 'react';
import { GodModeProvider, useGodMode } from './store/GodModeContext';
import { GodCanvas } from './components/GodCanvas';
import { WorldListPanel } from './components/WorldListPanel';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { Settings, Share2, Save, RotateCcw, Check, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';
import { useState } from 'react';

// --- Main Layout ---
function GodModePageContent() {
    const pathname = usePathname();
    const { isAiOpen } = useEditorAgent();
    const { state, dispatch, saveWorld, currentWorldName } = useGodMode();
    const [isWorldListOpen, setIsWorldListOpen] = useState(false);

    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        provider: 'siliconflow',
        model: 'deepseek-ai/DeepSeek-V3',
        apiKey: '',
        baseUrl: 'https://api.siliconflow.cn/v1'
    });

    const isMaxHome = pathname === '/module/module_max';
    const isMaxIdea = pathname === '/module/module_max/idea';
    const isMaxDismantle = pathname === '/module/module_max/dismantle';
    const isMaxOutline = pathname === '/module/module_max/outline';
    const isMaxCreation = pathname === '/module/module_max/creation';
    const isMaxPolish = pathname === '/module/module_max/polish';
    const isMaxConsistency = pathname === '/module/module_max/consistency';
    const isMaxHumanizer = pathname === '/module/module_max/humanizer';
    const isMaxGodMode = pathname === '/module/module_max/godmode';

    const handleReset = () => {
        if (confirm('确定要重置世界吗？所有未保存的更改将丢失。')) {
            dispatch({ type: 'RESET_WORLD' });
        }
    };

    const handleSave = async () => {
        await saveWorld();
    };

    // useEffect(() => {
    //     // Force enable Max Mode styles globally
    //     document.body.classList.add('max-mode');
    //     return () => {
    //         document.body.classList.remove('max-mode');
    //     };
    // }, []);

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
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <button
                        onClick={() => setIsWorldListOpen(true)}
                        className="flex items-center gap-2 text-sm font-bold text-max-text hover:text-purple-400 transition-colors"
                        title="打开世界列表"
                    >
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                        <span className="max-w-[150px] truncate">{currentWorldName}</span>
                        <Globe className="w-3.5 h-3.5 text-max-text-muted" />
                    </button>
                    <div className="ml-4">
                        <ModelConfigPanel moduleKey="godmode" onConfigChange={setModelConfig} />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Auto-save Indicator */}
                    {state.lastSaved && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-[10px] text-green-400">
                            <Check className="w-3 h-3" />
                            已保存 {new Date(state.lastSaved).toLocaleTimeString()}
                        </div>
                    )}
                    
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-max-text-muted hover:text-max-text hover:bg-max-surface-alt rounded-lg transition-colors border border-transparent hover:border-max-border"
                        title="重置为初始演示数据"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        重置
                    </button>

                    <div className="h-4 w-[1px] bg-white/10"></div>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-3 py-1.5 bg-max-accent text-white text-xs rounded-lg transition-all shadow-lg shadow-max-accent/20 hover:opacity-90"
                    >
                        <Save className="w-3.5 h-3.5" />
                        保存世界
                    </button>

                    <button className="p-2 text-max-text-muted hover:text-max-text hover:bg-max-surface-alt rounded-lg transition-colors">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-max-text-muted hover:text-max-text hover:bg-max-surface-alt rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden">
                <GodCanvas modelConfig={modelConfig} />
            </div>

            {/* World List Panel */}
            <WorldListPanel 
                isOpen={isWorldListOpen} 
                onClose={() => setIsWorldListOpen(false)} 
            />
        </div>
    );
}

export default function GodModePage() {
    return (
        <GodModeProvider>
            <GodModePageContent />
        </GodModeProvider>
    );
}
