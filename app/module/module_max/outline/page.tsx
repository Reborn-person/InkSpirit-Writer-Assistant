'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layout, Sparkles, FileText, RefreshCw, Play } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { generateAIContent, generateAIContentStream } from '@/lib/ai';
import { APIConfigValidator } from '@/lib/api-validator';
import Module10Manager from '@/components/Module10Manager';
import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';

export default function MaxOutlinePage() {
  const pathname = usePathname();
  const { isAiOpen, registerPageSkill, unregisterPageSkill } = useEditorAgent();

  const isMaxHome = pathname === '/module/module_max';
  const isMaxIdea = pathname === '/module/module_max/idea';
  const isMaxDismantle = pathname === '/module/module_max/dismantle';
  const isMaxCreation = pathname === '/module/module_max/creation';
  const isMaxPolish = pathname === '/module/module_max/polish';
  const isMaxOutline = pathname === '/module/module_max/outline';
  const isMaxConsistency = pathname === '/module/module_max/consistency';
  const isMaxHumanizer = pathname === '/module/module_max/humanizer';
  const isMaxGodMode = pathname === '/module/module_max/godmode';

  const outlineKey = 'novel_writer_max_outline';
  const outlinePromptKey = 'novel_writer_max_outline_prompt';
  const outlineChapterCountKey = 'novel_writer_max_outline_chapter_count';

  const [outlineIdea, setOutlineIdea] = useState('');
  const [outlineChapterCount, setOutlineChapterCount] = useState(50);
  const [outlineParadigm, setOutlineParadigm] = useState('');
  const [outlineResult, setOutlineResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [outlineOptimizeFocus, setOutlineOptimizeFocus] = useState('结构完整性、节奏与爽点分布、人物动机合理性');
  const [outlineOptimizeTargetScore, setOutlineOptimizeTargetScore] = useState(8);
  const [outlineOptimizeMaxRounds, setOutlineOptimizeMaxRounds] = useState(3);
  const [outlineOptimizeRunning, setOutlineOptimizeRunning] = useState(false);
  const [outlineOptimizeError, setOutlineOptimizeError] = useState('');
  const [outlineOptimizeRounds, setOutlineOptimizeRounds] = useState<{ round: number; score: number; feedback: string; text: string }[]>([]);
  const [outlineOptimizeCurrentRound, setOutlineOptimizeCurrentRound] = useState(0);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [activeSection, setActiveSection] = useState<'generate' | 'optimize'>('generate');
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Model Config
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
      provider: 'siliconflow',
      model: 'deepseek-ai/DeepSeek-V3',
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1'
  });

  // useEffect(() => {
  //   // Force enable Max Mode styles globally
  //   document.body.classList.add('max-mode');
  //   return () => {
  //     document.body.classList.remove('max-mode');
  //   };
  // }, []);

  useEffect(() => {
    const loadSaved = async () => {
      const savedOutline = await StorageManager.getAsync(outlineKey);
      const savedPrompt = StorageManager.get(outlinePromptKey) || '';
      const savedCountRaw = StorageManager.get(outlineChapterCountKey);
      if (typeof savedOutline === 'string') {
        setOutlineResult(savedOutline);
      }
      setOutlineParadigm(savedPrompt);
      const savedCount = Number(savedCountRaw);
      if (Number.isFinite(savedCount) && savedCount > 0) {
        setOutlineChapterCount(savedCount);
      }
    };
    loadSaved();
  }, []);

  useEffect(() => {
    StorageManager.set(outlinePromptKey, outlineParadigm);
  }, [outlineParadigm]);

  useEffect(() => {
    StorageManager.set(outlineChapterCountKey, String(outlineChapterCount));
  }, [outlineChapterCount]);

  useEffect(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      StorageManager.set(outlineKey, outlineResult);
    }, 600);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [outlineResult]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const parseOutlineScore = (raw: string) => {
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : raw;
    const data = JSON.parse(jsonText);
    const score = Number(data.score);
    const feedback = String(data.feedback || data.comment || data.analysis || '').trim();
    if (!Number.isFinite(score)) {
      throw new Error('评分解析失败，请重试');
    }
    return { score, feedback };
  };

  const handleGenerateOutline = async () => {
    if (!outlineIdea.trim()) {
      alert('请输入核心创意或故事梗概');
      return;
    }
    const { apiKey, baseUrl, model } = modelConfig;

    if (!model) {
      alert('请先配置模型');
      return;
    }

    setIsGenerating(true);
    setError('');
    setOutlineOptimizeError('');
    setOutlineOptimizeRounds([]);
    setOutlineOptimizeCurrentRound(0);
    setOutlineResult('');
    abortControllerRef.current = new AbortController();

    const paradigmBlock = outlineParadigm.trim()
      ? `大纲生成范式（最高优先级，完全遵循）：\n${outlineParadigm.trim()}`
      : '';

    const systemPrompt = '你是资深网文主编，擅长将核心创意扩展为结构清晰、节奏紧凑的大纲。';
    const userPrompt = `
任务：生成小说大纲。
核心创意：${outlineIdea.trim()}
章节规模目标：${outlineChapterCount}章
${paradigmBlock ? `\n${paradigmBlock}\n` : ''}
输出要求：
1. 按阶段或卷划分结构，并标注阶段目标与节奏变化。
2. 每个阶段给出关键剧情节点与人物推进要点。
3. 如果范式要求具体格式或章节数，以范式为准。
4. 仅输出大纲正文，不要额外解释。
    `.trim();

    try {
      const fullText = await generateAIContentStream(
        apiKey,
        systemPrompt,
        userPrompt,
        baseUrl,
        model,
        (content) => {
          setOutlineResult(content);
          StorageManager.set(outlineKey, content);
        },
        abortControllerRef.current?.signal
      );
      setOutlineResult(fullText);
      StorageManager.set(outlineKey, fullText);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || '生成失败');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeOutline = async () => {
    setOutlineOptimizeError('');
    if (!outlineResult.trim()) {
      setOutlineOptimizeError('请先生成或输入大纲内容');
      return;
    }

    const { apiKey, baseUrl, model } = modelConfig;
    if (!model) {
      setOutlineOptimizeError('请先配置模型');
      return;
    }

    setOutlineOptimizeRunning(true);
    setOutlineOptimizeRounds([]);
    setOutlineOptimizeCurrentRound(0);

    let currentText = outlineResult.trim();
    let finalText = currentText;

    try {
      for (let round = 1; round <= outlineOptimizeMaxRounds; round += 1) {
        setOutlineOptimizeCurrentRound(round);
        const evalSystem = '你是资深网文总编，擅长评审小说大纲并给出可执行修改建议。';
        const evalPrompt = `请仅输出 JSON，不要输出其他文字。
评分范围 1-10 分，必须包含 score 与 feedback 字段。
评审侧重点：${outlineOptimizeFocus}
大纲内容：
${currentText}`;

        const evalRaw = await generateAIContent(apiKey, evalSystem, evalPrompt, baseUrl, model);
        const { score, feedback } = parseOutlineScore(evalRaw);
        setOutlineOptimizeRounds((prev) => [...prev, { round, score, feedback, text: currentText }]);

        if (score >= outlineOptimizeTargetScore) {
          finalText = currentText;
          break;
        }

        const improveSystem = '你是资深网文主编，请根据评审意见优化小说大纲，保持核心创意不变，只优化结构、节奏与爽点分布。';
        const improvePrompt = `根据以下反馈优化大纲，只输出优化后的大纲正文，不要输出解释或标题。
评审反馈：${feedback}
优化侧重点：${outlineOptimizeFocus}
原大纲：
${currentText}`;

        const improved = await generateAIContent(apiKey, improveSystem, improvePrompt, baseUrl, model);
        currentText = improved.trim() || currentText;
        finalText = currentText;
      }

      setOutlineResult(finalText);
      StorageManager.set(outlineKey, finalText);
    } catch (e: any) {
      setOutlineOptimizeError(e?.message || '大纲优化失败');
    } finally {
      setOutlineOptimizeRunning(false);
      setOutlineOptimizeCurrentRound(0);
    }
  };

  useEffect(() => {
    const handlePageSkill = async (payload: { action: string; value?: any }) => {
        const { action, value } = payload;
        if (action === 'set_idea') setOutlineIdea(String(value));
        if (action === 'set_paradigm') setOutlineParadigm(String(value));
        if (action === 'set_chapter_count') setOutlineChapterCount(Number(value));
        if (action === 'generate_outline') handleGenerateOutline();
        if (action === 'set_optimize_focus') setOutlineOptimizeFocus(String(value));
        if (action === 'optimize_outline') handleOptimizeOutline();
    };

    registerPageSkill('page_control', handlePageSkill);
    return () => unregisterPageSkill('page_control');
  }, [registerPageSkill, unregisterPageSkill, handleGenerateOutline, handleOptimizeOutline]);

  return (
    <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-max-bg-alt text-max-text font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
      <header className="h-14 border-b border-max-border flex items-center justify-between px-4 bg-max-bg shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex bg-max-surface rounded-lg p-1 border border-max-border overflow-x-auto no-scrollbar max-w-[60vw]">
            <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHome ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>MAX 主页</Link>
            <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxIdea ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>脑洞风暴</Link>
            <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxDismantle ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>拆书</Link>
            <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxOutline ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>大纲生成</Link>
            <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxCreation ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>万字冲刺</Link>
            <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxPolish ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>自循环</Link>
            <Link href="/module/module_max/consistency" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxConsistency ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>一致性</Link>
            <Link href="/module/module_max/humanizer" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHumanizer ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>AI去味</Link>
            <Link href="/module/module_max/godmode" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxGodMode ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>上帝模式</Link>
          </div>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <h1 className="text-sm font-bold text-max-text flex items-center gap-2">
            <Layout className="w-4 h-4 text-blue-400" />
            大纲生成
          </h1>
          <div className="ml-4">
              <ModelConfigPanel moduleKey="outline" onConfigChange={setModelConfig} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden bg-max-surface-alt">
        <div className="max-w-7xl mx-auto h-full flex gap-6 p-6">
          <div className="w-1/3 max-panel rounded-xl p-5 space-y-5 overflow-y-auto custom-scrollbar bg-max-bg border border-max-border">
            <div className="flex rounded-lg bg-max-surface p-1">
              <button
                type="button"
                onClick={() => setActiveSection('generate')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-md transition-all ${activeSection === 'generate' ? 'bg-max-accent text-white shadow-sm' : 'text-max-text-muted hover:text-max-text'}`}
              >
                大纲生成
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('optimize')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-md transition-all ${activeSection === 'optimize' ? 'bg-max-accent text-white shadow-sm' : 'text-max-text-muted hover:text-max-text'}`}
              >
                大纲优化器
              </button>
            </div>

            {activeSection === 'generate' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-max-text-muted">1. 整体大纲 / 总体梗概</label>
                  <textarea
                    value={outlineIdea}
                    onChange={(e) => setOutlineIdea(e.target.value)}
                    className="w-full h-32 px-3 py-3 bg-max-surface-alt border border-max-border rounded-lg outline-none text-sm text-max-text focus:border-max-accent resize-none"
                    placeholder="输入整书大纲要点、主线冲突、主角目标等"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-max-text-muted">2. 大纲生成范式</label>
                    <button
                      onClick={() => setShowPromptManager(true)}
                      className="text-xs text-max-accent hover:text-max-accent-hover flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" /> 提示词库
                    </button>
                  </div>
                  <textarea
                    value={outlineParadigm}
                    onChange={(e) => setOutlineParadigm(e.target.value)}
                    className="w-full h-28 px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent resize-y placeholder:text-max-text-muted/50"
                    placeholder="输入可复用的大纲生成范式，例如阶段结构、节奏要求、输出格式等"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-max-text-muted">3. 生成设置</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-max-text-muted">
                      <span>章节规模目标</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          value={outlineChapterCount}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            if (!Number.isFinite(next)) return;
                            setOutlineChapterCount(Math.max(1, Math.min(2000, next)));
                          }}
                          className="w-20 px-2 py-1 bg-max-surface-alt border border-max-border rounded-md outline-none text-xs text-max-text focus:border-max-accent"
                        />
                        <span>章</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2000"
                      step="1"
                      value={outlineChapterCount}
                      onChange={(e) => setOutlineChapterCount(Number(e.target.value))}
                      className="w-full h-2 bg-max-surface-alt rounded-lg appearance-none cursor-pointer accent-max-accent"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleGenerateOutline}
                    disabled={isGenerating || outlineOptimizeRunning}
                    className="w-full py-3 bg-max-accent text-white rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-max-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        正在生成大纲...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        开始生成大纲
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-max-text-muted">大纲优化器</h3>
                  {outlineOptimizeRunning && (
                    <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                      进行中 第 {outlineOptimizeCurrentRound} 轮
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-max-text-muted">优化侧重点</label>
                  <input
                    type="text"
                    value={outlineOptimizeFocus}
                    onChange={(e) => setOutlineOptimizeFocus(e.target.value)}
                    className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent transition-all"
                    placeholder="例如：结构完整性、节奏、爽点分布"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-max-text-muted mb-1">目标分数</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={outlineOptimizeTargetScore}
                      onChange={(e) => setOutlineOptimizeTargetScore(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-max-text-muted mb-1">最多轮次</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={outlineOptimizeMaxRounds}
                      onChange={(e) => setOutlineOptimizeMaxRounds(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOptimizeOutline}
                    disabled={outlineOptimizeRunning || isGenerating}
                    className="flex-1 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-60 shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                  >
                    {outlineOptimizeRunning ? <><RefreshCw className="w-3 h-3 animate-spin" /> 循环优化中...</> : <><Play className="w-3 h-3" /> 开始优化</>}
                  </button>
                  <button
                    onClick={() => {
                      setOutlineOptimizeRounds([]);
                      setOutlineOptimizeError('');
                      setOutlineOptimizeCurrentRound(0);
                    }}
                    className="px-3 py-2 text-xs font-bold bg-max-surface text-max-text-muted rounded-lg hover:bg-max-surface-alt hover:text-max-text transition-colors border border-max-border"
                  >
                    清空记录
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 max-panel rounded-xl p-5 border border-max-border bg-max-bg flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-max-text">大纲输出</h2>
              <span className="text-xs text-max-text-muted">{outlineResult.length} 字</span>
            </div>
            {activeSection === 'generate' && error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-3">
                {error}
              </div>
            )}
            {activeSection === 'optimize' && outlineOptimizeError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-3">
                {outlineOptimizeError}
              </div>
            )}
            <textarea
              value={outlineResult}
              onChange={(e) => setOutlineResult(e.target.value)}
              className="flex-1 w-full px-3 py-3 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent resize-none custom-scrollbar placeholder:text-max-text-muted/50 font-mono"
              placeholder="这里将显示生成的大纲内容..."
            />
            {activeSection === 'optimize' && outlineOptimizeRounds.length > 0 && (
              <div className="mt-4 space-y-3 max-h-56 overflow-y-auto custom-scrollbar">
                {outlineOptimizeRounds.map((item) => (
                  <div key={item.round} className="bg-max-surface border border-max-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-max-text-muted">
                      <span>第 {item.round} 轮评分</span>
                      <span className="text-green-400 font-bold text-sm">{item.score} 分</span>
                    </div>
                    <div className="text-xs text-max-text-muted whitespace-pre-wrap leading-relaxed">{item.feedback || '暂无评审建议'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPromptManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-max-bg border border-max-border rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <Module10Manager
              initialModuleId="module_max_outline"
              onSelectPrompt={(content) => {
                setOutlineParadigm(content);
                setShowPromptManager(false);
              }}
              onClose={() => setShowPromptManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
