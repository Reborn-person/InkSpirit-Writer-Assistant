'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, MessageCircle, Loader2, Maximize2, Minimize2, Trash2, Settings2, Image as ImageIcon, Check, Download, ZoomIn } from 'lucide-react';
import { generateAIContent, generateAIContentStream, generateImage } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

const PROVIDER_MODELS = {
    'siliconflow': [
        'deepseek-ai/DeepSeek-V3',
        'deepseek-ai/DeepSeek-R1',
        'moonshotai/Kimi-K2-Thinking',
        'zai-org/GLM-4.6',
        'MiniMaxAI/MiniMax-M2',
        'zai-org/GLM-4.6V'
    ],
    'vectorengine': [
        'gpt-5.2',
        'doubao-seed-1-8-251228',
        'gemini-3-pro-preview-11-2025',
        'qwen-plus',
        'claude-opus-4-5-20251101'
    ],
    'alibaba': [
        'qwen-turbo',
        'qwen-plus',
        'qwen-max',
        'qwen-long'
    ],
    'openai': [
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
    ],
    'custom': [] // Custom provider allows manual entry or generic list if needed
};

export default function FloatingAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是墨灵写作助手。有什么我可以帮你的吗？\n你可以问我关于小说设定的问题，或者让我帮你润色一段文字。', id: 'init' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [currentModel, setCurrentModel] = useState('');
  const [currentProvider, setCurrentProvider] = useState('siliconflow');
  const [isImageMode, setIsImageMode] = useState(false);
  const [imageSize, setImageSize] = useState('1024x1024');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
     // Load initial model from storage
     const storedProvider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
     let storedModel = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || StorageManager.get(STORAGE_KEYS.WRITING_MODEL);
     
     // Validate stored model against provider list
     const availableModels = PROVIDER_MODELS[storedProvider as keyof typeof PROVIDER_MODELS] || [];
     if (availableModels.length > 0 && storedModel && !availableModels.includes(storedModel) && storedProvider !== 'custom') {
         storedModel = availableModels[0];
     } else if (!storedModel) {
         storedModel = availableModels[0] || 'deepseek-ai/DeepSeek-V3';
     }

     setCurrentModel(storedModel);
     setCurrentProvider(storedProvider);
     
     // Test connection on open
     if (isOpen) {
         testConnection(storedProvider);
     }
  }, [isOpen]);

  const testConnection = async (provider: string) => {
      setConnectionStatus('idle');
      
      let apiKey = '';
      let baseUrl = '';

      // Get Key
      const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
      apiKey = storedKeys[provider];
      
      if (!apiKey) {
          const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
          if (Array.isArray(savedKeys)) {
              const fallbackKey = savedKeys.find((k: any) => k.provider === provider);
              if (fallbackKey) apiKey = fallbackKey.key;
          }
      }
      if (!apiKey) apiKey = StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';
      
      // Get Base URL
      if (provider === 'siliconflow') baseUrl = 'https://api.siliconflow.cn/v1';
      else if (provider === 'openai') baseUrl = 'https://api.openai.com/v1';
      else if (provider === 'vectorengine') baseUrl = 'https://api.vectorengine.ai/v1';
      else if (provider === 'alibaba') baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      else baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || '';

      if (!apiKey) {
          setConnectionStatus('error');
          return;
      }

      try {
          const response = await fetch(`${baseUrl}/models`, {
              headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (response.ok) {
              setConnectionStatus('success');
          } else {
              setConnectionStatus('error');
          }
      } catch (e) {
          setConnectionStatus('error');
      }
  };

  const handleModelChange = (newModel: string) => {
      setCurrentModel(newModel);
      StorageManager.set(STORAGE_KEYS.CHAT_MODEL, newModel);
      setShowModelSelector(false);
  };

  const handleProviderChange = (newProvider: string) => {
      setCurrentProvider(newProvider);
      StorageManager.set(STORAGE_KEYS.CHAT_PROVIDER, newProvider);
      
      // Update Base URL based on provider
      let newBaseUrl = '';
      if (newProvider === 'siliconflow') {
          newBaseUrl = 'https://api.siliconflow.cn/v1';
      } else if (newProvider === 'openai') {
          newBaseUrl = 'https://api.openai.com/v1';
      } else if (newProvider === 'vectorengine') {
          newBaseUrl = 'https://api.vectorengine.ai/v1';
      } else if (newProvider === 'alibaba') {
          newBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      }
      if (newBaseUrl) {
          StorageManager.set(STORAGE_KEYS.CHAT_BASE_URL, newBaseUrl);
      }
      
      // Switch to default model for the new provider
      const availableModels = PROVIDER_MODELS[newProvider as keyof typeof PROVIDER_MODELS] || [];
      if (availableModels.length > 0) {
          handleModelChange(availableModels[0]);
      } else if (newProvider === 'custom') {
           // Keep current or clear? Let's keep current to avoid jarring change if custom is same
      }

      setShowProviderSelector(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare assistant message placeholder
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId }]);

    try {
      // Get API Config (prefer Chat model, fallback to Writing)
      // Check for provider-specific key first
      const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
      let apiKey = storedKeys[currentProvider];
      
      // Smart Fallback: If no cached key, look for any saved key for this provider
      if (!apiKey) {
          const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
          if (Array.isArray(savedKeys)) {
              const fallbackKey = savedKeys.find((k: any) => k.provider === currentProvider);
              if (fallbackKey) apiKey = fallbackKey.key;
          }
      }

      // If no specific key for this provider, try fallback logic or global keys
      if (!apiKey) {
          apiKey = StorageManager.get(STORAGE_KEYS.CHAT_API_KEY);
      }
      
      // Fallback to writing key only if using default provider or if strictly needed (optional logic)
      if (!apiKey && currentProvider === 'siliconflow') {
           apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
      }

      const baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
      // Use currentModel state instead of reading from storage again
      
      if (!apiKey) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: `请先在设置中配置 ${currentProvider === 'siliconflow' ? '硅基流动' : currentProvider === 'vectorengine' ? '向量引擎' : currentProvider} 的 API Key。` } : m
        ));
        setIsLoading(false);
        return;
      }

      if (isImageMode) {
          const imageApiKey = apiKey;
          const imageBaseUrl = baseUrl;
          const imageModel = StorageManager.get(STORAGE_KEYS.IMAGE_MODEL) || 'black-forest-labs/FLUX.1-schnell';
          
          // 1. Optimize Prompt using Chat Model
          let optimizedPrompt = input;
          try {
              // Only optimize if prompt is short or simple (e.g. < 50 chars), or always? 
              // Let's always optimize to ensure best quality, but keep original if optimization fails.
              // Use the chat key/model for optimization
              const chatApiKey = StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || apiKey;
              const chatBaseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) || baseUrl;
              const chatModel = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || currentModel || 'deepseek-ai/DeepSeek-V3';

              setMessages(prev => prev.map(m => 
                m.id === assistantMsgId ? { ...m, content: '正在优化绘画提示词...' } : m
              ));

              const systemPrompt = `你是一个专业的 AI 绘画提示词专家 (Stable Diffusion/Midjourney)。
你的任务是将用户的简短画面描述改写为高质量的英文提示词 (Prompt)。

要求：
1. **只返回英文提示词**，不要包含任何中文、解释或前缀后缀。
2. 丰富画面细节，包括：主体描述、环境背景、光影效果、艺术风格、视角、画质词 (e.g., 4k, 8k, masterpiece)。
3. **除非用户明确提到人物（如女孩、男孩、男人、女人等），否则不要在提示词中添加任何人物主体**。如果用户只描述了风景或物品（如“下雨的街道”、“一把椅子”），请专注于描绘该场景或物品本身，不要强行加入人物。
4. 保持提示词的连贯性和艺术感。

示例：
用户输入：下雨的街道
输出：cinematic shot of a rainy empty street at night, neon lights reflecting on wet asphalt, cyberpunk atmosphere, heavy rain, mist, dramatic lighting, high detail, 8k, photorealistic, no humans

用户输入：一只猫
输出：close up shot of a fluffy cat sitting on a windowsill, looking out at the rain, cozy atmosphere, soft indoor lighting, detailed fur texture, depth of field, 8k, masterpiece`;

              const optimized = await generateAIContent(chatApiKey, systemPrompt, input, chatBaseUrl, chatModel);
              if (optimized && optimized.length > 10) {
                  optimizedPrompt = optimized;
              }
          } catch (e) {
              console.warn('Prompt optimization failed, using original:', e);
          }

          // 2. Generate Image
          setMessages(prev => prev.map(m => 
            m.id === assistantMsgId ? { ...m, content: `正在绘图...\n\n> Prompt: ${optimizedPrompt}` } : m
          ));

          const imageUrl = await generateImage(imageApiKey, optimizedPrompt, imageBaseUrl, imageModel, imageSize);
          
          setMessages(prev => prev.map(m => 
            m.id === assistantMsgId ? { ...m, content: `![${input}](${imageUrl})\n\n> **Prompt**: ${optimizedPrompt}` } : m
          ));
          setIsLoading(false);
          return;
      }

      // Build context from previous messages (limit to last 10 to save tokens)
      let contextPrompt = "你是一个专业的小说写作助手。请简短、直接地回答用户的问题。";
      
      const historyText = messages.slice(-6).map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n\n');
      const fullUserPrompt = `${historyText}\n\n用户: ${userMsg.content}\n助手:`;

      await generateAIContentStream(
        apiKey,
        contextPrompt,
        fullUserPrompt,
        baseUrl,
        currentModel,
        (chunk) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMsgId ? { ...m, content: chunk } : m
          ));
        }
      );

    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}` } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
      setMessages([{ role: 'assistant', content: '对话已清空。', id: Date.now().toString() }]);
  };

  const handleImageDownload = async (url: string) => {
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `ai-image-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(a);
      } catch (e) {
          console.error('Download failed:', e);
          window.open(url, '_blank');
      }
  };

  const renderMessageContent = (msg: Message) => {
      if (msg.role === 'assistant') {
          // Check for image markdown
          const imageMatch = msg.content.match(/!\[(.*?)\]\((.*?)\)/);
          if (imageMatch) {
              const alt = imageMatch[1];
              const url = imageMatch[2];
              return (
                  <div className="relative group">
                      <img 
                        src={url} 
                        alt={alt} 
                        className="rounded-lg max-w-full cursor-zoom-in border border-ink/10"
                        onClick={() => setPreviewImage(url)}
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleImageDownload(url); }}
                            className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
                            title="下载图片"
                          >
                              <Download className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              );
          }

          return (
              <div className="prose prose-sm max-w-none text-ink/90 prose-p:my-1 prose-pre:bg-gray-100 prose-pre:text-ink">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
          );
      }
      return msg.content;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-serif">
      {/* Image Preview Modal */}
      {previewImage && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 animate-fade-in" onClick={() => setPreviewImage(null)}>
              <div className="relative max-w-full max-h-full">
                  <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                  <button 
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    onClick={() => setPreviewImage(null)}
                  >
                      <X className="w-6 h-6" />
                  </button>
                  <button 
                    className="absolute bottom-4 right-4 p-3 bg-white text-black rounded-full shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium"
                    onClick={(e) => { e.stopPropagation(); handleImageDownload(previewImage); }}
                  >
                      <Download className="w-5 h-5" />
                      <span>下载原图</span>
                  </button>
              </div>
          </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
            className={`absolute bottom-16 right-0 bg-white/95 backdrop-blur-md border border-ink/10 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right overflow-hidden ${
                isExpanded ? 'w-[800px] h-[80vh]' : 'w-[400px] h-[600px]'
            } max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ink/5 bg-paper/80 cursor-move relative">
            <div className="flex items-center gap-2 text-daiqing">
              <Bot className="w-5 h-5" />
              <div className="flex flex-col">
                  <span className="font-bold text-sm">墨灵助手</span>
                  <div className="flex items-center gap-2 text-[10px] text-ink/40">
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-daiqing transition-colors"
                        onClick={() => setShowProviderSelector(!showProviderSelector)}
                      >
                          <span>{currentProvider === 'siliconflow' ? '硅基流动' : currentProvider === 'vectorengine' ? '向量引擎' : currentProvider === 'openai' ? 'OpenAI' : '自定义'}</span>
                          <Settings2 className="w-3 h-3" />
                      </div>
                      <span className="text-ink/20">|</span>
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-daiqing transition-colors"
                        onClick={() => setShowModelSelector(!showModelSelector)}
                      >
                          <span>{currentModel.split('/').pop()}</span>
                          <Settings2 className="w-3 h-3" />
                      </div>
                  </div>
              </div>
            </div>

            {/* Provider Selector Dropdown */}
            {showProviderSelector && (
                <div className="absolute top-14 left-4 z-50 bg-white border border-ink/10 rounded-lg shadow-xl py-1 w-32 animate-fade-in-up">
                    <div className="px-3 py-2 text-xs font-bold text-ink/40 border-b border-ink/5 mb-1">切换服务商</div>
                    {['siliconflow', 'vectorengine', 'alibaba', 'openai', 'custom'].map(provider => (
                        <button
                            key={provider}
                            onClick={() => handleProviderChange(provider)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-paper transition-colors flex items-center justify-between ${currentProvider === provider ? 'text-daiqing bg-daiqing/5 font-medium' : 'text-ink/70'}`}
                        >
                            {provider === 'siliconflow' ? '硅基流动' : provider === 'vectorengine' ? '向量引擎' : provider === 'alibaba' ? '阿里大模型' : provider === 'openai' ? 'OpenAI' : '自定义'}
                            {currentProvider === provider && <span className="w-1.5 h-1.5 rounded-full bg-daiqing"></span>}
                        </button>
                    ))}
                </div>
            )}

            {/* Model Selector Dropdown */}
            {showModelSelector && (
                <div className="absolute top-14 left-24 z-50 bg-white border border-ink/10 rounded-lg shadow-xl py-1 w-64 animate-fade-in-up">
                    <div className="px-3 py-2 text-xs font-bold text-ink/40 border-b border-ink/5 mb-1">切换模型 ({currentProvider})</div>
                    {(PROVIDER_MODELS[currentProvider as keyof typeof PROVIDER_MODELS] || []).map(model => (
                        <button
                            key={model}
                            onClick={() => handleModelChange(model)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-paper transition-colors flex items-center justify-between ${currentModel === model ? 'text-daiqing bg-daiqing/5 font-medium' : 'text-ink/70'}`}
                        >
                            {model.split('/').pop()}
                            {currentModel === model && <span className="w-1.5 h-1.5 rounded-full bg-daiqing"></span>}
                        </button>
                    ))}
                    {currentProvider === 'custom' && (
                        <div className="px-3 py-2 text-xs text-ink/50 italic">
                            自定义模式请在设置中手动输入模型名称
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsImageMode(!isImageMode)} 
                className={`p-1.5 rounded-lg transition-colors ${isImageMode ? 'text-daiqing bg-daiqing/10' : 'text-ink/40 hover:text-ink hover:bg-paper'}`} 
                title={isImageMode ? "退出生图模式" : "切换到生图模式"}
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button onClick={handleClear} className="p-1.5 text-ink/40 hover:text-cinnabar rounded-lg hover:bg-cinnabar/5 transition-colors" title="清空对话">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-ink/40 hover:text-ink rounded-lg hover:bg-paper transition-colors">
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-ink/40 hover:text-ink rounded-lg hover:bg-paper transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-rice-texture custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                    className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-daiqing text-white rounded-br-none' 
                            : 'bg-white text-ink border border-ink/5 rounded-bl-none'
                    }`}
                >
                    {renderMessageContent(msg)}
                </div>
              </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white border border-ink/5 rounded-2xl rounded-bl-none p-3 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-daiqing" />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white/80 border-t border-ink/5">
            {/* Image Size Selector */}
            {isImageMode && (
                <div className="flex gap-2 mb-2 overflow-x-auto custom-scrollbar pb-1">
                    {[
                        { label: '1:1', value: '1024x1024' },
                        { label: '3:4', value: '768x1024' },
                        { label: '4:3', value: '1024x768' },
                        { label: '9:16', value: '576x1024' },
                        { label: '16:9', value: '1024x576' },
                        { label: '3:4 (HD)', value: '1152x1536' },
                        { label: '1:1 (HD)', value: '1408x1408' },
                        { label: '16:9 (HD)', value: '1536x896' },
                        { label: '9:16 (HD)', value: '896x1536' }
                    ].map(size => (
                        <button
                            key={size.value}
                            onClick={() => setImageSize(size.value)}
                            className={`px-2 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${
                                imageSize === size.value 
                                    ? 'bg-pink-500 text-white border-pink-600' 
                                    : 'bg-white text-ink/60 border-ink/10 hover:border-pink-300 hover:text-pink-500'
                            }`}
                        >
                            {size.label}
                        </button>
                    ))}
                </div>
            )}
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isImageMode ? "输入画面描述，例如：一只在雨中漫步的猫..." : "输入问题，Shift+Enter 换行..."}
                className={`w-full pl-4 pr-12 py-3 bg-paper/50 border rounded-xl focus:ring-2 outline-none resize-none text-sm text-ink placeholder:text-ink/30 max-h-32 custom-scrollbar ${
                    isImageMode ? 'border-pink-300 focus:ring-pink-200 focus:border-pink-400' : 'border-ink/10 focus:ring-daiqing/20 focus:border-daiqing'
                }`}
                rows={1}
                style={{ minHeight: '46px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 bottom-2 p-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ${
                    isImageMode ? 'bg-pink-500 hover:bg-pink-600' : 'bg-daiqing hover:bg-daiqing/90'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center border border-white/20 backdrop-blur-sm ${
            isOpen 
                ? 'bg-ink text-white rotate-90' 
                : 'bg-daiqing text-white hover:bg-daiqing/90'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>
    </div>
  );
}