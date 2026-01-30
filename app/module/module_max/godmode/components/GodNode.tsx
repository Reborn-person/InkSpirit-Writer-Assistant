'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';
import { GodNodeData, LAYER_CONFIG } from '../types';
import { Layers, Map, Diamond, Users, Flag, Coins, BookOpen, Zap, Scale, Crown, FileText, ChevronRight, Trash2, Sparkles, Clock } from 'lucide-react';
import { useGodMode } from '../store/GodModeContext';

const ICON_MAP: Record<string, React.ElementType> = {
    Map, Gem: Diamond, Users, Flag, Coins, BookOpen, Zap, Scale, Crown, FileText, Clock
};

const GodNode = ({ id, data, selected }: NodeProps<GodNodeData>) => {
    const { dispatch } = useGodMode();
    const config = LAYER_CONFIG[data.layer];
    const Icon = ICON_MAP[config?.icon] || Map;
    const color = config?.color || '#888';

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'DELETE_NODE', payload: id });
    };

    const handleAIExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Dispatch custom event to trigger AI dialog
        window.dispatchEvent(new CustomEvent('godmode:ai-expand', {
            detail: { nodeId: id }
        }));
    };

    return (
        <div
            className={`relative group rounded-xl bg-[#18181b] border-2 transition-all duration-300 min-w-[120px] shadow-lg
        ${selected ? 'scale-105 z-50' : 'hover:scale-105 hover:z-40'}
      `}
            style={{
                borderColor: selected ? color : `${color}40`,
                boxShadow: selected ? `0 0 20px ${color}40` : 'none'
            }}
        >
            <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
                <button
                    onClick={handleAIExpand}
                    className="p-1.5 bg-purple-500/80 hover:bg-purple-500 text-white rounded-lg shadow-lg backdrop-blur flex items-center justify-center transition-all hover:scale-110"
                    title="AI 扩展"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg shadow-lg backdrop-blur flex items-center justify-center transition-all hover:scale-110"
                    title="删除节点"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </NodeToolbar>

            {/* Handles */}
            <Handle type="target" position={Position.Top} className="!bg-white/20 !w-3 !h-1 !rounded-full !border-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Bottom} className="!bg-white/20 !w-3 !h-1 !rounded-full !border-0 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Header / Icon */}
            <div
                className="px-3 py-2 rounded-t-lg flex items-center gap-2 border-b border-white/5"
                style={{
                    background: `linear-gradient(to right, ${color}10, transparent)`
                }}
            >
                <div
                    className="p-1 rounded-md shadow-inner"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color }}>
                    {config?.label}
                </span>
            </div>

            {/* Body */}
            <div className="px-3 py-3">
                <div className="font-bold text-gray-100 text-sm mb-1 line-clamp-1">{data.name}</div>
                {data.desc && (
                    <div className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                        {data.desc}
                    </div>
                )}
            </div>

            {/* Footer / Fractal Indicator */}
            {data.hasChildWorld && (
                <div className="px-3 py-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-500 bg-black/20 rounded-b-lg">
                    <span className="flex items-center gap-1 group-hover:text-purple-400 transition-colors">
                        <Layers className="w-3 h-3" />
                        包含子世界
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                </div>
            )}
        </div>
    );
};

export default memo(GodNode);
