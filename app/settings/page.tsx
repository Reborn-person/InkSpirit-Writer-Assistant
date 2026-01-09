'use client';

import { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export default function SettingsPage() {
  // RAG Configuration
  const [ragProvider, setRagProvider] = useState('siliconflow');
  const [ragApiKey, setRagApiKey] = useState('');
  const [ragBaseUrl, setRagBaseUrl] = useState('https://api.siliconflow.cn/v1');
  const [ragModel, setRagModel] = useState('deepseek-ai/DeepSeek-R1');
  const [ragStatus, setRagStatus] = useState<TestStatus>('idle');

  // Writing Configuration
  const [writingProvider, setWritingProvider] = useState('siliconflow');
  const [writingApiKey, setWritingApiKey] = useState('');
  const [writingBaseUrl, setWritingBaseUrl] = useState('https://api.siliconflow.cn/v1');
  const [writingModel, setWritingModel] = useState('deepseek-ai/DeepSeek-R1');
  const [writingStatus, setWritingStatus] = useState<TestStatus>('idle');

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load RAG settings
    const storedRagProvider = StorageManager.get(STORAGE_KEYS.RAG_PROVIDER);
    const storedRagKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY);
    const storedRagUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL);
    const storedRagModel = StorageManager.get(STORAGE_KEYS.RAG_MODEL);

    if (storedRagProvider) setRagProvider(storedRagProvider);
    if (storedRagKey) setRagApiKey(storedRagKey);
    if (storedRagUrl) setRagBaseUrl(storedRagUrl);
    if (storedRagModel) setRagModel(storedRagModel);

    // Load Writing settings
    const storedWritingProvider = StorageManager.get(STORAGE_KEYS.WRITING_PROVIDER);
    const storedWritingKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY);
    const storedWritingUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL);
    const storedWritingModel = StorageManager.get(STORAGE_KEYS.WRITING_MODEL);

    if (storedWritingProvider) setWritingProvider(storedWritingProvider);
    if (storedWritingKey) setWritingApiKey(storedWritingKey);
    if (storedWritingUrl) setWritingBaseUrl(storedWritingUrl);
    if (storedWritingModel) setWritingModel(storedWritingModel);
    
    // Migration from old single-key setup
    if (!storedRagKey && !storedWritingKey) {
        const oldKey = StorageManager.get('novel_writer_api_key');
        if (oldKey) {
            setRagApiKey(oldKey);
            setWritingApiKey(oldKey);
        }
    }
  }, []);

  const handleProviderChange = (type: 'rag' | 'writing', newProvider: string) => {
    const isRag = type === 'rag';
    const setUrl = isRag ? setRagBaseUrl : setWritingBaseUrl;
    const setModel = isRag ? setRagModel : setWritingModel;
    const setProvider = isRag ? setRagProvider : setWritingProvider;

    setProvider(newProvider);
    
    if (newProvider === 'siliconflow') {
      setUrl('https://api.siliconflow.cn/v1');
      setModel('deepseek-ai/DeepSeek-R1');
    } else if (newProvider === 'openai') {
      setUrl('https://api.openai.com/v1');
      setModel('gpt-4o');
    }
  };

  const testConnection = async (type: 'rag' | 'writing') => {
    const isRag = type === 'rag';
    const apiKey = isRag ? ragApiKey : writingApiKey;
    const baseUrl = isRag ? ragBaseUrl : writingBaseUrl;
    const setStatus = isRag ? setRagStatus : setWritingStatus;

    setStatus('loading');
    try {
        const response = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (response.ok) {
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } else {
            setStatus('error');
            const err = await response.json().catch(() => ({}));
            alert(`连接失败：${err.error?.message || response.statusText}`);
            setTimeout(() => setStatus('idle'), 3000);
        }
    } catch (e: any) {
        setStatus('error');
        alert(`连接错误：${e.message}`);
        setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleSave = () => {
    StorageManager.set(STORAGE_KEYS.RAG_PROVIDER, ragProvider);
    StorageManager.set(STORAGE_KEYS.RAG_API_KEY, ragApiKey);
    StorageManager.set(STORAGE_KEYS.RAG_BASE_URL, ragBaseUrl);
    StorageManager.set(STORAGE_KEYS.RAG_MODEL, ragModel);

    StorageManager.set(STORAGE_KEYS.WRITING_PROVIDER, writingProvider);
    StorageManager.set(STORAGE_KEYS.WRITING_API_KEY, writingApiKey);
    StorageManager.set(STORAGE_KEYS.WRITING_BASE_URL, writingBaseUrl);
    StorageManager.set(STORAGE_KEYS.WRITING_MODEL, writingModel);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getButtonClass = (status: TestStatus) => {
      switch(status) {
          case 'success': return 'bg-green-600 text-white hover:bg-green-700';
          case 'error': return 'bg-red-600 text-white hover:bg-red-700';
          case 'loading': return 'bg-gray-400 text-white cursor-wait';
          default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300';
      }
  };

  const getButtonContent = (status: TestStatus) => {
      switch(status) {
          case 'success': return <><Check className="w-4 h-4 mr-2" /> 连接成功</>;
          case 'error': return <><X className="w-4 h-4 mr-2" /> 连接失败</>;
          case 'loading': return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 测试中...</>;
          default: return '测试连接';
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">设置</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RAG Model Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                推理/规划模型 (RAG)
            </h2>
            <p className="text-sm text-gray-500">用于脑洞、大纲生成 (模块 1, 2, 2.5)</p>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">服务商</label>
                <select
                    value={ragProvider}
                    onChange={(e) => handleProviderChange('rag', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                >
                    <option value="custom">自定义 (Custom)</option>
                    <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                    <option value="openai">OpenAI</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                    type="password"
                    value={ragApiKey}
                    onChange={(e) => setRagApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder="sk-..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input
                    type="text"
                    value={ragBaseUrl}
                    onChange={(e) => setRagBaseUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    disabled={ragProvider !== 'custom'}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                <input
                    type="text"
                    value={ragModel}
                    onChange={(e) => setRagModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                />
            </div>

            <button
                onClick={() => testConnection('rag')}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(ragStatus)}`}
                disabled={ragStatus === 'loading'}
            >
                {getButtonContent(ragStatus)}
            </button>
        </div>

        {/* Writing Model Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                写作模型 (Writing)
            </h2>
            <p className="text-sm text-gray-500">用于正文写作、润色 (模块 3, 4, 5, 6)</p>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">服务商</label>
                <select
                    value={writingProvider}
                    onChange={(e) => handleProviderChange('writing', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                >
                    <option value="custom">自定义 (Custom)</option>
                    <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                    <option value="openai">OpenAI</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                    type="password"
                    value={writingApiKey}
                    onChange={(e) => setWritingApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder="sk-..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input
                    type="text"
                    value={writingBaseUrl}
                    onChange={(e) => setWritingBaseUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    disabled={writingProvider !== 'custom'}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                <input
                    type="text"
                    value={writingModel}
                    onChange={(e) => setWritingModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                />
            </div>

            <button
                onClick={() => testConnection('writing')}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(writingStatus)}`}
                disabled={writingStatus === 'loading'}
            >
                {getButtonContent(writingStatus)}
            </button>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg shadow-md"
        >
          {saved ? '设置已保存！' : '保存所有设置'}
        </button>
      </div>
    </div>
  );
}
