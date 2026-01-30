'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { WorldLayer, GodNode, GodLink, LayerVisibility, LAYER_CONFIG, Coordinates, GodNodeData } from '../types';
import { StorageManager } from '@/lib/storage';

// --- Demo Data Constant ---
const DEMO_NODES: Node<GodNodeData>[] = [
    {
        id: 'n1',
        type: 'godNode',
        position: { x: 400, y: 300 },
        data: {
            name: '斗气大陆',
            layer: 'geo',
            hasChildWorld: true,
            desc: '主故事发生的大陆，以斗气为主流修炼体系。',
            worldPosition: { x: 400, y: 300, z: 0, parentId: null }
        }
    },
    {
        id: 'n2',
        type: 'godNode',
        position: { x: 800, y: 200 },
        data: {
            name: '中州',
            layer: 'geo',
            hasChildWorld: true,
            desc: '大陆中心，强者云集之地。',
            worldPosition: { x: 800, y: 200, z: 0, parentId: null }
        }
    },
    {
        id: 'n3',
        type: 'godNode',
        position: { x: 600, y: 500 },
        data: {
            name: '魂殿',
            layer: 'faction',
            desc: '大陆第一阴暗势力，在此处设有分殿。',
            worldPosition: { x: 600, y: 500, z: 0, parentId: null }
        }
    },
    {
        id: 'n1-1',
        type: 'godNode',
        position: { x: 100, y: 100 },
        data: {
            name: '加玛帝国',
            layer: 'geo',
            hasChildWorld: true,
            desc: '偏僻帝国，主角出生地。',
            worldPosition: { x: 100, y: 100, z: 1, parentId: 'n1' }
        }
    },
    {
        id: 'n1-2',
        type: 'godNode',
        position: { x: 400, y: 100 },
        data: {
            name: '魔兽山脉',
            layer: 'resource',
            desc: '魔兽聚集，盛产药材。',
            worldPosition: { x: 400, y: 100, z: 1, parentId: 'n1' }
        }
    },
    {
        id: 'n1-3',
        type: 'godNode',
        position: { x: 250, y: 300 },
        data: {
            name: '云岚宗',
            layer: 'faction',
            desc: '加玛帝国最强宗门。',
            worldPosition: { x: 250, y: 300, z: 1, parentId: 'n1' }
        }
    },
    {
        id: 'n1-1-1',
        type: 'godNode',
        position: { x: 200, y: 200 },
        data: {
            name: '乌坦城',
            layer: 'geo',
            hasChildWorld: true,
            desc: '三大家族所在的城市。',
            worldPosition: { x: 200, y: 200, z: 2, parentId: 'n1-1' }
        }
    }
];

// --- State Definition ---

interface GodModeState {
    nodes: Node<GodNodeData>[];
    edges: Edge[];

    // Navigation
    currentLevel: number;
    currentParentId: string | null;
    history: { level: number; parentId: string | null; name: string }[];

    // Visibility
    visibleLayers: LayerVisibility;

    // UI
    selectedNodeId: string | null;
    isSidebarOpen: boolean;

    // Meta
    hasLoaded: boolean;
    lastSaved: number | null;
}

// --- Action Definition ---

type Action =
    | { type: 'SET_NODES'; payload: Node[] }
    | { type: 'SET_EDGES'; payload: Edge[] }
    | { type: 'NODES_CHANGE'; payload: NodeChange[] }
    | { type: 'EDGES_CHANGE'; payload: EdgeChange[] }
    | { type: 'TOGGLE_LAYER'; payload: WorldLayer }
    | { type: 'SET_LAYER_VISIBILITY'; payload: { layer: WorldLayer; visible: boolean } }
    | { type: 'NAVIGATE_DOWN'; payload: { id: string; name: string } }
    | { type: 'NAVIGATE_UP'; payload: number }
    | { type: 'SELECT_NODE'; payload: string | null }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'LOAD_STATE'; payload: Partial<GodModeState> }
    | { type: 'ADD_NODE'; payload: Node<GodNodeData> }
    | { type: 'DELETE_NODE'; payload: string }
    | { type: 'RESET_WORLD' }
    | { type: 'SET_LAST_SAVED'; payload: number };

// --- Initial State ---

const INITIAL_LAYERS: LayerVisibility = {
    geo: true,
    resource: false,
    race: false,
    faction: true,
    economy: false,
    culture: false,
    power: false,
    rule: false,
    artifact: false,
    plot: true,
    timeline: true
};

const INITIAL_STATE: GodModeState = {
    nodes: [],
    edges: [],
    currentLevel: 0,
    currentParentId: null,
    history: [{ level: 0, parentId: null, name: '世界全景' }],
    visibleLayers: INITIAL_LAYERS,
    selectedNodeId: null,
    isSidebarOpen: true,
    hasLoaded: false,
    lastSaved: null
};

// --- Reducer ---

