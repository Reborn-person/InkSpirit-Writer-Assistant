'use client';

import { useState, useEffect, useRef } from 'react';
import { generateContent } from '@/lib/ai';
import { Wand2, Settings, Book, User, Edit, Loader2, Save } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

// Types for our context
interface EditorContext {
  outline: string;
  detailedOutline: string;
  style: string;
  characters: string;
}

export default function Module7Editor() {
  const [content, setContent] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictionLength, setPredictionLength] = useState(50);
  
  // Context State
  const [context, setContext] = useState<EditorContext>({
    outline: '',
    detailedOutline: '',
    style: '',
    characters: ''
  });
  
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const prevLenRef = useRef<number>(0);
  const typedSinceRef = useRef<number>(0);

  // Load context from previous modules on mount
  useEffect(() => {
    const savedOutline = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2')) || '';
    const savedDetailed = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2_5')) || '';
    const savedModule1 = StorageManager.getJSON(STORAGE_KEYS.MODULE_INPUT('module1')) || {};
    
    // Try to extract characters/style if possible, or just use raw text
    setContext({
      outline: savedOutline,
      detailedOutline: savedDetailed,
      style: savedModule1.style || '',
      characters: savedModule1.elements || '' // Simple fallback
    });
    
    // Load saved content if any
    const savedDraft = StorageManager.get(STORAGE_KEYS.MODULE7_CONTENT);
    if (savedDraft) setContent(savedDraft);
    prevLenRef.current = savedDraft ? savedDraft.length : 0;
  }, []);

  // Save content on change
  useEffect(() => {
    StorageManager.set(STORAGE_KEYS.MODULE7_CONTENT, content);
  }, [content]);

  const overlapRatio = (a: string, b: string) => {
    const A = a.slice(-20);
    const B = b.slice(0, 20);
    const maxK = Math.min(A.length, B.length);
    let best = 0;
    for (let k = maxK; k >= 1; k--) {
      if (A.slice(-k) === B.slice(0, k)) {
        best = k;
        break;
      }
    }
    return best / Math.max(1, Math.min(20, B.length));
  };

  const maybePredictAfterThreshold = (text: string) => {
    if (typedSinceRef.current >= 15) {
      const similar = suggestion ? overlapRatio(text, suggestion) >= 0.6 : false;
      if (!similar) {
        fetchPrediction(text);
      }
      typedSinceRef.current = 0;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    const delta = Math.max(0, newText.length - prevLenRef.current);
    typedSinceRef.current += delta;
    prevLenRef.current = newText.length;
    maybePredictAfterThreshold(newText);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (newText.length > 10) {
        debounceTimer.current = setTimeout(() => {
            const similar = suggestion ? overlapRatio(newText, suggestion) >= 0.6 : false;
            if (!similar) fetchPrediction(newText);
        }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        const merged = content + suggestion;
        setContent(merged);
        setSuggestion('');
        prevLenRef.current = merged.length;
        typedSinceRef.current = 0;
    }
  };

  const fetchPrediction = async (currentText: string) => {
    setLoading(true);
    try {
        const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3'; // Use writing model for prediction

        // Construct the prompt using RAG context + Current Text
        // We act as the "RAG" part here by assembling the prompt manually
        const systemPrompt = `你是一个智能网文写作助手（Copilot）。
你的任务是根据上下文续写小说内容。
续写要求：
1. 风格基调：${context.style}
2. 严格贴合大纲：${context.outline.substring(0, 500)}...
3. 续写长度：约 ${predictionLength} 字
4. 仅输出续写的内容，不要包含任何解释或重复前文。`;

        const userPrompt = `前文内容：
${currentText.slice(-1000)}

请续写：`;

        const pred = await generateContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
        if (pred) {
            setSuggestion(pred);
        }
    } catch (error) {
        console.error("Prediction failed:", error);
    } finally {
        setLoading(false);
    }
  };

  const manualTrigger = () => {
      fetchPrediction(content);
      typedSinceRef.current = 0;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col p-6 h-full">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Edit className="w-6 h-6 text-blue-600" />
                    AI 辅助写作 (Module 7)
                </h1>
                <p className="text-sm text-gray-500">Copilot 模式：打字暂停自动续写，按 Tab 键采纳</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
                >
                    <Settings className="w-4 h-4" />
                    上下文配置 (7.1)
                </button>
                <button 
                    onClick={manualTrigger}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    立即预测
                </button>
            </div>
        </div>

        <div className="flex-1 relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-6 text-lg leading-relaxed resize-none outline-none font-serif"
                placeholder="开始你的创作..."
                spellCheck={false}
            />
            {/* Suggestion Overlay - Simple Implementation */}
            {suggestion && (
                <div className="absolute bottom-6 right-6 max-w-md p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-xs text-blue-500 font-bold mb-1 flex justify-between">
                        <span>AI 建议 (按 Tab 采纳)</span>
                        <button onClick={() => setSuggestion('')} className="hover:text-blue-700">✕</button>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{suggestion}</p>
                </div>
            )}
        </div>
      </div>

      {/* Context Panel (Module 7.1) - Slide Over */}
      {isContextPanelOpen && (
        <div className="w-96 bg-white border-l border-gray-200 h-full overflow-y-auto p-6 shadow-xl transition-transform">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">上下文管理 (7.1)</h2>
                <button onClick={() => setIsContextPanelOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-6">
                {/* Prediction Settings */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">预测字数: {predictionLength}</label>
                    <input 
                        type="range" 
                        min="20" 
                        max="200" 
                        step="10" 
                        value={predictionLength}
                        onChange={(e) => setPredictionLength(parseInt(e.target.value))}
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Book className="w-4 h-4" /> 全书大纲 (Module 2)
                    </label>
                    <textarea 
                        value={context.outline}
                        onChange={(e) => setContext({...context, outline: e.target.value})}
                        className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Book className="w-4 h-4" /> 详细细纲 (Module 2.5)
                    </label>
                    <textarea 
                        value={context.detailedOutline}
                        onChange={(e) => setContext({...context, detailedOutline: e.target.value})}
                        className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Wand2 className="w-4 h-4" /> 风格基调
                    </label>
                    <input 
                        type="text"
                        value={context.style}
                        onChange={(e) => setContext({...context, style: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" /> 人物/核心元素
                    </label>
                    <textarea 
                        value={context.characters}
                        onChange={(e) => setContext({...context, characters: e.target.value})}
                        className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        提示：此处修改的上下文仅影响当前编辑器的 AI 预测，不会反向修改前面模块的生成结果。
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
