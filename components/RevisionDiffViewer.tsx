// 修订差异可视化组件
// 显示文本修改的对比视图

import React, { useState } from 'react';
import { Revision, DiffSegment, RevisionStatus } from '@/lib/revision/types';
import { Check, X, Edit3, MessageSquare } from 'lucide-react';

interface RevisionDiffViewerProps {
  revision: Revision;
  onAccept: (revisionId: string) => void;
  onReject: (revisionId: string) => void;
  onModify: (revisionId: string, newText: string) => void;
  className?: string;
}

// 获取修订类型名称
const getRevisionTypeName = (type: string): string => {
  const names: Record<string, string> = {
    simplify: '简化',
    expand: '扩写',
    polish: '润色',
    adjust_tone: '调整语气',
    fix_logic: '修正逻辑',
    add_detail: '添加细节',
    delete: '删除',
    restructure: '重构结构',
    custom: '自定义',
  };
  return names[type] || type;
};

// 获取状态样式
const getStatusStyle = (status: RevisionStatus) => {
  switch (status) {
    case 'suggested':
      return 'border-yellow-300 bg-yellow-50';
    case 'accepted':
      return 'border-green-300 bg-green-50';
    case 'rejected':
      return 'border-red-300 bg-red-50 opacity-60';
    case 'modified':
      return 'border-blue-300 bg-blue-50';
    default:
      return 'border-gray-300 bg-gray-50';
  }
};

export default function RevisionDiffViewer({
  revision,
  onAccept,
  onReject,
  onModify,
  className = '',
}: RevisionDiffViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(revision.suggestedText);

  // 计算差异
  const calculateDiff = (original: string, modified: string): DiffSegment[] => {
    // 简单的字符级差异
    const segments: DiffSegment[] = [];
    
    // 如果文本较短，使用字符级对比
    if (original.length < 100 && modified.length < 100) {
      // 找到共同前缀
      let commonPrefix = 0;
      while (commonPrefix < original.length && 
             commonPrefix < modified.length && 
             original[commonPrefix] === modified[commonPrefix]) {
        commonPrefix++;
      }
      
      // 找到共同后缀
      let commonSuffix = 0;
      while (commonSuffix < original.length - commonPrefix && 
             commonSuffix < modified.length - commonPrefix &&
             original[original.length - 1 - commonSuffix] === modified[modified.length - 1 - commonSuffix]) {
        commonSuffix++;
      }
      
      // 构建差异片段
      if (commonPrefix > 0) {
        segments.push({ type: 'unchanged', text: original.slice(0, commonPrefix) });
      }
      
      const deletedText = original.slice(commonPrefix, original.length - commonSuffix);
      const addedText = modified.slice(commonPrefix, modified.length - commonSuffix);
      
      if (deletedText) {
        segments.push({ type: 'deleted', text: deletedText, revisionId: revision.id });
      }
      
      if (addedText) {
        segments.push({ type: 'added', text: addedText, revisionId: revision.id });
      }
      
      if (commonSuffix > 0) {
        segments.push({ type: 'unchanged', text: original.slice(original.length - commonSuffix) });
      }
    } else {
      // 长文本使用整段对比
      segments.push({ type: 'deleted', text: original, revisionId: revision.id });
      segments.push({ type: 'added', text: modified, revisionId: revision.id });
    }
    
    return segments;
  };

  const diffSegments = calculateDiff(revision.originalText, revision.suggestedText);

  const handleSaveEdit = () => {
    onModify(revision.id, editText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(revision.suggestedText);
    setIsEditing(false);
  };

  return (
    <div className={`rounded-xl border-2 ${getStatusStyle(revision.status)} p-4 ${className}`}>
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/80 text-ink/70">
            {getRevisionTypeName(revision.type)}
          </span>
          <span className="text-xs text-ink/50">
            {new Date(revision.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {revision.status === 'suggested' && (
            <>
              <button
                onClick={() => onAccept(revision.id)}
                className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                title="接受"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReject(revision.id)}
                className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="拒绝"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                title="修改"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </>
          )}
          {revision.status === 'accepted' && (
            <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
              已接受
            </span>
          )}
          {revision.status === 'rejected' && (
            <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
              已拒绝
            </span>
          )}
          {revision.status === 'modified' && (
            <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
              已修改
            </span>
          )}
        </div>
      </div>

      {/* 修改说明 */}
      {revision.description && (
        <div className="mb-3 text-sm text-ink/70 bg-white/60 rounded-lg p-2 flex items-start gap-2">
          <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink/40" />
          <span>{revision.description}</span>
        </div>
      )}

      {/* 差异显示 */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 text-xs rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              保存
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs rounded-lg bg-ink/10 text-ink/60 hover:bg-ink/20 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {diffSegments.map((segment, index) => (
            <span
              key={index}
              className={`
                ${segment.type === 'deleted' ? 'bg-red-100 text-red-700 line-through decoration-red-400' : ''}
                ${segment.type === 'added' ? 'bg-green-100 text-green-700' : ''}
                ${segment.type === 'unchanged' ? 'text-ink/80' : ''}
              `}
            >
              {segment.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 批量修订列表
interface RevisionListProps {
  revisions: Revision[];
  onAccept: (revisionId: string) => void;
  onReject: (revisionId: string) => void;
  onModify: (revisionId: string, newText: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  className?: string;
}

export function RevisionList({
  revisions,
  onAccept,
  onReject,
  onModify,
  onAcceptAll,
  onRejectAll,
  className = '',
}: RevisionListProps) {
  const pendingRevisions = revisions.filter(r => r.status === 'suggested');

  if (revisions.length === 0) {
    return (
      <div className={`text-center text-ink/40 py-8 ${className}`}>
        暂无修订建议
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 批量操作 */}
      {pendingRevisions.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <span className="text-sm text-ink/70">
            有 {pendingRevisions.length} 个待处理修订
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onAcceptAll}
              className="px-3 py-1.5 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              全部接受
            </button>
            <button
              onClick={onRejectAll}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              全部拒绝
            </button>
          </div>
        </div>
      )}

      {/* 修订列表 */}
      <div className="space-y-3 max-h-[400px] overflow-auto custom-scrollbar">
        {revisions.map((revision) => (
          <RevisionDiffViewer
            key={revision.id}
            revision={revision}
            onAccept={onAccept}
            onReject={onReject}
            onModify={onModify}
          />
        ))}
      </div>
    </div>
  );
}
