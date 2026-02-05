// 9 Dimensions / Layers
export type WorldLayer =
    // Material Plane
    | 'geo'       // 地理
    | 'resource'  // 资源
    | 'race'      // 种族
    // Social Plane
    | 'faction'   // 势力
    | 'economy'   // 经济
    | 'culture'   // 文化
    // Energy Plane
    | 'power'     // 力量
    | 'rule'      // 法则
    | 'artifact'  // 神器
    | 'relation'  // 关系
    | 'secret'    // 伏笔
    | 'other'     // 其他
    // Meta
    | 'plot'      // 剧情 (special layer)
    | 'timeline'; // 时间线 (chapter-date mapping)

// Coordinate System with Fractal Depth
export interface Coordinates {
    x: number;
    y: number;
    z: number; // Depth level: 0=Universe, 1=Continent, 2=Region, 3=City, 4=Location
    parentId: string | null; // ID of the parent node (container)
}

// Visual properties for nodes
export interface NodeVisual {
    color: string;
    icon?: string;
    size: 'S' | 'M' | 'L' | 'XL';
    shape?: 'circle' | 'square' | 'hexagon';
}

// Core Node Data
export interface GodNodeData {
    name: string;
    desc?: string;
    layer: WorldLayer;
    tags?: string[];
    cardIds?: string[]; // Linked cards from library
    props?: Record<string, any>; // Layer-specific properties
    hasChildWorld?: boolean; // Can drill down?
    worldPosition: Coordinates; // Moved inside data for React Flow compatibility
    
    // Timeline Integration
    startChapter?: number; // Exists from this chapter
    endChapter?: number;   // Exists until this chapter (null/undefined means forever)
    status?: 'active' | 'destroyed' | 'hidden'; // Dynamic status based on timeline
}

// React Flow compatible Node definition
// We extend the basic node data structure
export interface GodNode {
    id: string;
    type: string; // 'godNode'
    position: { x: number; y: number }; // React Flow position (relative to parent if we were using subgroups, but here relative to viewport)
    data: GodNodeData;
}

// Edge Types
export type LinkType = 'path' | 'relation' | 'control' | 'conflict';

export interface GodLink {
    id: string;
    source: string;
    target: string;
    type: LinkType; // This maps to React Flow 'type' or custom
    label?: string;
    animated?: boolean;
    style?: React.CSSProperties;
}

// Layer Visibility State
export type LayerVisibility = Record<WorldLayer, boolean>;

// Constants
export const LAYER_CONFIG: Record<WorldLayer, { label: string; color: string; icon: string }> = {
    geo: { label: '地理', color: '#10b981', icon: 'Map' },
    resource: { label: '资源', color: '#f59e0b', icon: 'Gem' },
    race: { label: '角色/种族', color: '#8b5cf6', icon: 'Users' },
    faction: { label: '势力', color: '#ef4444', icon: 'Flag' },
    economy: { label: '经济', color: '#eab308', icon: 'Coins' },
    culture: { label: '文化', color: '#ec4899', icon: 'BookOpen' },
    power: { label: '力量', color: '#3b82f6', icon: 'Zap' },
    rule: { label: '法则', color: '#6366f1', icon: 'Scale' },
    artifact: { label: '神器', color: '#d946ef', icon: 'Crown' },
    relation: { label: '关系', color: '#f43f5e', icon: 'Users' },
    secret: { label: '伏笔', color: '#64748b', icon: 'FileText' },
    other: { label: '其他', color: '#94a3b8', icon: 'FileText' },
    plot: { label: '剧情', color: '#f97316', icon: 'FileText' },
    timeline: { label: '时间线', color: '#06b6d4', icon: 'Clock' },
};
