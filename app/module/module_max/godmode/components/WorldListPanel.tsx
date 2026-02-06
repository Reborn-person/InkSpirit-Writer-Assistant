'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Globe, Clock, Layers } from 'lucide-react';
import { useGodMode, WorldInfo } from '../store/GodModeContext';

interface WorldListPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WorldListPanel({ isOpen, onClose }: WorldListPanelProps) {
    const { 
        worldList, 
        currentWorldName, 
        state,
        createWorld, 
        loadWorld, 
        deleteWorld, 
        renameWorld 
    } = useGodMode();
    
    const [isCreating, setIsCreating] = useState(false);
    const [newWorldName, setNewWorldName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleCreate = async () => {
        if (!newWorldName.trim()) return;
        await createWorld(newWorldName.trim());
        setNewWorldName('');
        setIsCreating(false);
    };

    const handleRename = async (worldId: string) => {
        if (!editName.trim()) {
            setEditingId(null);
            return;
        }
        await renameWorld(worldId, editName.trim());
        setEditingId(null);
    };

    const handleDelete = async (worldId: string) => {
        if (confirm('确定要删除这个世界吗？此操作不可恢复。')) {
            await deleteWorld(worldId);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-max-bg border border-max-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-max-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Globe className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-max-text">世界列表</h2>
                            <p className="text-xs text-max-text-muted">
                                当前: {currentWorldName}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-max-surface rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-max-text-muted" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Create New World */}
                    {isCreating ? (
                        <div className="mb-4 p-4 bg-max-surface border border-max-border rounded-lg">
                            <div className="text-sm text-max-text mb-2">创建新世界</div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newWorldName}
                                    onChange={(e) => setNewWorldName(e.target.value)}
                                    placeholder="输入世界名称..."
                                    className="flex-1 px-3 py-2 bg-max-bg border border-max-border rounded-lg text-sm text-max-text placeholder:text-max-text-muted/50 focus:outline-none focus:border-purple-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreate();
                                        if (e.key === 'Escape') {
                                            setIsCreating(false);
                                            setNewWorldName('');
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleCreate}
                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full mb-4 p-3 border-2 border-dashed border-max-border rounded-lg flex items-center justify-center gap-2 text-max-text-muted hover:text-purple-400 hover:border-purple-500/50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">创建新世界</span>
                        </button>
                    )}

                    {/* World List */}
                    <div className="space-y-2">
                        {worldList.length === 0 ? (
                            <div className="text-center py-8 text-max-text-muted">
                                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">还没有创建任何世界</p>
                                <p className="text-xs mt-1">点击上方按钮创建新世界</p>
                            </div>
                        ) : (
                            worldList.map((world) => (
                                <WorldListItem
                                    key={world.id}
                                    world={world}
                                    isActive={world.id === state.currentWorldId}
                                    isEditing={editingId === world.id}
                                    editName={editName}
                                    onEditChange={setEditName}
                                    onStartEdit={() => {
                                        setEditingId(world.id);
                                        setEditName(world.name);
                                    }}
                                    onSaveEdit={() => handleRename(world.id)}
                                    onCancelEdit={() => setEditingId(null)}
                                    onLoad={() => {
                                        loadWorld(world.id);
                                        onClose();
                                    }}
                                    onDelete={() => handleDelete(world.id)}
                                    formatDate={formatDate}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-max-border bg-max-surface">
                    <div className="text-xs text-max-text-muted text-center">
                        共 {worldList.length} 个世界
                    </div>
                </div>
            </div>
        </div>
    );
}

interface WorldListItemProps {
    world: WorldInfo;
    isActive: boolean;
    isEditing: boolean;
    editName: string;
    onEditChange: (name: string) => void;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onLoad: () => void;
    onDelete: () => void;
    formatDate: (timestamp: number) => string;
}

function WorldListItem({
    world,
    isActive,
    isEditing,
    editName,
    onEditChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onLoad,
    onDelete,
    formatDate
}: WorldListItemProps) {
    if (isEditing) {
        return (
            <div className="p-3 bg-max-surface border border-purple-500/50 rounded-lg">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => onEditChange(e.target.value)}
                        className="flex-1 px-2 py-1 bg-max-bg border border-max-border rounded text-sm text-max-text focus:outline-none focus:border-purple-500"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveEdit();
                            if (e.key === 'Escape') onCancelEdit();
                        }}
                    />
                    <button
                        onClick={onSaveEdit}
                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`group p-3 border rounded-lg transition-all cursor-pointer ${
                isActive
                    ? 'bg-purple-500/10 border-purple-500/50'
                    : 'bg-max-surface border-max-border hover:border-purple-500/30'
            }`}
            onClick={onLoad}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={`font-medium truncate ${isActive ? 'text-purple-400' : 'text-max-text'}`}>
                            {world.name}
                        </h3>
                        {isActive && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
                                当前
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-max-text-muted">
                        <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {world.nodeCount} 节点
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(world.updatedAt)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit();
                        }}
                        className="p-1.5 text-max-text-muted hover:text-max-text hover:bg-max-bg rounded transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1.5 text-max-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
