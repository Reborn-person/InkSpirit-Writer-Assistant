'use client';

import React from 'react';
import { GodModeProvider, useGodMode } from './store/GodModeContext';
import { GodCanvas } from './components/GodCanvas';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { Settings, Share2, Save, RotateCcw, Check, Shield } from 'lucide-react';
import Link from 'next/link';

// --- Main Layout ---
function GodModePageContent() {
    const { isAiOpen } = useEditorAgent();
    const { state, dispatch, saveWorld } = useGodMode();

    const handleReset = () => {
        if (confirm('确定要重置世界吗？所有未保存的更改将丢失。')) {
            dispatch({ type: 'RESET_WORLD' });
        }
    };

    const handleSave = async () => {
        await saveWorld();
    };

    return (
        <div className={`transition-all duration-300 h-screen flex flex-col bg-[#18181b] overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>

            {/* Header / Toolbar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#18181b] z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                        上帝模式 (God Mode)
                    </h1>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <span className="text-xs text-gray-500">全息世界构建系统 v3.0</span>

                    {/* Auto-save Indicator */}
                    {state.lastSaved && (
                        <div className="flex items-center gap-1.5 ml-4 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-[10px] text-green-400">
                            <Check className="w-3 h-3" />
                            已保存 {new Date(state.lastSaved).toLocaleTimeString()}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                        title="重置为初始演示数据"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        重置
                    </button>

                    <div className="h-4 w-[1px] bg-white/10"></div>

                    <Link
                        href="/module/module_max/consistency"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                        title="一致性检查"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        一致性检查
                    </Link>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Save className="w-3.5 h-3.5" />
                        保存
                    </button>

                    <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden">
                <GodCanvas />
            </div>
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
