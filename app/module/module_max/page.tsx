'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

export default function MaxHomePage() {
  const { isAiOpen } = useEditorAgent();

  return (
    <div className={`transition-all duration-500 ease-in-out ${isAiOpen ? 'pr-[360px]' : ''}`}>
    <div className="max-w-6xl mx-auto py-10 px-6 font-serif space-y-6 max-surface">
      <div className="max-panel rounded-xl p-6 space-y-1">
        <h1 className="text-2xl font-bold text-ink mb-2">MAX 创作中心</h1>
        <p className="text-ink/60">选择要进入的模块</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/module/module_max/dismantle"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-daiqing transition-colors">拆书中心</h2>
          <p className="text-sm text-ink/60">导入正文 → 一键准备素材 → 提问生成拆书总结</p>
        </Link>
        <Link
          href="/module/module_max/outline"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-daiqing transition-colors">大纲生成</h2>
          <p className="text-sm text-ink/60">流程化生成大纲 → 范式可配置 → 结构清晰</p>
        </Link>
        <Link
          href="/module/module_max/creation"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-daiqing transition-colors">万字冲刺</h2>
          <p className="text-sm text-ink/60">批量生成章节 → 自动衔接剧情 → 沉浸式创作</p>
        </Link>
        <Link
          href="/module/module_max/polish"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-daiqing transition-colors">自循环</h2>
          <p className="text-sm text-ink/60">评审→润色→再评审，直到达到目标分数</p>
        </Link>
        <Link
          href="/module/module_max/idea"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-daiqing transition-colors">脑洞风暴</h2>
          <p className="text-sm text-ink/60">输入关键词 → AI 裂变创意 → 寻找爆款灵感</p>
        </Link>
        <Link
          href="/module/module_max/humanizer"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group"
        >
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-daiqing transition-colors">AI去味</h2>
          <p className="text-sm text-ink/60">深度分析文本 → 消除AI特征 → 提升阅读质感</p>
        </Link>
        <Link
          href="/module/module_max/godmode"
          className="max-panel rounded-xl p-6 hover:shadow-md transition-shadow group border border-purple-500/20 bg-purple-500/5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-purple-500/80">上帝模式</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/10 text-purple-400">尝鲜版</span>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-2 group-hover:text-purple-500 transition-colors">创造世界</h2>
          <p className="text-sm text-ink/60">构建世界观、势力与规则体系，生成完整的小说世界蓝图</p>
        </Link>
      </div>
    </div>
    </div>
  );
}
