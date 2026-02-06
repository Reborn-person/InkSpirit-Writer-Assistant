'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
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
            desc: '大陆第一阴暗势力，在此处设有分殿。（第5章出现）',
            startChapter: 5,
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
            desc: '加玛帝国最强宗门。（第10章覆灭）',
            endChapter: 10,
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

// --- World List Types ---

export interface WorldInfo {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    nodeCount: number;
}

export interface WorldData {
    nodes: Node<GodNodeData>[];
    edges: Edge[];
    updatedAt: number;
}

// --- State Definition ---

interface GodModeState {
    nodes: Node<GodNodeData>[];
    edges: Edge[];

    // Navigation
    currentLevel: number;
    currentParentId: string | null;
    currentChapter: number;
    history: { level: number; parentId: string | null; name: string }[];

    // Visibility
    visibleLayers: LayerVisibility;

    // UI
    selectedNodeId: string | null;
    isSidebarOpen: boolean;

    // Meta
    hasLoaded: boolean;
    lastSaved: number | null;
    currentWorldId: string | null;
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
    | { type: 'SET_CURRENT_CHAPTER'; payload: number }
    | { type: 'SELECT_NODE'; payload: string | null }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'LOAD_STATE'; payload: Partial<GodModeState> }
    | { type: 'ADD_NODE'; payload: Node<GodNodeData> }
    | { type: 'DELETE_NODE'; payload: string }
    | { type: 'RESET_WORLD' }
    | { type: 'SET_LAST_SAVED'; payload: number }
    | { type: 'SET_CURRENT_WORLD'; payload: string | null };

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
    currentChapter: 1,
    history: [{ level: 0, parentId: null, name: '世界全景' }],
    visibleLayers: INITIAL_LAYERS,
    selectedNodeId: null,
    isSidebarOpen: true,
    hasLoaded: false,
    lastSaved: null,
    currentWorldId: null
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
        case 'SET_CURRENT_CHAPTER':
            return { ...state, currentChapter: action.payload };
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
        case 'SET_CURRENT_WORLD':
            return { ...state, currentWorldId: action.payload };
        default:
            return state;
    }
}

// --- Context ---

interface GodModeContextType {
    state: GodModeState;
    dispatch: React.Dispatch<Action>;
    visibleNodes: Node[];
    saveWorld: () => Promise<void>;
    // World List Management
    worldList: WorldInfo[];
    createWorld: (name: string) => Promise<string>;
    loadWorld: (worldId: string) => Promise<void>;
    deleteWorld: (worldId: string) => Promise<void>;
    renameWorld: (worldId: string, newName: string) => Promise<void>;
    currentWorldName: string;
}

const GodModeContext = createContext<GodModeContextType | null>(null);

// --- Storage Keys ---

const WORLDS_LIST_KEY = 'godmode_worlds_list';
const WORLD_DATA_PREFIX = 'godmode_world_data_';

// --- Provider ---

