'use client';

import React, { useState, useEffect } from 'react';
import { LAYER_CONFIG } from '../types';
import { StorageManager } from '@/lib/storage';
import { Search, Database, Layers, Sparkles, Upload } from 'lucide-react';
import { ImportDialog } from './ImportDialog';
import { ModelConfig } from '@/app/components/ModelConfigPanel';

export function AssetPanel({ modelConfig }: { modelConfig?: ModelConfig }) {
    const [activeTab, setActiveTab] = useState<'basic' | 'cards'>('basic');
    const [cards, setCards] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    // Load cards from storage
    useEffect(() => {
        StorageManager.getJSONAsync('novel_writer_card_library').then(data => {
            if (Array.isArray(data)) {
                setCards(data);
            }
        });
    }, []);

    const handleDragStart = (event: React.DragEvent, nodeType: string, payload: any) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/godmode-payload', JSON.stringify(payload));
        event.dataTransfer.effectAllowed = 'move';
    };

    const filteredCards = cards.filter(c =>
        c.title.includes(search) || c.type.includes(search)
    );

    return (
        <>
            <ImportDialog 
                isOpen={isImportDialogOpen} 
                onClose={() => setIsImportDialogOpen(false)} 
                modelConfig={modelConfig}
            />
            <div className="absolute top-4 left-4 bottom-4 w-64 bg-max-bg/95 backdrop-blur-md border border-max-border rounded-xl shadow-2xl flex flex-col z-20 pointer-events-auto">

                {/* Tabs */}
                <div className="flex border-b border-white/10 relative">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'basic' ? 'text-purple-400 bg-white/5 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Layers className="w-3.5 h-3.5" /> 基础元件
                    </button>
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'cards' ? 'text-purple-400 bg-white/5 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Database className="w-3.5 h-3.5" /> 卡牌库
                    </button>
                    
                    <button 
                        onClick={() => setIsImportDialogOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-purple-400 transition-colors"
                        title="从编辑器导入内容"
                    >
                        <Upload className="w-3.5 h-3.5" />
                    </button>
                </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                {activeTab === 'basic' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-[10px] uppercase text-gray-500 font-bold mb-2 pl-1">常用节点</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(LAYER_CONFIG).map(([key, config]) => (
                                    <div
                                        key={key}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'godNode', { layer: key, name: `新${config.label}` })}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-max-border bg-max-surface hover:border-purple-500/50 hover:bg-[#3f3f46] cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></div>
                                        <span className="text-xs text-gray-300 group-hover:text-white">{config.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cards' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="搜索卡牌..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-black/20 border border-white/10 rounded-md text-xs text-gray-300 outline-none focus:border-purple-500/50"
                            />
                        </div>

                        <div className="space-y-2">
                            {filteredCards.map(card => (
                                <div
                                    key={card.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'godNode', {
                                        name: card.title,
                                        layer: 'culture', // Default fallback, maybe map card type to layer later
                                        desc: card.analysis || card.example || '',
                                        cardIds: [card.id],
                                        // Map card type to layer heuristic could be added here
                                        // e.g. card.type === '人物' -> 'race' or 'faction'
                                    })}
                                    className="bg-max-surface p-2.5 rounded-lg border border-max-border cursor-grab active:cursor-grabbing hover:border-purple-500/50 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-200 line-clamp-1">{card.title}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{card.type}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 line-clamp-2">{card.analysis || card.example || '无描述'}</p>
                                </div>
                            ))}
                            {filteredCards.length === 0 && (
                                <div className="text-center py-8 text-gray-600 text-xs">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    没有找到卡牌
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
        </>
    );
}
