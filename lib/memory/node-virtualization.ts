/**
 * GodMode 节点虚拟化管理器
 * 限制内存中的节点数量，实现分页加载
 */

import { Node, Edge } from 'reactflow';

interface VirtualizationConfig {
  maxNodesInMemory: number;
  maxEdgesInMemory: number;
  pageSize: number;
}

const DEFAULT_CONFIG: VirtualizationConfig = {
  maxNodesInMemory: 500,    // 内存中最多保留500个节点
  maxEdgesInMemory: 1000,   // 内存中最多保留1000条边
  pageSize: 50              // 每页加载50个节点
};

export class NodeVirtualizationManager {
  private config: VirtualizationConfig;
  private nodeCache: Map<string, Node> = new Map();
  private edgeCache: Map<string, Edge> = new Map();
  private accessOrder: string[] = [];  // LRU 访问顺序

  constructor(config: Partial<VirtualizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加节点到缓存
   */
  addNode(node: Node): void {
    if (this.nodeCache.size >= this.config.maxNodesInMemory) {
      this.evictLRUNode();
    }
    this.nodeCache.set(node.id, node);
    this.updateAccessOrder(node.id);
  }

  /**
   * 获取节点
   */
  getNode(id: string): Node | undefined {
    const node = this.nodeCache.get(id);
    if (node) {
      this.updateAccessOrder(id);
    }
    return node;
  }

  /**
   * 批量获取节点（分页）
   */
  getNodesPage(page: number): Node[] {
    const start = page * this.config.pageSize;
    const end = start + this.config.pageSize;
    const nodeIds = this.accessOrder.slice(start, end);
    return nodeIds.map(id => this.nodeCache.get(id)).filter(Boolean) as Node[];
  }

  /**
   * 清理最久未访问的节点
   */
  private evictLRUNode(): void {
    if (this.accessOrder.length === 0) return;
    const lruId = this.accessOrder.shift();
    if (lruId) {
      this.nodeCache.delete(lruId);
      // 同时清理相关的边
      this.cleanupEdgesForNode(lruId);
    }
  }

  /**
   * 清理与节点相关的边
   */
  private cleanupEdgesForNode(nodeId: string): void {
    for (const [edgeId, edge] of this.edgeCache) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edgeCache.delete(edgeId);
      }
    }
  }

  /**
   * 更新访问顺序（LRU）
   */
  private updateAccessOrder(id: string): void {
    const index = this.accessOrder.indexOf(id);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(id);
  }

  /**
   * 获取当前内存使用情况
   */
  getMemoryStats(): { nodes: number; edges: number; total: number } {
    return {
      nodes: this.nodeCache.size,
      edges: this.edgeCache.size,
      total: this.nodeCache.size + this.edgeCache.size
    };
  }

  /**
   * 清理所有缓存
   */
  clear(): void {
    this.nodeCache.clear();
    this.edgeCache.clear();
    this.accessOrder = [];
  }

  /**
   * 序列化节点数据（用于存储）
   */
  serializeNodes(nodes: Node[]): string {
    // 只保留必要字段，减少存储大小
    const minimalNodes = nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.data?.label,
        type: node.data?.type,
        // 截断长文本
        desc: node.data?.desc?.substring(0, 1000)
      }
    }));
    return JSON.stringify(minimalNodes);
  }
}

// 全局单例
export const nodeVirtualizationManager = new NodeVirtualizationManager();