export function GodModeProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(godModeReducer, INITIAL_STATE);
    const [worldList, setWorldList] = useState<WorldInfo[]>([]);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load world list
    const loadWorldList = useCallback(async () => {
        try {
            const list = await StorageManager.getJSONAsync(WORLDS_LIST_KEY) || [];
            setWorldList(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error("Failed to load world list:", e);
            setWorldList([]);
        }
    }, []);

    // Save world list
    const saveWorldList = useCallback(async (list: WorldInfo[]) => {
        try {
            await StorageManager.setJSON(WORLDS_LIST_KEY, list);
            setWorldList(list);
        } catch (e) {
            console.error("Failed to save world list:", e);
        }
    }, []);

    // 1. Load on Mount
    useEffect(() => {
        const load = async () => {
            await loadWorldList();
            
            // Try to load last active world
            const lastWorldId = await StorageManager.getAsync('godmode_last_active_world');
            if (lastWorldId) {
                await loadWorld(lastWorldId);
            } else {
                // Initialize with Demo Data if no save found
                dispatch({ type: 'RESET_WORLD' });
            }
        };
        load();
    }, []);

    // Create new world
    const createWorld = useCallback(async (name: string): Promise<string> => {
        const worldId = crypto.randomUUID();
        const now = Date.now();
        
        const newWorld: WorldInfo = {
            id: worldId,
            name: name || `新世界 ${worldList.length + 1}`,
            createdAt: now,
            updatedAt: now,
            nodeCount: 0
        };

        const newList = [...worldList, newWorld];
        await saveWorldList(newList);

        // Initialize empty world data
        const worldData: WorldData = {
            nodes: [],
            edges: [],
            updatedAt: now
        };
        await StorageManager.setJSON(`${WORLD_DATA_PREFIX}${worldId}`, worldData);

        // Load the new world
        await loadWorld(worldId);

        return worldId;
    }, [worldList, saveWorldList]);

    // Load world
    const loadWorld = useCallback(async (worldId: string) => {
        try {
            const worldData = await StorageManager.getJSONAsync(`${WORLD_DATA_PREFIX}${worldId}`);
            if (worldData && typeof worldData === 'object') {
                dispatch({
                    type: 'LOAD_STATE',
                    payload: {
                        nodes: worldData.nodes || [],
                        edges: worldData.edges || [],
                        currentWorldId: worldId,
                        currentLevel: 0,
                        currentParentId: null,
                        history: [{ level: 0, parentId: null, name: '世界全景' }]
                    }
                });
                await StorageManager.setAsync('godmode_last_active_world', worldId);
            }
        } catch (e) {
            console.error("Failed to load world:", e);
        }
    }, []);

    // Delete world
    const deleteWorld = useCallback(async (worldId: string) => {
        try {
            // Remove from list
            const newList = worldList.filter(w => w.id !== worldId);
            await saveWorldList(newList);

            // Remove world data
            await StorageManager.removeAsync(`${WORLD_DATA_PREFIX}${worldId}`);

            // If deleting current world, reset to demo
            if (state.currentWorldId === worldId) {
                dispatch({ type: 'RESET_WORLD' });
                await StorageManager.removeAsync('godmode_last_active_world');
            }
        } catch (e) {
            console.error("Failed to delete world:", e);
        }
    }, [worldList, saveWorldList, state.currentWorldId]);

    // Rename world
    const renameWorld = useCallback(async (worldId: string, newName: string) => {
        try {
            const newList = worldList.map(w => 
                w.id === worldId ? { ...w, name: newName, updatedAt: Date.now() } : w
            );
            await saveWorldList(newList);
        } catch (e) {
            console.error("Failed to rename world:", e);
        }
    }, [worldList, saveWorldList]);

    // 2. Auto-Save Logic
    const saveWorld = useCallback(async () => {
        if (!state.hasLoaded) return;
        if (!state.currentWorldId) {
            // Auto-create a world if none exists
            if (worldList.length === 0) {
                await createWorld('默认世界');
                return;
            }
            return;
        }

        try {
            const worldData: WorldData = {
                nodes: state.nodes,
                edges: state.edges,
                updatedAt: Date.now()
            };
            
            await StorageManager.setJSON(`${WORLD_DATA_PREFIX}${state.currentWorldId}`, worldData);
            
            // Update world list
            const newList = worldList.map(w => 
                w.id === state.currentWorldId 
                    ? { ...w, updatedAt: Date.now(), nodeCount: state.nodes.length } 
                    : w
            );
            await saveWorldList(newList);
            
            dispatch({ type: 'SET_LAST_SAVED', payload: Date.now() });
        } catch (e) {
            console.error("Failed to save GodMode world:", e);
        }
    }, [state.nodes, state.edges, state.hasLoaded, state.currentWorldId, worldList, createWorld, saveWorldList]);

    useEffect(() => {
        if (!state.hasLoaded) return;

        // Debounce save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveWorld();
        }, 3000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [state.nodes, state.edges, state.hasLoaded, saveWorld]);

    // 3. Memoized Filtered Nodes
    const visibleNodes = React.useMemo(() => {
        return state.nodes.filter(node => {
            const visibleData = node.data as any;
            const nodeParentId = visibleData?.worldPosition?.parentId || null;
            const isChildOfCurrent = nodeParentId === state.currentParentId;

            // Layer check
            const layer = node.data?.layer as WorldLayer;
            const isLayerVisible = state.visibleLayers[layer];

            // Timeline check
            const start = node.data.startChapter || 1;
            const end = node.data.endChapter;
            const current = state.currentChapter;
            const isTimeVisible = current >= start && (end === undefined || end === null || current <= end);

            return isLayerVisible && isChildOfCurrent && isTimeVisible;
        });
    }, [state.nodes, state.visibleLayers, state.currentParentId, state.currentChapter]);

    // Get current world name
    const currentWorldName = React.useMemo(() => {
        const world = worldList.find(w => w.id === state.currentWorldId);
        return world?.name || '未命名世界';
    }, [worldList, state.currentWorldId]);

    return (
        <GodModeContext.Provider value={{ 
            state, 
            dispatch, 
            visibleNodes, 
            saveWorld,
            worldList,
            createWorld,
            loadWorld,
            deleteWorld,
            renameWorld,
            currentWorldName
        }}>
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
