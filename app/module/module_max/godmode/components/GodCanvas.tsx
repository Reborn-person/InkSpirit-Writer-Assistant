'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    EdgeChange,
    NodeChange,
    Connection,
    addEdge,
    Panel,
    ReactFlowProvider,
    useReactFlow,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGodMode } from '../store/GodModeContext';
import GodNode from './GodNode';
import { LayerPanel } from './LayerPanel';
import { AssetPanel } from './AssetPanel';
import { AIGenerationDialog } from './AIGenerationDialog';
import { TimelineControl } from './TimelineControl';
import { ChevronRight, Home, X } from 'lucide-react';
import { GodNodeData, LAYER_CONFIG, WorldLayer } from '../types';
import { ModelConfig } from '@/app/components/ModelConfigPanel';

const nodeTypes = {
    godNode: GodNode,
};

function GodCanvasInner({ modelConfig }: { modelConfig?: ModelConfig }) {
    const { state, dispatch, visibleNodes } = useGodMode();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { project } = useReactFlow();

    // AI Dialog State
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiDialogMode, setAiDialogMode] = useState<'expand' | 'infer'>('expand');
    const [targetNode, setTargetNode] = useState<Node<GodNodeData> | undefined>();
    const [nodeEditorOpen, setNodeEditorOpen] = useState(false);

    const nodes = visibleNodes;
    const edges = state.edges;
    const selectedNode = state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) : undefined;

    // Use a ref to store nodes for the event listener to avoid re-attaching
    const nodesRef = useRef(state.nodes);
    useEffect(() => {
        nodesRef.current = state.nodes;
    }, [state.nodes]);

    // Listen for AI expand events from nodes
    useEffect(() => {
        const handleAIExpand = (e: CustomEvent) => {
            const nodeId = e.detail.nodeId;
            // Use the ref to find the node, avoiding O(N) find in dependency array re-runs
            const node = nodesRef.current.find(n => n.id === nodeId);
            if (node) {
                setTargetNode(node as Node<GodNodeData>);
                setAiDialogMode('expand');
                setAiDialogOpen(true);
            }
        };

        window.addEventListener('godmode:ai-expand', handleAIExpand as EventListener);
        return () => window.removeEventListener('godmode:ai-expand', handleAIExpand as EventListener);
    }, []); // Run only once on mount

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => dispatch({ type: 'NODES_CHANGE', payload: changes }),
        [dispatch]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => dispatch({ type: 'EDGES_CHANGE', payload: changes }),
        [dispatch]
    );

    const onConnect = useCallback(
        (params: Connection) => dispatch({ type: 'SET_EDGES', payload: addEdge(params, state.edges) }),
        [dispatch, state.edges]
    );

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            dispatch({ type: 'SELECT_NODE', payload: node.id });
            setNodeEditorOpen(true);
        },
        [dispatch]
    );

    const onPaneClick = useCallback(() => {
        dispatch({ type: 'SELECT_NODE', payload: null });
        setNodeEditorOpen(false);
    }, [dispatch]);

    // Navigation Handlers
    const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
        dispatch({
            type: 'NAVIGATE_DOWN',
            payload: { id: node.id, name: node.data.name }
        });
    }, [dispatch]);

    const navigateHistory = (index: number) => {
        dispatch({ type: 'NAVIGATE_UP', payload: index });
    };

    // Drag & Drop Handlers
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            const payloadStr = event.dataTransfer.getData('application/godmode-payload');

            if (typeof type === 'undefined' || !type || !payloadStr) {
                return;
            }

            const payload = JSON.parse(payloadStr);

            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!reactFlowBounds) return;

            const position = project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode: Node<GodNodeData> = {
                id: crypto.randomUUID(),
                type,
                position,
                data: {
                    ...payload,
                    hasChildWorld: false,
                    worldPosition: {
                        x: position.x,
                        y: position.y,
                        z: state.currentLevel,
                        parentId: state.currentParentId
                    }
                },
            };

            dispatch({ type: 'ADD_NODE', payload: newNode });
        },
        [project, state.currentLevel, state.currentParentId, dispatch]
    );

    const updateSelectedNode = useCallback(
        (updater: (data: GodNodeData) => GodNodeData) => {
            if (!state.selectedNodeId) return;
            const updatedNodes = state.nodes.map((n) => {
                if (n.id !== state.selectedNodeId) return n;
                return { ...n, data: updater(n.data) };
            });
            dispatch({ type: 'SET_NODES', payload: updatedNodes });
        },
        [dispatch, state.nodes, state.selectedNodeId]
    );

    const closeNodeEditor = useCallback(() => {
        setNodeEditorOpen(false);
        dispatch({ type: 'SELECT_NODE', payload: null });
    }, [dispatch]);

    return (
        <div className="w-full h-full bg-max-surface-alt relative flex" ref={reactFlowWrapper}>
            {/* Asset Panel (Left Sidebar) */}
            <AssetPanel modelConfig={modelConfig} />

            {/* Breadcrumb Navigation Overlay */}
            <div className="absolute top-4 left-72 z-10 flex items-center gap-2 bg-max-bg/80 backdrop-blur border border-max-border px-4 py-2 rounded-full shadow-lg pointer-events-auto">
                {state.history.map((step, index) => (
                    <div key={`${step.level}-${step.parentId || 'root'}`} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight className="w-3 h-3 text-gray-600" />}
                        <button
                            onClick={() => navigateHistory(index)}
                            className={`text-xs font-medium hover:text-purple-400 transition-colors flex items-center gap-1 ${index === state.history.length - 1 ? 'text-white' : 'text-gray-400'
                                }`}
                        >
                            {index === 0 && <Home className="w-3 h-3 mb-0.5" />}
                            {step.name}
                        </button>
                    </div>
                ))}
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 h-full w-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    nodeTypes={nodeTypes}
                    nodesDraggable={true}
                    nodesConnectable={true}
                    elementsSelectable={true}
                    fitView
                    className="bg-max-surface-alt"
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#a855f7', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
                    }}
                >
                    <Background color="#555" gap={24} size={1} />
                    <Controls className="bg-max-bg border border-max-border fill-white text-white" />
                    <MiniMap
                        nodeColor={() => '#3b82f6'}
                        className="bg-max-bg border border-max-border rounded-lg overflow-hidden"
                        maskColor="rgba(0,0,0, 0.6)"
                    />

                    {/* Layer Control Panel */}
                    <Panel position="top-right">
                        <LayerPanel />
                    </Panel>
                </ReactFlow>
            </div>

            {nodeEditorOpen && selectedNode ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <button type="button" className="absolute inset-0" onClick={closeNodeEditor} aria-label="关闭节点编辑" />
                    <div className="relative w-full max-w-2xl max-h-[80vh] bg-max-bg border border-max-border rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-white">节点编辑</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {LAYER_CONFIG[selectedNode.data.layer].label} · {selectedNode.data.name}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeNodeEditor}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                aria-label="关闭"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase text-gray-500 font-bold">名称</div>
                                <input
                                    value={selectedNode.data.name}
                                    onChange={(e) => updateSelectedNode((data) => ({ ...data, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-xs text-gray-200 outline-none focus:border-purple-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-[10px] uppercase text-gray-500 font-bold">图层</div>
                                <select
                                    value={selectedNode.data.layer}
                                    onChange={(e) => updateSelectedNode((data) => ({ ...data, layer: e.target.value as WorldLayer }))}
                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-xs text-gray-200 outline-none focus:border-purple-500/50"
                                >
                                    {Object.entries(LAYER_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>
                                            {cfg.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="text-[10px] uppercase text-gray-500 font-bold">描述</div>
                                <textarea
                                    value={selectedNode.data.desc ?? ''}
                                    onChange={(e) => updateSelectedNode((data) => ({ ...data, desc: e.target.value || undefined }))}
                                    rows={8}
                                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-xs text-gray-200 outline-none focus:border-purple-500/50 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold">起始章节</div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={selectedNode.data.startChapter ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                                            updateSelectedNode((data) => ({ ...data, startChapter: typeof val === 'number' && !Number.isNaN(val) ? val : undefined }));
                                        }}
                                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-xs text-gray-200 outline-none focus:border-purple-500/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold">结束章节</div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={selectedNode.data.endChapter ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                                            updateSelectedNode((data) => ({ ...data, endChapter: typeof val === 'number' && !Number.isNaN(val) ? val : undefined }));
                                        }}
                                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-xs text-gray-200 outline-none focus:border-purple-500/50"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-gray-300 select-none">
                                <input
                                    type="checkbox"
                                    checked={!!selectedNode.data.hasChildWorld}
                                    onChange={(e) => updateSelectedNode((data) => ({ ...data, hasChildWorld: e.target.checked }))}
                                    className="accent-purple-500"
                                />
                                包含子世界
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                            <button
                                type="button"
                                onClick={closeNodeEditor}
                                className="px-5 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* AI Generation Dialog */}
            <AIGenerationDialog
                isOpen={aiDialogOpen}
                onClose={() => setAiDialogOpen(false)}
                mode={aiDialogMode}
                targetNode={targetNode}
                modelConfig={modelConfig}
            />

            {/* Timeline Control */}
            <TimelineControl />
        </div>
    );
}

export function GodCanvas({ modelConfig }: { modelConfig?: ModelConfig }) {
    return (
        <ReactFlowProvider>
            <GodCanvasInner modelConfig={modelConfig} />
        </ReactFlowProvider>
    );
}
