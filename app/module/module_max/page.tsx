'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

export default function MaxHomePage() {
  const { isAiOpen } = useEditorAgent();

  return (
    <div className={`transition-all duration-500 ease-in-out min-h-screen bg-max-bg-alt text-max-text font-serif ${isAiOpen ? 'pr-[360px]' : ''}`}>
      <div className="max-w-6xl mx-auto py-10 px-6 space-y-8">
        <div className="bg-max-bg border border-max-border/30 rounded-xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-max-text mb-3">MAX 创作中心</h1>
          <p className="text-max-text-muted">全流程 AI 辅助创作套件</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/module/module_max/idea"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">脑洞风暴</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              输入关键词 → AI 裂变创意 → 寻找爆款灵感
            </p>
          </Link>

          <Link
            href="/module/module_max/dismantle"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">拆书中心</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              导入正文 → 一键准备素材 → 提问生成拆书总结
            </p>
          </Link>

          <Link
            href="/module/module_max/outline"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">大纲生成</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              流程化生成大纲 → 范式可配置 → 结构清晰
            </p>
          </Link>

          <Link
            href="/module/module_max/creation"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">万字冲刺</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              批量生成章节 → 自动衔接剧情 → 沉浸式创作
            </p>
          </Link>

          <Link
            href="/module/module_max/polish"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">自循环</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              评审→润色→再评审，直到达到目标分数
            </p>
          </Link>

          <Link
            href="/module/module_max/humanizer"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">AI去味</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              深度分析文本 → 消除AI特征 → 提升阅读质感
            </p>
          </Link>

          <Link
            href="/module/module_max/consistency"
            className="group bg-max-bg border border-max-border/30 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h2 className="text-xl font-semibold text-max-text mb-3 group-hover:text-max-accent transition-colors">一致性检查</h2>
            <p className="text-sm text-max-text-muted leading-relaxed">
              检测人物、世界观、时间线的前后矛盾
            </p>
          </Link>

          <Link
            href="/module/module_max/godmode"
            className="group bg-max-bg border border-max-accent/20 rounded-xl p-6 hover:bg-max-bg-alt hover:border-max-accent/50 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-max-accent/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-max-text group-hover:text-max-accent transition-colors">上帝模式</h2>
              <span className="text-[10px] px-2 py-1 rounded-full bg-max-accent/20 text-max-accent border border-max-accent/30">尝鲜版</span>
            </div>
            <p className="text-sm text-max-text-muted leading-relaxed">
              构建世界观、势力与规则体系，生成完整的小说世界蓝图
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
