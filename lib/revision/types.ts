// 文章修订系统类型定义

// 修订类型
export type RevisionType =
  | 'simplify'      // 简化
  | 'expand'        // 扩写
  | 'polish'        // 润色
  | 'adjust_tone'   // 调整语气
  | 'fix_logic'     // 修正逻辑
  | 'add_detail'    // 添加细节
  | 'delete'        // 删除
  | 'restructure'   // 重构结构
  | 'custom';       // 自定义

// 修订状态
export type RevisionStatus =
  | 'pending'       // 待处理
  | 'generating'    // 生成中
  | 'suggested'     // 已建议
  | 'accepted'      // 已接受
  | 'rejected'      // 已拒绝
  | 'modified';     // 已修改

// 修订记录
export interface Revision {
  id: string;
  type: RevisionType;
  status: RevisionStatus;
  
  // 位置信息
  startIndex: number;      // 开始位置
  endIndex: number;        // 结束位置
  originalText: string;    // 原文
  
  // 修改内容
  suggestedText: string;   // 建议文本
  finalText?: string;      // 最终文本（用户修改后）
  
  // 元信息
  description: string;     // 修改说明
  reason?: string;         // 修改原因
  timestamp: number;
  
  // 用户交互
  userPrompt: string;      // 用户的修改指令
  aiResponse?: string;     // AI的响应
}

// 修订批次（一次对话可能产生多个修订）
export interface RevisionBatch {
  id: string;
  revisions: Revision[];
  timestamp: number;
  userPrompt: string;
}

// 修订统计
export interface RevisionStats {
  totalRevisions: number;
  accepted: number;
  rejected: number;
  modified: number;
  pending: number;
  byType: Record<RevisionType, number>;
}

// 文本差异片段
export interface DiffSegment {
  type: 'unchanged' | 'deleted' | 'added';
  text: string;
  revisionId?: string;
}

// 可视化配置
export interface RevisionVisualConfig {
  showDeleted: boolean;      // 是否显示删除内容
  highlightAdded: boolean;   // 是否高亮新增内容
  showSidePanel: boolean;    // 是否显示侧边批注
  inlineMode: boolean;       // 内联模式 vs 分屏模式
}

// 修订请求
export interface RevisionRequest {
  selectedText: string;
  fullContext: string;
  prompt: string;
  type?: RevisionType;
  startIndex: number;
  endIndex: number;
}

// 修订响应
export interface RevisionResponse {
  revisions: Revision[];
  explanation: string;
}
