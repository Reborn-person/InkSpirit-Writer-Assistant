// 章节进度条可视化组件
// 显示渐进式上下文加载进度

import React from 'react';
import { ContextDimension, ContextLevel } from '@/lib/memory/progressive-context';

interface DimensionStatus {
  dimension: ContextDimension;
  name: string;
  level: ContextLevel;
  loaded: boolean;
  priority: number;
}

interface ChapterProgressBarProps {
  progress: number;                    // 总进度 0-100
  dimensions: DimensionStatus[];       // 各维度状态
  currentDimension?: ContextDimension; // 当前正在处理的维度
  className?: string;
}

const dimensionNames: Record<ContextDimension, string> = {
  plot: '剧情',
  character: '角色',
  scene: '场景',
  world: '世界观',
  emotion: '情感',
  style: '风格',
};

const levelColors: Record<ContextLevel, string> = {
  summary: 'bg-gray-300',
  basic: 'bg-blue-400',
  detailed: 'bg-purple-500',
  full: 'bg-green-500',
};

const levelNames: Record<ContextLevel, string> = {
  summary: '概要',
  basic: '基础',
  detailed: '详细',
  full: '完整',
};

export default function ChapterProgressBar({
  progress,
  dimensions,
  currentDimension,
  className = '',
}: ChapterProgressBarProps) {
  // 按优先级排序
  const sortedDimensions = [...dimensions].sort((a, b) => b.priority - a.priority);

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-ink/10 ${className}`}>
      {/* 总进度条 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-ink/80">章节理解进度</span>
          <span className="text-sm font-bold text-purple-600">{progress}%</span>
        </div>
        <div className="w-full bg-ink/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 各维度进度 */}
      <div className="space-y-2">
        <div className="text-xs text-ink/50 mb-2">各维度状态</div>
        <div className="grid grid-cols-2 gap-2">
          {sortedDimensions.map((dim) => (
            <DimensionItem
              key={dim.dimension}
              dimension={dim}
              isActive={currentDimension === dim.dimension}
            />
          ))}
        </div>
      </div>

      {/* 提示信息 */}
      {progress < 100 && (
        <div className="mt-3 text-xs text-ink/60 bg-purple-50 rounded-lg p-2">
          💡 继续回答AI的问题，完善上下文信息
        </div>
      )}
      {progress >= 100 && (
        <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg p-2">
          ✅ 理解已完成！可以说"确认完成"开始写作
        </div>
      )}
    </div>
  );
}

// 单个维度项
function DimensionItem({
  dimension,
  isActive,
}: {
  dimension: DimensionStatus;
  isActive: boolean;
}) {
  const { dimension: dimKey, name, level, loaded, priority } = dimension;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
        isActive ? 'bg-purple-100 ring-2 ring-purple-300' : 'bg-ink/5'
      }`}
    >
      {/* 状态指示器 */}
      <div
        className={`w-3 h-3 rounded-full flex-shrink-0 ${
          loaded ? levelColors[level] : 'bg-gray-300'
        } ${isActive ? 'animate-pulse' : ''}`}
      />

      {/* 维度信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink/80 truncate">{name}</span>
          {loaded && (
            <span className="text-[10px] text-ink/50 ml-1">{levelNames[level]}</span>
          )}
        </div>
        {/* 微型进度条 */}
        <div className="w-full bg-ink/10 rounded-full h-1 mt-1">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              loaded ? levelColors[level] : 'bg-gray-300'
            }`}
            style={{
              width: loaded
                ? level === 'full'
                  ? '100%'
                  : level === 'detailed'
                  ? '75%'
                  : level === 'basic'
                  ? '50%'
                  : '25%'
                : '0%',
            }}
          />
        </div>
      </div>

      {/* 优先级标记 */}
      {priority >= 9 && (
        <span className="text-[10px] text-red-500 font-medium">必</span>
      )}
    </div>
  );
}

// 简化的进度条（用于紧凑显示）
export function CompactProgressBar({
  progress,
  className = '',
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 bg-ink/10 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-medium text-ink/60 w-10 text-right">
        {progress}%
      </span>
    </div>
  );
}
