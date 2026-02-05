'use client';

import React from 'react';
import { useGodMode } from '../store/GodModeContext';
import { LAYER_CONFIG, WorldLayer } from '../types';
import { Layers, Eye, EyeOff, Diamond, Users, Map, Flag, Coins, BookOpen, Zap, Scale, Crown, FileText, Clock } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    Map, Gem: Diamond, Users, Flag, Coins, BookOpen, Zap, Scale, Crown, FileText, Clock
};

export function LayerPanel() {
    const { state, dispatch } = useGodMode();

    const handleToggle = (layer: WorldLayer) => {
        dispatch({ type: 'TOGGLE_LAYER', payload: layer });
    };

    const groups = [
        { name: '物质界', layers: ['geo', 'resource', 'race'] as WorldLayer[] },
        { name: '社会界', layers: ['faction', 'economy', 'culture'] as WorldLayer[] },
        { name: '能量界', layers: ['power', 'rule', 'artifact'] as WorldLayer[] },
        { name: '元数据', layers: ['plot', 'timeline'] as WorldLayer[] },
    ];

    return (
        <div className="bg-max-bg/90 backdrop-blur-md border border-max-border rounded-xl p-4 w-64 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 text-gray-200 font-bold border-b border-white/10 pb-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>全息图层 (Holographic)</span>
            </div>

            <div className="space-y-6">
                {groups.map((group) => (
                    <div key={group.name} className="space-y-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">{group.name}</h3>
                        <div className="space-y-1">
                            {group.layers.map(layer => {
                                const config = LAYER_CONFIG[layer];
                                const Icon = ICON_MAP[config.icon] || Map;
                                const isVisible = state.visibleLayers[layer];

                                return (
                                    <button
                                        key={layer}
                                        onClick={() => handleToggle(layer)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all border ${isVisible
                                            ? 'bg-white/5 border-white/10 text-gray-200'
                                            : 'bg-transparent border-transparent text-gray-600 hover:bg-white/5 hover:text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isVisible ? 'opacity-100' : 'opacity-20'}`} style={{ backgroundColor: config.color }}></span>
                                            <div className={`p-1 rounded-md ${isVisible ? 'bg-white/10' : 'bg-transparent'}`}>
                                                <Icon className="w-3.5 h-3.5" style={{ color: isVisible ? config.color : 'currentColor' }} />
                                            </div>
                                            <span>{config.label}</span>
                                        </div>
                                        {isVisible ? <Eye className="w-3 h-3 opacity-60" /> : <EyeOff className="w-3 h-3 opacity-20" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
