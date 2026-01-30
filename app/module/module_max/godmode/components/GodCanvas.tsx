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
import { ChevronRight, Home } from 'lucide-react';
import { GodNodeData } from '../types';

const nodeTypes = {
    godNode: GodNode,
};

function GodCanvasInner() {
    const { state, dispatch, getVisibleNodes } = useGodMode();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { project } = useReactFlow();

    // AI Dialog State
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiDialogMode, setAiDialogMode] = useState<'expand' | 'infer'>('expand');
    const [targetNode, setTargetNode] = useState<Node<GodNodeData> | undefined>();

    const nodes = getVisibleNodes();
    const edges = state.edges;

    // Listen for AI expand events from nodes
    useEffect(() => {
        const handleAIExpand = (e: CustomEvent) => {
            const nodeId = e.detail.nodeId;
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                setTargetNode(node as Node<GodNodeData>);
                setAiDialogMode('expand');
                setAiDialogOpen(true);
            }
        };

        window.addEventListener('godmode:ai-expand', handleAIExpand as EventListener);
        return () => window.removeEventListener('godmode:ai-expand', handleAIExpand as EventListener);
    }, [state.nodes]);

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

    return (
        <div className="w-full h-full bg-[#09090b] relative flex" ref={reactFlowWrapper}>
            {/* Asset Panel (Left Sidebar) */}
            <AssetPanel />

            {/* Breadcrumb Navigation Overlay */}
            <div className="absolute top-4 left-72 z-10 flex items-center gap-2 bg-[#18181b]/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full shadow-lg pointer-events-auto">
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
                    onNodeDoubleClick={onNodeDoubleClick}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    nodeTypes={nodeTypes}
                    nodesDraggable={true}
                    nodesConnectable={true}
                    elementsSelectable={true}
                    fitView
                    className="bg-[#09090b]"
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#a855f7', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
                    }}
                >
                    <Background color="#333" gap={20} />
                    <Controls className="bg-[#18181b] border border-white/10 fill-white text-white" />
                    <MiniMap
                        nodeColor={() => '#3b82f6'}
                        className="bg-[#18181b] border border-white/10 rounded-lg overflow-hidden"
                        maskColor="rgba(0,0,0, 0.6)"
                    />

                    {/* Layer Control Panel */}
                    <Panel position="top-right">
                        <LayerPanel />
                    </Panel>
                </ReactFlow>
            </div>

            {/* AI Generation Dialog */}
            <AIGenerationDialog
                isOpen={aiDialogOpen}
                onClose={() => setAiDialogOpen(false)}
                mode={aiDialogMode}
                targetNode={targetNode}
            />
        </div>
    );
}

export function GodCanvas() {
    return (
        <ReactFlowProvider>
            <GodCanvasInner />
        </ReactFlowProvider>
    );
}