function godModeReducer(state: GodModeState, action: Action): GodModeState {
    switch (action.type) {
        case 'SET_NODES':
            return { ...state, nodes: action.payload };
        case 'SET_EDGES':
            return { ...state, edges: action.payload };
        case 'NODES_CHANGE':
            return { ...state, nodes: applyNodeChanges(action.payload, state.nodes) };
        case 'EDGES_CHANGE':
            return { ...state, edges: applyEdgeChanges(action.payload, state.edges) };
        case 'ADD_NODE':
            return { ...state, nodes: state.nodes.concat(action.payload) };
        case 'DELETE_NODE':
            return {
                ...state,
                nodes: state.nodes.filter(n => n.id !== action.payload),
                edges: state.edges.filter(e => e.source !== action.payload && e.target !== action.payload)
            };
        case 'TOGGLE_LAYER':
            return {
                ...state,
                visibleLayers: {
                    ...state.visibleLayers,
                    [action.payload]: !state.visibleLayers[action.payload]
                }
            };
        case 'SET_LAYER_VISIBILITY':
            return {
                ...state,
                visibleLayers: {
                    ...state.visibleLayers,
                    [action.payload.layer]: action.payload.visible
                }
            };
        case 'NAVIGATE_DOWN':
            return {
                ...state,
                currentParentId: action.payload.id,
                currentLevel: state.currentLevel + 1,
                history: [...state.history, { level: state.currentLevel + 1, parentId: action.payload.id, name: action.payload.name }],
                selectedNodeId: null
            };
        case 'NAVIGATE_UP': {
            const targetHistoryIndex = action.payload;
            if (targetHistoryIndex < 0 || targetHistoryIndex >= state.history.length) return state;
            const targetStep = state.history[targetHistoryIndex];
            return {
                ...state,
                currentParentId: targetStep.parentId,
                currentLevel: targetStep.level,
                history: state.history.slice(0, targetHistoryIndex + 1),
                selectedNodeId: null
            };
        }
        case 'SELECT_NODE':
            return { ...state, selectedNodeId: action.payload };
        case 'TOGGLE_SIDEBAR':
            return { ...state, isSidebarOpen: !state.isSidebarOpen };
        case 'LOAD_STATE':
            return { ...state, ...action.payload, hasLoaded: true };
        case 'RESET_WORLD':
            return { ...INITIAL_STATE, nodes: DEMO_NODES, hasLoaded: true };
        case 'SET_LAST_SAVED':
            return { ...state, lastSaved: action.payload };
        default:
            return state;
    }
}

// --- Context ---

interface GodModeContextType {
    state: GodModeState;
    dispatch: React.Dispatch<Action>;
    getVisibleNodes: () => Node[];
    saveWorld: () => Promise<void>;
}

const GodModeContext = createContext<GodModeContextType | null>(null);

// --- Provider ---

const STORAGE_KEY = 'godmode_active_world';

export function GodModeProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(godModeReducer, INITIAL_STATE);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Load on Mount
    useEffect(() => {
        const load = async () => {
            try {
                const savedData = await StorageManager.getJSONAsync(STORAGE_KEY);
                if (savedData && typeof savedData === 'object' && Array.isArray(savedData.nodes)) {
                    dispatch({
                        type: 'LOAD_STATE',
                        payload: {
                            nodes: savedData.nodes,
                            edges: savedData.edges || [],
                            // Optional: load history/level if we want to restore exact view
                            // For now we reset view to root to avoid confusion if IDs changed or complex path
                            currentLevel: 0,
                            currentParentId: null,
                            history: [{ level: 0, parentId: null, name: '世界全景' }]
                        }
                    });
                } else {
                    // Initialize with Demo Data if no save found
                    dispatch({ type: 'RESET_WORLD' });
                }
            } catch (e) {
                console.error("Failed to load GodMode world:", e);
                dispatch({ type: 'RESET_WORLD' });
            }
        };
        load();
    }, []);

    // 2. Auto-Save Logic
    const saveWorld = useCallback(async () => {
        if (!state.hasLoaded) return; // Don't save before loading

        try {
            const dataToSave = {
                nodes: state.nodes,
                edges: state.edges,
                updatedAt: Date.now()
            };
            StorageManager.setJSON(STORAGE_KEY, dataToSave);
            dispatch({ type: 'SET_LAST_SAVED', payload: Date.now() });
        } catch (e) {
            console.error("Failed to save GodMode world:", e);
        }
    }, [state.nodes, state.edges, state.hasLoaded]);

    useEffect(() => {
        if (!state.hasLoaded) return;

        // Debounce save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveWorld();
        }, 2000); // Auto-save after 2 seconds of inactivity

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [state.nodes, state.edges, state.hasLoaded, saveWorld]);

    // 3. Filter Nodes Helper
    const getVisibleNodes = useCallback(() => {
        return state.nodes.filter(node => {
            const visibleData = node.data as any;
            const nodeParentId = visibleData?.worldPosition?.parentId || null;
            const isChildOfCurrent = nodeParentId === state.currentParentId;

            // Layer check
            const layer = node.data?.layer as WorldLayer;
            const isLayerVisible = state.visibleLayers[layer];

            return isLayerVisible && isChildOfCurrent;
        });
    }, [state.nodes, state.visibleLayers, state.currentParentId]);

    return (
        <GodModeContext.Provider value={{ state, dispatch, getVisibleNodes, saveWorld }}>
            {children}
        </GodModeContext.Provider>
    );
}

// --- Hook ---

export function useGodMode() {
    const context = useContext(GodModeContext);
    if (!context) {
        throw new Error('useGodMode must be used within a GodModeProvider');
    }
    return context;
}
