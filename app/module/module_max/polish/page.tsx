'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { generateAIContent } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { APIConfigValidator } from '@/lib/api-validator';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { Copy, Check, Sparkles, RefreshCw, Play } from 'lucide-react';

export default function MaxPolishPage() {
  const [maxPolishCurrentRound, setMaxPolishCurrentRound] = useState(0);
  const { registerPageSkill, unregisterPageSkill, registerEditor, unregisterEditor, isAiOpen } = useEditorAgent();
  const pathname = usePathname();
  const isMaxMainPage = pathname === '/module/module_max';
  const isMaxIdeaPage = pathname === '/module/module_max/idea';
  const isMaxDismantlePage = pathname === '/module/module_max/dismantle';
  const isMaxCreationPage = pathname === '/module/module_max/creation';
  const isMaxPolishPage = pathname === '/module/module_max/polish';
  const isMaxOutlinePage = pathname === '/module/module_max/outline';

  const [maxPolishInput, setMaxPolishInput] = useState('');
  const maxPolishInputRef = useRef(maxPolishInput);
  useEffect(() => { maxPolishInputRef.current = maxPolishInput; }, [maxPolishInput]);

  const [maxPolishFocus, setMaxPolishFocus] = useState('节奏、语言、画面感');
  const [maxPolishTargetScore, setMaxPolishTargetScore] = useState(8);
  const [maxPolishMaxRounds, setMaxPolishMaxRounds] = useState(3);
  const [maxPolishRunning, setMaxPolishRunning] = useState(false);
  const [maxPolishError, setMaxPolishError] = useState('');
  const [maxPolishRounds, setMaxPolishRounds] = useState<{ round: number; score: number; feedback: string; text: string }[]>([]);
  const [maxPolishResult, setMaxPolishResult] = useState('');
  const [activeTab, setActiveTab] = useState<'polish' | 'prompt_gen'>('polish');
  
  // Prompt Generator State
  const [promptInput, setPromptInput] = useState('');
  const [promptType, setPromptType] = useState('世界观');
  const [promptResult, setPromptResult] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const evalStandard = [
    '结构与逻辑：段落组织清晰，因果合理，无明显逻辑断裂。',
    '节奏与张力：起伏分明，关键情节有张力推进。',
    '语言表现：用词准确，句式多样，读感顺畅。',
    '画面与细节：场景与动作具象，细节有效支撑氛围。',
    '角色一致性：人物动机、语气与行为一致。',
    '可读性与爽点：读者预期与爽点落点清晰。'
  ];
  const defaultEvalTemplate = `{
  "score": 8,
  "feedback": "总体节奏良好，但第二段转折略快，建议补充过渡动作与心理描写。",
  "highlights": ["开篇悬念设置有效", "动作描写有力度"],
  "issues": ["第二段转折过快", "人物动机交代不足"],
  "suggestions": ["补充主角心理变化", "加强场景细节衔接"]
}`;
  const [evalTemplate, setEvalTemplate] = useState(defaultEvalTemplate);

  // Persistence: Load state on mount
  useEffect(() => {
    const savedTemplate = StorageManager.get(STORAGE_KEYS.MAX_POLISH_EVAL_TEMPLATE);
    if (savedTemplate) setEvalTemplate(savedTemplate);

    const savedState = StorageManager.getJSON(STORAGE_KEYS.MAX_POLISH_STATE);
    if (savedState) {
      if (savedState.input) setMaxPolishInput(savedState.input);
      if (savedState.focus) setMaxPolishFocus(savedState.focus);
      if (savedState.targetScore) setMaxPolishTargetScore(savedState.targetScore);
      if (savedState.maxRounds) setMaxPolishMaxRounds(savedState.maxRounds);
      if (savedState.rounds && Array.isArray(savedState.rounds)) setMaxPolishRounds(savedState.rounds);
      if (savedState.result) setMaxPolishResult(savedState.result);
    }

    const savedPromptState = StorageManager.getJSON(STORAGE_KEYS.MAX_POLISH_PROMPT_STATE);
    if (savedPromptState) {
        if (savedPromptState.input) setPromptInput(savedPromptState.input);
        if (savedPromptState.type) setPromptType(savedPromptState.type);
        if (savedPromptState.result) setPromptResult(savedPromptState.result);
    }
  }, []);

  // Persistence: Save polish state on change
  useEffect(() => {
    StorageManager.setJSON(STORAGE_KEYS.MAX_POLISH_STATE, {
      input: maxPolishInput,
      focus: maxPolishFocus,
      targetScore: maxPolishTargetScore,
      maxRounds: maxPolishMaxRounds,
      rounds: maxPolishRounds,
      result: maxPolishResult
    });
  }, [maxPolishInput, maxPolishFocus, maxPolishTargetScore, maxPolishMaxRounds, maxPolishRounds, maxPolishResult]);

  // Persistence: Save prompt state on change
  useEffect(() => {
      StorageManager.setJSON(STORAGE_KEYS.MAX_POLISH_PROMPT_STATE, {
          input: promptInput,
          type: promptType,
          result: promptResult
      });
  }, [promptInput, promptType, promptResult]);

  const handleGeneratePrompt = async () => {
      if (!promptInput.trim()) {
          alert('请输入简单的想法或关键词');
          return;
      }
      
      const { apiKey, baseUrl, model, validation } = getBigModelConfig();
      if (!validation.valid) {
          alert(`模型配置错误：${validation.errors.join('，')}`);
          return;
      }

      setIsGeneratingPrompt(true);
      const systemPrompt = "你是专业的Midjourney/Stable Diffusion提示词工程师，擅长将简单的中文描述转化为高质量的英文提示词。";
      const userPrompt = `任务：基于用户输入生成高质量的AI绘画提示词。
      类型：${promptType}
      用户输入：${promptInput}
      要求：
      1. 输出一段完整的英文Prompt。
      2. 包含画面主体、艺术风格、光影、构图、渲染质量等关键词。
      3. 格式：(Subject), (Art Style), (Environment), (Lighting), (Camera), (Render Quality) --ar 16:9
      4. 仅输出Prompt内容，不要解释。`;

      try {
          const result = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
          setPromptResult(result);
      } catch (error: any) {
          alert(`生成失败: ${error.message}`);
      } finally {
          setIsGeneratingPrompt(false);
      }
  };

  const getBigModelConfig = () => {
    const apiKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
    const baseUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
    const model = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL) || 'deepseek-ai/DeepSeek-V3';
    const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
    return { apiKey, baseUrl, model, validation };
  };

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

    const { apiKey, baseUrl, model, validation } = getBigModelConfig();
    if (!validation.valid) {
      setMaxPolishError(`大文本模型配置错误：${validation.errors.join('，')}`);
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
评分标准：
${evalStandard.map((item, index) => `${index + 1}. ${item}`).join('\n')}
输出模板：
${evalTemplate}
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

  const handleMaxPageSkill = useCallback(async (payload: { action: string; value?: any }) => {
    if (!payload || typeof payload.action !== 'string') return;
    const action = payload.action;
    if (action === 'set_input') {
      setMaxPolishInput(String(payload.value ?? ''));
      return;
    }
    if (action === 'append_input') {
      const current = maxPolishInputRef.current;
      const next = current ? `${current}\n${String(payload.value ?? '')}` : String(payload.value ?? '');
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
  }, [handleMaxPolishLoop]);

  useEffect(() => {
    registerPageSkill('page_control', handleMaxPageSkill);
    
    registerEditor('module_max_polish', {
        getContent: () => maxPolishInputRef.current,
        setContent: (text) => setMaxPolishInput(text),
        insertText: (text) => setMaxPolishInput(prev => prev + text),
        getSelection: () => ({ start: 0, end: 0 }),
        setSelection: () => {},
        focus: () => {}
    });

    return () => {
      unregisterEditor('module_max_polish');
      unregisterPageSkill('page_control');
    };
  }, [handleMaxPageSkill, registerPageSkill, unregisterPageSkill, registerEditor, unregisterEditor]);

  return (
    <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-[#18181b] text-gray-300 font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
      
      {/* Top Bar */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#18181b] shrink-0 z-20">
          <div className="flex items-center gap-4">
              <div className="flex bg-[#27272a] rounded-lg p-1">
                  <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxMainPage ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>MAX 主页</Link>
                  <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxIdeaPage ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>脑洞风暴</Link>
                  <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxDismantlePage ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>拆书</Link>
                  <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxOutlinePage ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>大纲生成</Link>
                  <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxCreationPage ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>万字冲刺</Link>
                  <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxPolishPage ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>自循环</Link>
              </div>
              <div className="h-4 w-[1px] bg-white/10"></div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-green-500" />
                  自循环创作中心
              </h1>
          </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Tab Navigation */}
          <div className="flex max-panel rounded-xl p-1 shadow-sm w-fit bg-[#27272a] border border-white/5">
              <button onClick={() => setActiveTab('polish')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'polish' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                  <RefreshCw className="w-3 h-3 inline-block mr-1.5 mb-0.5"/>文章自循环
              </button>
              <button onClick={() => setActiveTab('prompt_gen')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'prompt_gen' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                  <Sparkles className="w-3 h-3 inline-block mr-1.5 mb-0.5"/>绘图提示词
              </button>
          </div>

          {activeTab === 'polish' ? (
            <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-200">自循环润色</h2>
                  <p className="text-xs text-gray-500 mt-1">每一轮都会给出评分与可执行反馈，直至达到目标分数</p>
                </div>
                {maxPolishRunning && (
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full animate-pulse border border-green-500/20">
                    进行中 第 {maxPolishCurrentRound} 轮
                  </span>
                )}
              </div>

              {maxPolishError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-xs">
                  {maxPolishError}
                </div>
              )}

              <TextArea
                label="需要润色的正文"
                value={maxPolishInput}
                onChange={setMaxPolishInput}
                rows={8}
                placeholder="粘贴需要润色的文章内容"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="润色侧重点"
                  value={maxPolishFocus}
                  onChange={setMaxPolishFocus}
                  placeholder="例如：节奏、语言、画面感"
                />
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">目标分数</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxPolishTargetScore}
                    onChange={(e) => setMaxPolishTargetScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">最多轮次</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={maxPolishMaxRounds}
                    onChange={(e) => setMaxPolishMaxRounds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="bg-[#0f0f10] border border-white/10 rounded-lg p-4 space-y-3">
                <div className="text-xs font-bold text-gray-300">评分标准</div>
                <ul className="text-xs text-gray-500 space-y-1">
                  {evalStandard.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="text-xs font-bold text-gray-300">评价模板（可编辑）</div>
                <textarea
                  value={evalTemplate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setEvalTemplate(next);
                    StorageManager.set(STORAGE_KEYS.MAX_POLISH_EVAL_TEMPLATE, next);
                  }}
                  rows={7}
                  className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-[11px] text-gray-400 placeholder:text-gray-600 transition-all resize-y custom-scrollbar focus:border-purple-500/50"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleMaxPolishLoop}
                  disabled={maxPolishRunning}
                  className="px-6 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-60 shadow-lg shadow-green-900/20 flex items-center gap-2"
                >
                  {maxPolishRunning ? <><RefreshCw className="w-3 h-3 animate-spin"/> 循环润色中...</> : <><Play className="w-3 h-3"/> 开始循环润色</>}
                </button>
                <button
                  onClick={() => {
                    setMaxPolishRounds([]);
                    setMaxPolishResult('');
                    setMaxPolishError('');
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#27272a] text-gray-400 rounded-lg hover:bg-[#3f3f46] hover:text-white transition-colors border border-white/5"
                >
                  清空记录
                </button>
              </div>

              {maxPolishRounds.length > 0 && (
                <div className="space-y-3">
                  {maxPolishRounds.map((item) => (
                    <div key={item.round} className="bg-[#27272a] border border-white/5 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>第 {item.round} 轮评分</span>
                        <span className="text-green-400 font-bold text-sm">{item.score} 分</span>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">{item.feedback || '暂无评审建议'}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400">润色结果</label>
                <textarea
                  value={maxPolishResult}
                  onChange={(e) => setMaxPolishResult(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 placeholder:text-gray-600 transition-all resize-y custom-scrollbar focus:border-purple-500/50"
                  placeholder="润色完成后结果会显示在这里"
                />
              </div>
            </div>
          ) : (
            <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-200">绘图提示词生成器</h2>
                        <p className="text-xs text-gray-500 mt-1">输入简单中文描述，自动转化为 Midjourney / Stable Diffusion 高质量提示词</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <Input 
                                label="画面描述 (中文)" 
                                value={promptInput} 
                                onChange={setPromptInput} 
                                placeholder="例如：一个赛博朋克风格的少女站在雨夜的霓虹灯下"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-400 mb-1">类型</label>
                             <select 
                                value={promptType}
                                onChange={(e) => setPromptType(e.target.value)}
                                className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50 transition-all appearance-none"
                             >
                                 <option>世界观</option>
                                 <option>角色设计</option>
                                 <option>场景氛围</option>
                                 <option>物品道具</option>
                                 <option>插画封面</option>
                             </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleGeneratePrompt} 
                        disabled={isGeneratingPrompt}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:opacity-90 transition-all font-bold flex items-center justify-center gap-2 text-sm"
                    >
                        {isGeneratingPrompt ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                正在生成魔法咒语...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4"/> 生成提示词
                            </>
                        )}
                    </button>

                    {promptResult && (
                        <div className="mt-6 bg-[#27272a] rounded-xl p-6 border border-white/5 relative group">
                            <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500"/> 生成结果
                            </h3>
                            <div className="bg-[#09090b] p-4 rounded-lg border border-white/10 font-mono text-xs text-gray-300 break-all leading-relaxed">
                                {promptResult}
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(promptResult);
                                    alert('已复制到剪贴板');
                                }}
                                className="absolute top-4 right-4 p-2 bg-[#18181b] text-gray-400 rounded-lg hover:text-white hover:bg-[#3f3f46] transition-all border border-white/10"
                                title="复制"
                            >
                                <Copy className="w-3 h-3"/>
                            </button>
                        </div>
                    )}
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg focus:border-purple-500/50 outline-none text-xs text-gray-300 placeholder:text-gray-600 transition-all"
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label: string; value?: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg focus:border-purple-500/50 outline-none text-xs text-gray-300 placeholder:text-gray-600 transition-all resize-y custom-scrollbar"
        placeholder={placeholder}
      />
    </div>
  );
}
