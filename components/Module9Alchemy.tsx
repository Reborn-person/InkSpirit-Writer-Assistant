'use client';

import { useState, useEffect } from 'react';
import { generateAIContentStream } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { PROMPTS } from '@/lib/prompts';
import { Loader2, Wand2, Play, CheckCircle2, FlaskConical, Trophy, FileJson, Upload, ChevronRight, ChevronDown, Copy, Settings2, Link as LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 默认的评审提示词
const DEFAULT_REVIEWER_PROMPT = `你是专业的AI内容质量评审员。
你的任务是根据用户的“原始需求”，评估由不同提示词生成的“AI输出内容”的质量。

【用户原始需求】：
{userRequirement}

【待评审内容】：
(见用户输入)

请从以下维度进行专业打分（1-10分）和点评：
1. **指令遵循度**：内容是否完美执行了用户的核心意图？
2. **内容质量**：文笔、逻辑、创意是否出色？
3. **格式规范性**：结构是否清晰，是否符合一般阅读或使用习惯？

输出格式：
### 评分：
- 遵循度：X
- 质量：X
- 规范：X
**总分：X**

### 简评：
（一句话概括优点和缺点）

### 改进方向：
（针对生成该内容的提示词，指出可能需要加强的约束或引导）`;

// 默认的提示词生成专家提示词
const PROMPT_ENGINEER_SYSTEM = `你是世界顶级的提示词工程师（Prompt Engineer）。
你的任务是根据用户的“简要需求”，设计一个结构严谨、逻辑清晰、效果卓越的 ChatGPT/Claude/DeepSeek 提示词（System Prompt）。
请使用 Markdown 格式，包含 Role, Skills, Constraints, Workflow, Output Format 等模块。`;

interface ModelConfig {
  id: string;
  name: string;
  model: string;
}

const AVAILABLE_MODELS = [
  'deepseek-ai/DeepSeek-V3.2',
  'deepseek-ai/DeepSeek-R1',
  'moonshotai/Kimi-K2-Thinking',
  'zai-org/GLM-4.6V',
  'zai-org/GLM-4.6',
  'moonshotai/Kimi-K2-Instruct-0905',
  'Qwen/Qwen3-VL-235B-A22B-Thinking'
];

export default function Module9Alchemy() {
  // 状态：模型选择
  const [genModel1, setGenModel1] = useState('deepseek-ai/DeepSeek-R1');
  const [genModel2, setGenModel2] = useState('deepseek-ai/DeepSeek-V3.2');
  const [executionModel, setExecutionModel] = useState('deepseek-ai/DeepSeek-V3.2');
  const [reviewerModel, setReviewerModel] = useState('deepseek-ai/DeepSeek-V3.2');

  // 状态：输入与输出
  const [userRequirement, setUserRequirement] = useState('');
  const [testContext, setTestContext] = useState('');
  
  const [prompt1, setPrompt1] = useState('');
  const [prompt2, setPrompt2] = useState('');
  
  const [content1, setContent1] = useState('');
  const [content2, setContent2] = useState('');
  
  const [review1, setReview1] = useState('');
  const [review2, setReview2] = useState('');

  const [reviewerSystemPrompt, setReviewerSystemPrompt] = useState(DEFAULT_REVIEWER_PROMPT);
  const [showReviewerPromptEdit, setShowReviewerPromptEdit] = useState(false);
  
  // 状态：联动模块选择
  const [targetModule, setTargetModule] = useState<string>('');

  // 状态：加载中
  const [loading, setLoading] = useState(false); // 全流程加载

  // 加载保存的数据
  useEffect(() => {
    const savedReq = StorageManager.get('module9_requirement');
    if (savedReq) setUserRequirement(savedReq);
    
    const savedReviewerPrompt = StorageManager.get('module9_reviewer_prompt');
    if (savedReviewerPrompt) setReviewerSystemPrompt(savedReviewerPrompt);
    
    const savedTargetModule = StorageManager.get('module9_target_module');
    if (savedTargetModule) setTargetModule(savedTargetModule);
  }, []);

  // 保存数据
  const handleRequirementChange = (v: string) => {
    setUserRequirement(v);
    StorageManager.set('module9_requirement', v);
  };
  
  const handleTargetModuleChange = (v: string) => {
      setTargetModule(v);
      StorageManager.set('module9_target_module', v);
      
      // Auto-fill requirement from module description if empty
      if (v && !userRequirement && PROMPTS[v as keyof typeof PROMPTS]) {
          const m = PROMPTS[v as keyof typeof PROMPTS];
          const autoReq = `请为【${m.title}】设计一个优质的系统提示词。\n该模块的主要功能是：${m.description}\n\n请参考该模块现有的提示词逻辑，但进行大幅优化和升级。`;
          handleRequirementChange(autoReq);
      }
  };

  const handleReviewerPromptChange = (v: string) => {
    setReviewerSystemPrompt(v);
    StorageManager.set('module9_reviewer_prompt', v);
  };

  // 一键生成并评审
  const handleGenerateAndReview = async () => {
    if (!userRequirement.trim()) return alert('请输入提示词需求');
    
    setLoading(true);
    setPrompt1('');
    setPrompt2('');
    setContent1('');
    setContent2('');
    setReview1('');
    setReview2('');
    
    // INTERNAL API KEY - HIDDEN FROM USER
    // 这是一个硬编码的内部 API Key，用户在界面上看不到，且优先于设置页面的 Key 使用
    const INTERNAL_API_KEY = "sk-piqxietpiwammaznuapgeodmjlionbxlmlnrcyqfvbwionnj"; 
    
    // 优先使用内部硬编码 Key，如果没有则回退到用户设置的 Key
    // 注意：trim() 去除可能的空白字符
    const apiKey = (INTERNAL_API_KEY && INTERNAL_API_KEY.trim().startsWith("sk-")) 
        ? INTERNAL_API_KEY.trim() 
        : (StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '');
        
    // 如果使用了内部硬编码的 Key，强制使用 SiliconFlow 的 BaseURL
    // 否则，使用用户设置的 BaseURL (如果也没有，则默认 SiliconFlow)
    const isUsingInternalKey = apiKey === INTERNAL_API_KEY.trim();
    const baseUrl = isUsingInternalKey 
        ? 'https://api.siliconflow.cn/v1' 
        : (StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1');

    console.log("Using API Key:", apiKey.substring(0, 10) + "..."); // Debug log (safe)
    console.log("Using Base URL:", baseUrl);

    if (!apiKey) {
        alert('请先在设置页面配置 API Key (推荐在“写作模型”一栏配置)');
        setLoading(false);
        return;
    }

    try {
        // Step 1: Generate Prompts (Model 1 & 2)
        const p1 = generateAIContentStream(apiKey, PROMPT_ENGINEER_SYSTEM, `用户需求：${userRequirement}\n请设计方案A（侧重结构化与逻辑）。`, baseUrl, genModel1, setPrompt1);
        const p2 = generateAIContentStream(apiKey, PROMPT_ENGINEER_SYSTEM, `用户需求：${userRequirement}\n请设计方案B（侧重创意与发散）。`, baseUrl, genModel2, setPrompt2);
        
        const [resPrompt1, resPrompt2] = await Promise.all([p1, p2]);
        
        // Step 2: Generate Content (Execution Model)
        // Use user provided test context OR fallback to userRequirement as context
        const context = testContext.trim() || `请根据你的设定，生成一段符合要求的示例内容。\n\n背景/要求：${userRequirement}`;
        
        const c1 = generateAIContentStream(apiKey, resPrompt1, context, baseUrl, executionModel, setContent1);
        const c2 = generateAIContentStream(apiKey, resPrompt2, context, baseUrl, executionModel, setContent2);
        
        const [resContent1, resContent2] = await Promise.all([c1, c2]);

        // Step 3: Auto Review Content (Reviewer Model)
        const dynamicReviewerPrompt = reviewerSystemPrompt.replace('{userRequirement}', userRequirement);
        
        const r1 = generateAIContentStream(apiKey, dynamicReviewerPrompt, `【待评审生成内容】\n${resContent1}`, baseUrl, reviewerModel, setReview1);
        const r2 = generateAIContentStream(apiKey, dynamicReviewerPrompt, `【待评审生成内容】\n${resContent2}`, baseUrl, reviewerModel, setReview2);
        
        await Promise.all([r1, r2]);

    } catch (e: any) {
        alert('执行出错: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  // 导入评审提示词
  const handleImportReviewerPrompt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        const text = ev.target?.result as string;
        // 尝试解析JSON
        try {
            const json = JSON.parse(text);
            if (json.systemPrompt) setReviewerSystemPrompt(json.systemPrompt);
            else if (json.content) setReviewerSystemPrompt(json.content);
            else setReviewerSystemPrompt(text); // 纯文本
        } catch {
            setReviewerSystemPrompt(text); // 纯文本
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  // 应用提示词到目标模块
  const handleApplyToModule = (promptContent: string) => {
      if (!targetModule) return alert('请先选择要应用到的目标模块');
      
      const moduleTitle = PROMPTS[targetModule as keyof typeof PROMPTS]?.title.split('：')[0];
      const templateTitle = `炼金工坊生成 (${new Date().toLocaleDateString()})`;

      if (confirm(`确定要将此提示词保存到【${moduleTitle}】吗？\n它将作为一个新的提示词模板保存，并自动选中。`)) {
          // 1. 获取目标模块现有的模板列表
          const existingTemplatesStr = StorageManager.getJSON(`prompt_templates_${targetModule}`);
          let existingTemplates: any[] = [];
          if (existingTemplatesStr && Array.isArray(existingTemplatesStr)) {
              existingTemplates = existingTemplatesStr;
          } else {
              existingTemplates = [];
          }

          // 2. 创建新模板
          const newTemplate = {
              id: Date.now().toString(),
              title: templateTitle,
              content: promptContent,
              lastModified: Date.now(),
              isDefault: false
          };

          // 3. 保存更新后的模板列表
          const updatedTemplates = [...existingTemplates, newTemplate];
          StorageManager.setJSON(`prompt_templates_${targetModule}`, updatedTemplates);

          // 4. 自动选中新模板
          StorageManager.set(`custom_prompt_${targetModule}`, promptContent);
          StorageManager.setJSON(`selected_prompt_ids_${targetModule}`, [newTemplate.id]);

          alert(`成功！\n已在【${moduleTitle}】中创建了名为“${templateTitle}”的新模板，并已自动为您选中。`);
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 space-y-8 pb-20">
      {/* 顶部：需求输入 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <FlaskConical className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">提示词炼金工坊</h1>
                    <p className="text-sm text-gray-500">双模型对抗生成 + 独立评审，打造最强 Prompt</p>
                </div>
            </div>
            
            {/* 目标模块选择器 */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">炼制目标：</span>
                <select 
                    value={targetModule}
                    onChange={(e) => handleTargetModuleChange(e.target.value)}
                    className="text-sm bg-transparent border-none outline-none text-gray-900 font-medium cursor-pointer min-w-[150px]"
                >
                    <option value="">-- 通用 / 不指定 --</option>
                    {Object.entries(PROMPTS)
                        .filter(([k]) => !['module7', 'module9', 'module10'].includes(k)) // 排除特殊模块
                        .map(([key, config]) => (
                        <option key={key} value={key}>{config.title.split('：')[0]}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">你的需求 (Prompt Goal)</label>
                <textarea 
                    value={userRequirement}
                    onChange={(e) => handleRequirementChange(e.target.value)}
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    placeholder="例如：写一个能生成克苏鲁风格短篇小说的提示词，要求包含环境描写和san值掉落机制..."
                />
            </div>
            
            <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">生成模型 A</span>
                    <select 
                        value={genModel1} 
                        onChange={(e) => setGenModel1(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 outline-none"
                    >
                        {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m.split('/').pop()}</option>)}
                    </select>
                </div>
                <div className="text-gray-300">VS</div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">生成模型 B</span>
                    <select 
                        value={genModel2} 
                        onChange={(e) => setGenModel2(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 outline-none"
                    >
                        {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m.split('/').pop()}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">执行模型</span>
                    <select 
                        value={executionModel} 
                        onChange={(e) => setExecutionModel(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 outline-none"
                    >
                        {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m.split('/').pop()}</option>)}
                    </select>
                </div>
                
                <div className="flex-1 text-right">
                    <button 
                        onClick={handleGenerateAndReview}
                        disabled={loading || !userRequirement}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 ml-auto"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        一键炼制与评审
                    </button>
                </div>
            </div>
            
            {/* 评审设置折叠区 */}
            <div className="border rounded-lg p-3 bg-gray-50">
                <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowReviewerPromptEdit(!showReviewerPromptEdit)}
                >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Settings2 className="w-4 h-4" />
                        评审模型设置 ({reviewerModel.split('/').pop()})
                    </div>
                    {showReviewerPromptEdit ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </div>
                
                {showReviewerPromptEdit && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">评审模型</span>
                            <select 
                                value={reviewerModel} 
                                onChange={(e) => setReviewerModel(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 outline-none flex-1"
                            >
                                {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m.split('/').pop()}</option>)}
                            </select>
                            <div className="relative">
                                <input type="file" accept=".json,.txt" onChange={handleImportReviewerPrompt} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <button className="text-xs flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
                                    <Upload className="w-3 h-3" /> 导入评审标准
                                </button>
                            </div>
                        </div>
                        <textarea 
                            value={reviewerSystemPrompt}
                            onChange={(e) => handleReviewerPromptChange(e.target.value)}
                            className="w-full h-32 p-2 text-xs border border-gray-300 rounded font-mono"
                            placeholder="评审模型的 System Prompt..."
                        />
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左侧：方案 A */}
        <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                <div className="p-3 border-b border-gray-100 bg-blue-50/50 rounded-t-xl flex justify-between items-center">
                    <span className="font-semibold text-blue-800">方案 A (由 {genModel1.split('/').pop()} 生成)</span>
                    <div className="flex items-center gap-1">
                        {targetModule && (
                            <button 
                                onClick={() => handleApplyToModule(prompt1)}
                                className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                                title={`应用到 ${PROMPTS[targetModule as keyof typeof PROMPTS]?.title.split('：')[0]}`}
                            >
                                <LinkIcon className="w-3 h-3" /> 应用
                            </button>
                        )}
                        <button onClick={() => navigator.clipboard.writeText(prompt1)} className="p-1 hover:bg-white rounded"><Copy className="w-4 h-4 text-gray-500"/></button>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto prose prose-sm max-w-none custom-scrollbar">
                    {prompt1 ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt1}</ReactMarkdown> : <div className="text-gray-300 text-center mt-20">等待炼制...</div>}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-[300px] flex flex-col">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                    A 的生成演示 (By {executionModel.split('/').pop()})
                </h3>
                <div className="flex-1 overflow-y-auto prose prose-sm max-w-none custom-scrollbar bg-white p-3 rounded border border-gray-100">
                    {content1 ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content1}</ReactMarkdown> : <span className="text-gray-400">等待生成...</span>}
                </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 h-[300px] flex flex-col">
                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    A 的评审报告
                </h3>
                <div className="flex-1 overflow-y-auto prose prose-sm max-w-none custom-scrollbar">
                    {review1 ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{review1}</ReactMarkdown> : <span className="text-gray-400">等待评审...</span>}
                </div>
            </div>
        </div>

        {/* 右侧：方案 B */}
        <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                <div className="p-3 border-b border-gray-100 bg-indigo-50/50 rounded-t-xl flex justify-between items-center">
                    <span className="font-semibold text-indigo-800">方案 B (由 {genModel2.split('/').pop()} 生成)</span>
                    <div className="flex items-center gap-1">
                        {targetModule && (
                            <button 
                                onClick={() => handleApplyToModule(prompt2)}
                                className="text-xs bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 flex items-center gap-1"
                                title={`应用到 ${PROMPTS[targetModule as keyof typeof PROMPTS]?.title.split('：')[0]}`}
                            >
                                <LinkIcon className="w-3 h-3" /> 应用
                            </button>
                        )}
                        <button onClick={() => navigator.clipboard.writeText(prompt2)} className="p-1 hover:bg-white rounded"><Copy className="w-4 h-4 text-gray-500"/></button>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto prose prose-sm max-w-none custom-scrollbar">
                    {prompt2 ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt2}</ReactMarkdown> : <div className="text-gray-300 text-center mt-20">等待炼制...</div>}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-[300px] flex flex-col">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                    B 的生成演示 (By {executionModel.split('/').pop()})
                </h3>
                <div className="flex-1 overflow-y-auto prose prose-sm max-w-none custom-scrollbar bg-white p-3 rounded border border-gray-100">
                    {content2 ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content2}</ReactMarkdown> : <span className="text-gray-400">等待生成...</span>}
                </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 h-[300px] flex flex-col">
                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    B 的评审报告
                </h3>
                <div className="flex-1 overflow-y-auto prose prose-sm max-w-none custom-scrollbar">
                    {review2 ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{review2}</ReactMarkdown> : <span className="text-gray-400">等待评审...</span>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
