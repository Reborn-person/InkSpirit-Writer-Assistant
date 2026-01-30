'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGodMode } from '../store/GodModeContext';
import { Node } from 'reactflow';
import { GodNodeData, LAYER_CONFIG } from '../types';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

interface AIGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'expand' | 'infer';
    targetNode?: Node<GodNodeData>;
    selectedNodes?: Node<GodNodeData>[];
}

export function AIGenerationDialog({ isOpen, onClose, mode, targetNode, selectedNodes }: AIGenerationDialogProps) {
    const { state, dispatch } = useGodMode();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState<any>(null);

    if (!isOpen) return null;

    // ...

    const handleGenerate = async () => {
        setStatus('loading');
        setErrorMsg('');

        try {
            // Validate and get config
            const provider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
            const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
            let apiKey = storedKeys[provider] || StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';

            // Fallback for API Key
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

            if (!apiKey) {
                throw new Error(`请先在设置中配置 ${provider} 的 API Key`);
            }

            const baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
            const model = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || 'deepseek-ai/DeepSeek-V3';

            const body: any = {
                type: mode === 'expand' ? 'expand_region' : 'infer_plot',
                worldContext: '玄幻修仙世界，斗气大陆背景',
                apiKey,
                baseUrl,
                model
            };

            if (mode === 'expand' && targetNode) {
                body.nodeData = {
                    name: targetNode.data.name,
                    layer: targetNode.data.layer,
                    desc: targetNode.data.desc
                };
            } else if (mode === 'infer' && selectedNodes) {
                body.connectedNodes = selectedNodes.map(n => ({
                    name: n.data.name,
                    layer: n.data.layer,
                    desc: n.data.desc
                }));
            }

            const res = await fetch('/api/godmode/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'AI 生成失败');
            }

            const { data, usage } = await res.json();

            // 记录Token使用
            if (usage) {
                await StorageManager.addTokenUsage(
                    provider,
                    model,
                    usage.prompt_tokens,
                    usage.completion_tokens
                );
            }

            setResult(data);
            setStatus('success');

        } catch (error: any) {
            setStatus('error');
            setErrorMsg(error.message);
        }
    };

    const handleApply = () => {
        if (!result) return;

        if (mode === 'expand' && targetNode) {
            // 更新节点描述
            const updatedNodes = state.nodes.map(n =>
                n.id === targetNode.id
                    ? { ...n, data: { ...n.data, desc: result.description, hasChildWorld: true } }
                    : n
            );
            dispatch({ type: 'SET_NODES', payload: updatedNodes });

            // 创建子节点
            const baseX = targetNode.position.x;
            const baseY = targetNode.position.y + 200;
            const spacing = 180;

            result.childNodes?.forEach((child: any, index: number) => {
                const newNode: Node<GodNodeData> = {
                    id: crypto.randomUUID(),
                    type: 'godNode',
                    position: {
                        x: baseX + (index - Math.floor(result.childNodes.length / 2)) * spacing,
                        y: baseY
                    },
                    data: {
                        name: child.name,
                        layer: child.layer,
                        desc: child.desc,
                        hasChildWorld: false,
                        worldPosition: {
                            x: 0,
                            y: 0,
                            z: state.currentLevel + 1,
                            parentId: targetNode.id
                        }
                    }
                };
                dispatch({ type: 'ADD_NODE', payload: newNode });
            });
        } else if (mode === 'infer' && result.events) {
            // 创建剧情事件节点
            const centerX = 400;
            const centerY = 300;

            result.events.forEach((event: any, index: number) => {
                const newNode: Node<GodNodeData> = {
                    id: crypto.randomUUID(),
                    type: 'godNode',
                    position: {
                        x: centerX + index * 200,
                        y: centerY
                    },
                    data: {
                        name: event.name,
                        layer: 'plot',
                        desc: event.desc,
                        hasChildWorld: false,
                        worldPosition: {
                            x: 0,
                            y: 0,
                            z: state.currentLevel,
                            parentId: state.currentParentId
                        }
                    }
                };
                dispatch({ type: 'ADD_NODE', payload: newNode });
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {mode === 'expand' ? 'AI 区域扩展' : 'AI 剧情推演'}
                            </h2>
                            <p className="text-xs text-gray-500">
                                {mode === 'expand'
                                    ? `为 "${targetNode?.data.name}" 生成详细设定`
                                    : '基于选中节点生成剧情事件'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {status === 'idle' && (
                        <div className="text-center py-12">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
                            <p className="text-gray-400 mb-6">准备好让 AI 为你的世界注入灵魂了吗？</p>
                            <button
                                onClick={handleGenerate}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all font-bold"
                            >
                                开始生成
                            </button>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-400 animate-spin" />
                            <p className="text-gray-300 font-medium mb-2">AI 正在构思中...</p>
                            <p className="text-xs text-gray-500">这可能需要几秒钟</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-12">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <p className="text-red-400 font-medium mb-2">生成失败</p>
                            <p className="text-xs text-gray-500 mb-6">{errorMsg}</p>
                            <button
                                onClick={handleGenerate}
                                className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                            >
                                重试
                            </button>
                        </div>
                    )}

                    {status === 'success' && result && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-400 mb-4">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">生成成功！</span>
                            </div>

                            {mode === 'expand' && (
                                <>
                                    <div className="bg-[#27272a] border border-white/5 rounded-lg p-4">
                                        <h3 className="text-sm font-bold text-gray-300 mb-2">详细描述</h3>
                                        <p className="text-xs text-gray-400 leading-relaxed">{result.description}</p>
                                    </div>

                                    {result.childNodes && result.childNodes.length > 0 && (
                                        <div className="bg-[#27272a] border border-white/5 rounded-lg p-4">
                                            <h3 className="text-sm font-bold text-gray-300 mb-3">子节点 ({result.childNodes.length})</h3>
                                            <div className="space-y-2">
                                                {result.childNodes.map((child: any, i: number) => (
                                                    <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: LAYER_CONFIG[child.layer as keyof typeof LAYER_CONFIG]?.color || '#888' }}
                                                            />
                                                            <span className="text-sm font-bold text-white">{child.name}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                {LAYER_CONFIG[child.layer as keyof typeof LAYER_CONFIG]?.label || child.layer}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 pl-4">{child.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {mode === 'infer' && result.events && (
                                <div className="bg-[#27272a] border border-white/5 rounded-lg p-4">
                                    <h3 className="text-sm font-bold text-gray-300 mb-3">剧情事件 ({result.events.length})</h3>
                                    <div className="space-y-3">
                                        {result.events.map((event: any, i: number) => (
                                            <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                                <h4 className="text-sm font-bold text-white mb-2">{event.name}</h4>
                                                <p className="text-xs text-gray-400 mb-2">{event.desc}</p>
                                                {event.connections && event.connections.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {event.connections.map((conn: string, j: number) => (
                                                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                → {conn}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {status === 'success' && (
                    <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all font-bold text-sm"
                        >
                            应用到画布
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
