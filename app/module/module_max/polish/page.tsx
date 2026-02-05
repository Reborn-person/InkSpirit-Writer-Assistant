'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { generateAIContent } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { APIConfigValidator } from '@/lib/api-validator';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';

export default function MaxPolishPage() {
  const pathname = usePathname();
  const { isAiOpen, setIsMaxMode, registerPageSkill, unregisterPageSkill } = useEditorAgent();

  const isMaxHome = pathname === '/module/module_max';
  const isMaxIdea = pathname === '/module/module_max/idea';
  const isMaxDismantle = pathname === '/module/module_max/dismantle';
  const isMaxOutline = pathname === '/module/module_max/outline';
  const isMaxCreation = pathname === '/module/module_max/creation';
  const isMaxPolish = pathname === '/module/module_max/polish';
  const isMaxConsistency = pathname === '/module/module_max/consistency';
  const isMaxHumanizer = pathname === '/module/module_max/humanizer';
  const isMaxGodMode = pathname === '/module/module_max/godmode';

  const [maxPolishInput, setMaxPolishInput] = useState('');
  const [maxPolishFocus, setMaxPolishFocus] = useState('节奏、语言、画面感');
  const [maxPolishTargetScore, setMaxPolishTargetScore] = useState(8);
  const [maxPolishMaxRounds, setMaxPolishMaxRounds] = useState(3);
  const [maxPolishRunning, setMaxPolishRunning] = useState(false);
  const [maxPolishError, setMaxPolishError] = useState('');
  const [maxPolishRounds, setMaxPolishRounds] = useState<{ round: number; score: number; feedback: string; text: string }[]>([]);
  const [maxPolishResult, setMaxPolishResult] = useState('');
  const [maxPolishCurrentRound, setMaxPolishCurrentRound] = useState(0);

  // Model Config
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
      provider: 'siliconflow',
      model: 'deepseek-ai/DeepSeek-V3',
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1'
  });

  const parsePolishScore = (raw: string) => {
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

  const handleMaxPolishLoop = async () => {
    setMaxPolishError('');
    if (!maxPolishInput.trim()) {
      setMaxPolishError('请先输入需要润色的正文');
      return;
    }

    const { apiKey, baseUrl, model } = modelConfig;
    if (!model) {
      setMaxPolishError('请先配置模型');
      return;
    }

    setMaxPolishRunning(true);
    setMaxPolishRounds([]);
    setMaxPolishResult('');
    setMaxPolishCurrentRound(0);

    let currentText = maxPolishInput.trim();
    let finalText = currentText;

    try {
      for (let round = 1; round <= maxPolishMaxRounds; round += 1) {
        setMaxPolishCurrentRound(round);
        const evalSystem = '你是资深网文编辑，擅长用清晰标准给文章打分并给出可执行修改建议。';
        const evalPrompt = `请仅输出 JSON，不要输出其他文字。
评分范围 1-10 分，必须包含 score 与 feedback 字段。
评审侧重点：${maxPolishFocus}
文章内容：
${currentText}`;

        const evalRaw = await generateAIContent(apiKey, evalSystem, evalPrompt, baseUrl, model);
        const { score, feedback } = parsePolishScore(evalRaw);
        setMaxPolishRounds((prev) => [...prev, { round, score, feedback, text: currentText }]);

        if (score >= maxPolishTargetScore) {
          finalText = currentText;
          break;
        }

        const improveSystem = '你是职业网文编辑，请根据评审意见对文章进行润色，保持剧情不变，只优化表达与节奏。';
        const improvePrompt = `根据以下反馈润色文章，只输出润色后的正文，不要输出解释或标题。
评审反馈：${feedback}
润色侧重点：${maxPolishFocus}
原文：
${currentText}`;

        const improved = await generateAIContent(apiKey, improveSystem, improvePrompt, baseUrl, model);
        currentText = improved.trim() || currentText;
        finalText = currentText;
      }

      setMaxPolishResult(finalText);
    } catch (error: any) {
      setMaxPolishError(error?.message || '循环润色失败');
    } finally {
      setMaxPolishRunning(false);
      setMaxPolishCurrentRound(0);
    }
  };

  // useEffect(() => {
  //   // Force enable Max Mode styles globally
  //   document.body.classList.add('max-mode');
  //   return () => {
  //     document.body.classList.remove('max-mode');
  //   };
  // }, []);

  const handleMaxPageSkill = useCallback(async (payload: { action: string; value?: any }) => {
    if (!payload || typeof payload.action !== 'string') return;
    const action = payload.action;
    if (action === 'set_input') {
      setMaxPolishInput(String(payload.value ?? ''));
      return;
    }
    if (action === 'append_input') {
      const next = maxPolishInput ? `${maxPolishInput}\n${String(payload.value ?? '')}` : String(payload.value ?? '');
      setMaxPolishInput(next);
      return;
    }
    if (action === 'set_focus') {
      setMaxPolishFocus(String(payload.value ?? ''));
      return;
    }
    if (action === 'set_target_score') {
      setMaxPolishTargetScore(Number(payload.value));
      return;
    }
    if (action === 'set_max_rounds') {
      setMaxPolishMaxRounds(Number(payload.value));
      return;
    }
    if (action === 'set_result') {
      setMaxPolishResult(String(payload.value ?? ''));
      return;
    }
    if (action === 'clear_result') {
      setMaxPolishRounds([]);
      setMaxPolishResult('');
      setMaxPolishError('');
      return;
    }
    if (action === 'run_polish') {
      await handleMaxPolishLoop();
    }
  }, [handleMaxPolishLoop, maxPolishInput]);

  useEffect(() => {
    setIsMaxMode(true);
    registerPageSkill('page_control', handleMaxPageSkill);
    return () => {
      unregisterPageSkill('page_control');
      setIsMaxMode(false);
    };
  }, [handleMaxPageSkill, registerPageSkill, setIsMaxMode, unregisterPageSkill]);

  return (
    <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-max-bg-alt text-max-text font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
      {/* Header */}
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
          <div className="h-4 w-px bg-max-border mx-2" />
          <h1 className="text-sm font-bold text-max-text flex items-center gap-2">
              <span className="text-lg font-bold text-max-text tracking-wider">MAX</span>
              <span className="text-xs text-max-accent font-medium px-1.5 py-0.5 bg-max-accent/10 rounded">自循环</span>
          </h1>
          <div className="ml-4">
              <ModelConfigPanel moduleKey="polish" onConfigChange={setModelConfig} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-max-surface border border-max-border rounded-xl p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-max-text mb-2">MAX 创作中心 · 自循环润色</h1>
            <p className="text-max-text-muted">系统会评审→润色→再评审，直到达到目标分数或轮次上限。</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Column */}
            <div className="space-y-4">
              <div className="bg-max-surface border border-max-border rounded-xl p-4 shadow-sm h-full flex flex-col">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-max-text">输入原文</h2>
                  <p className="text-xs text-max-text-muted mt-1">输入需要润色的段落或章节</p>
                </div>
                <textarea
                  className="w-full flex-1 bg-max-surface-alt border border-max-border rounded-lg p-4 text-max-text focus:outline-none focus:border-max-accent resize-none min-h-[400px]"
                  placeholder="在此粘贴原文..."
                  value={maxPolishInput}
                  onChange={(e) => setMaxPolishInput(e.target.value)}
                />
              </div>
            </div>

            {/* Controls & Output Column */}
            <div className="space-y-6">
               {/* Settings */}
               <div className="bg-max-surface border border-max-border rounded-xl p-4 shadow-sm">
                 <h2 className="text-lg font-semibold text-max-text mb-4">润色设置</h2>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs text-max-text-muted mb-1">侧重点</label>
                     <input
                       type="text"
                       className="w-full bg-max-surface-alt border border-max-border rounded px-3 py-2 text-sm text-max-text focus:outline-none focus:border-max-accent"
                       value={maxPolishFocus}
                       onChange={(e) => setMaxPolishFocus(e.target.value)}
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs text-max-text-muted mb-1">目标分数 (1-10)</label>
                       <input
                         type="number"
                         className="w-full bg-max-surface-alt border border-max-border rounded px-3 py-2 text-sm text-max-text focus:outline-none focus:border-max-accent"
                         value={maxPolishTargetScore}
                         onChange={(e) => setMaxPolishTargetScore(Number(e.target.value))}
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-max-text-muted mb-1">最大轮次</label>
                       <input
                         type="number"
                         className="w-full bg-max-surface-alt border border-max-border rounded px-3 py-2 text-sm text-max-text focus:outline-none focus:border-max-accent"
                         value={maxPolishMaxRounds}
                         onChange={(e) => setMaxPolishMaxRounds(Number(e.target.value))}
                       />
                     </div>
                   </div>
                   <button
                     onClick={handleMaxPolishLoop}
                     disabled={maxPolishRunning}
                     className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                       maxPolishRunning
                         ? 'bg-max-accent/20 text-max-accent-light cursor-not-allowed'
                         : 'bg-max-accent hover:opacity-90 text-white shadow-lg shadow-max-accent/20'
                     }`}
                   >
                     {maxPolishRunning ? `润色中 (第 ${maxPolishCurrentRound} 轮)...` : '开始自循环润色'}
                   </button>
                   {maxPolishError && (
                     <p className="text-xs text-red-400">{maxPolishError}</p>
                   )}
                 </div>
               </div>

               {/* Result */}
               {maxPolishResult && (
                 <div className="bg-max-surface border border-max-border rounded-xl p-4 shadow-sm">
                   <div className="flex items-center justify-between mb-2">
                     <h2 className="text-lg font-semibold text-max-text">最终结果</h2>
                     <button
                        onClick={() => {
                          navigator.clipboard.writeText(maxPolishResult);
                        }}
                        className="text-xs text-max-accent hover:text-max-accent-hover"
                     >
                       复制
                     </button>
                   </div>
                   <textarea
                     className="w-full bg-max-surface-alt border border-max-border rounded-lg p-4 text-max-text focus:outline-none resize-none min-h-[200px]"
                     readOnly
                     value={maxPolishResult}
                   />
                 </div>
               )}

               {/* Process Log */}
               {maxPolishRounds.length > 0 && (
                 <div className="bg-max-surface border border-max-border rounded-xl p-4 shadow-sm">
                   <h2 className="text-lg font-semibold text-max-text mb-4">执行记录</h2>
                   <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {maxPolishRounds.map((r, idx) => (
                       <div key={idx} className="bg-max-surface-alt border border-max-border rounded p-3 text-sm">
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-max-accent font-medium">第 {r.round} 轮</span>
                           <span className={`px-2 py-0.5 rounded text-xs ${r.score >= maxPolishTargetScore ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                             评分: {r.score}
                           </span>
                         </div>
                         <p className="text-max-text-muted text-xs">{r.feedback}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
