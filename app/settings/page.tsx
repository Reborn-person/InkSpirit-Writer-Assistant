'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2, Upload, User, Plus, Trash2, Eye, EyeOff, Edit2, Sparkles, Maximize2, Cloud, Download, Palette, ShieldCheck, Key, Zap } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { TokenUsageDisplay } from '@/components/TokenUsageDisplay';
import { PROVIDER_MODELS, VECTOR_MODELS, IMAGE_MODELS, PROVIDER_NAMES } from '@/lib/models';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface SavedKey {
    id: string;
    name: string;
    provider: string;
    key: string;
    createdAt: number;
}

const MODEL_SCORES: Record<string, { text: number; logic: number; understanding: number }> = {
    // SiliconFlow (Current Generation / Value Leaders)
    'Pro/deepseek-ai/DeepSeek-V3.2': { text: 9.4, logic: 9.3, understanding: 9.2 }, // "Value model", strong math/code
    'deepseek-ai/DeepSeek-R1': { text: 9.0, logic: 9.9, understanding: 9.6 }, // Logic monster (Codeforces 96%), weaker text polish
    'Pro/zai-org/GLM-4.7': { text: 9.2, logic: 9.0, understanding: 9.1 },
    'zai-org/GLM-4.6': { text: 8.9, logic: 8.7, understanding: 8.9 },
    'zai-org/GLM-4.6V': { text: 8.9, logic: 8.7, understanding: 8.9 },
    'Pro/MiniMaxAI/MiniMax-M2.1': { text: 9.3, logic: 8.5, understanding: 8.8 }, // Known for good roleplay/text
    'Qwen/Qwen3-Next-80B-A3B-Thinking': { text: 9.1, logic: 9.4, understanding: 9.1 }, // Strong reasoning derivative

    // VectorEngine (Future Frontier / SOTA)
    'gemini-3-pro-preview': { text: 9.6, logic: 10.0, understanding: 9.7 }, // "1501 Elo", brutal math/reasoning
    'gemini-3-pro-preview-11-2025': { text: 9.6, logic: 10.0, understanding: 9.7 }, // Same as base version
    'deepseek-v3.2-thinking': { text: 9.3, logic: 9.5, understanding: 9.3 },
    'gpt-5.1': { text: 9.8, logic: 9.8, understanding: 9.8 }, // "Consistent monster"
    'gpt-5.2': { text: 9.9, logic: 9.9, understanding: 9.9 }, // The new peak
    'claude-3-7-sonnet-20250219': { text: 9.9, logic: 9.7, understanding: 9.9 }, // "Agent executor", best text/coding flow
    'claude-3-5-sonnet-20241022': { text: 9.7, logic: 9.5, understanding: 9.7 }, // Previous SOTA
    'claude-opus-4-5-20251101': { text: 9.8, logic: 9.8, understanding: 9.8 }, // Slow but deep understanding
    'grok-4.1': { text: 9.2, logic: 9.6, understanding: 9.2 }, // Strong reasoning focus
    'qwen-plus': { text: 9.0, logic: 9.2, understanding: 9.0 },
    'doubao-seed-1-8-251228': { text: 8.9, logic: 8.6, understanding: 8.8 }
};

const ScoreBar = ({ score }: { score: number }) => (
    <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
                className={`h-full rounded-full ${score >= 9.5 ? 'bg-purple-500' : score >= 9.0 ? 'bg-indigo-500' : score >= 8.5 ? 'bg-blue-500' : 'bg-gray-400'}`} 
                style={{ width: `${(score / 10) * 100}%` }}
            ></div>
        </div>
        <span className="text-[10px] font-mono font-bold w-6 text-right text-gray-600">{score.toFixed(1)}</span>
    </div>
);

export default function SettingsPage() {
    // Avatar Configuration
    const [userAvatar, setUserAvatar] = useState('');
    const [userLevel, setUserLevel] = useState<'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX' | null>(null);
    const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(null);
    const [userQuota, setUserQuota] = useState<{
        dailyTokensUsed: number;
        dailyTokenLimit: number;
        totalTokensUsed: number;
    } | null>(null);

    // Theme Configuration
    const [uiTheme, setUiTheme] = useState('default');

    // Key Management State
    const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
    const [newKeyProvider, setNewKeyProvider] = useState('siliconflow');
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false); // Toggle masking

    // RAG Configuration
    const [ragProvider, setRagProvider] = useState('siliconflow');
    const [ragApiKey, setRagApiKey] = useState('');
    const [ragBaseUrl, setRagBaseUrl] = useState('https://api.siliconflow.cn/v1');
    const [ragModel, setRagModel] = useState('deepseek-ai/DeepSeek-R1');
    const [ragStatus, setRagStatus] = useState<TestStatus>('idle');

    // Vector Configuration
    const [vectorProvider, setVectorProvider] = useState('siliconflow');
    const [vectorApiKey, setVectorApiKey] = useState('');
    const [vectorBaseUrl, setVectorBaseUrl] = useState('https://api.siliconflow.cn/v1');
    const [vectorModel, setVectorModel] = useState('text-embedding-3-large');
    const [vectorStatus, setVectorStatus] = useState<TestStatus>('idle');

    // Big Model Configuration (Module 0.5)
    const [bigModelProvider, setBigModelProvider] = useState('siliconflow');
    const [bigModelApiKey, setBigModelApiKey] = useState('');
    const [bigModelBaseUrl, setBigModelBaseUrl] = useState('https://api.siliconflow.cn/v1');
    const [bigModelModel, setBigModelModel] = useState('deepseek-ai/DeepSeek-V3');
    const [bigModelStatus, setBigModelStatus] = useState<TestStatus>('idle');

    // Writing Configuration
    const [writingProvider, setWritingProvider] = useState('siliconflow');
    const [writingApiKey, setWritingApiKey] = useState('');
    const [writingBaseUrl, setWritingBaseUrl] = useState('https://api.siliconflow.cn/v1');
    const [writingModel, setWritingModel] = useState('deepseek-ai/DeepSeek-R1');
    const [writingStatus, setWritingStatus] = useState<TestStatus>('idle');

    // Chat Configuration (Floating AI)
    const [chatProvider, setChatProvider] = useState('siliconflow');
    const [chatApiKey, setChatApiKey] = useState('');
    const [chatBaseUrl, setChatBaseUrl] = useState('https://api.siliconflow.cn/v1');
    const [chatModel, setChatModel] = useState('deepseek-ai/DeepSeek-V3');
    const [chatStatus, setChatStatus] = useState<TestStatus>('idle');

    // Image Generation Configuration
    const [imageProvider, setImageProvider] = useState('siliconflow');
    const [imageApiKey, setImageApiKey] = useState('');
    const [imageBaseUrl, setImageBaseUrl] = useState('https://api.siliconflow.cn/v1');
    const [imageModel, setImageModel] = useState('black-forest-labs/FLUX.1-dev');
    const [imageStatus, setImageStatus] = useState<TestStatus>('idle');

    // Legacy/Cache Map for FloatingAI auto-switching
    const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});

    // Custom Models
    const [customModels, setCustomModels] = useState<Record<string, string[]>>({});

    // Editor Prediction Configuration
    const [editorConfig, setEditorConfig] = useState({
        predictEnabled: false,
        predictLength: 50,
        predictThreshold: 2000
    });
    const [isMaxModeEnabled, setIsMaxModeEnabled] = useState(false);
    const editorConfigBaseRef = useRef<Record<string, any>>({});
    const editorConfigHydratedRef = useRef(false);
    const editorConfigSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [saved, setSaved] = useState(false);
    const [syncStatus, setSyncStatus] = useState<TestStatus>('idle');

    useEffect(() => {
        // Load Avatar
        const storedAvatar = StorageManager.get(STORAGE_KEYS.USER_AVATAR);
        if (storedAvatar) setUserAvatar(storedAvatar);

        // Load Theme
        const storedTheme = StorageManager.get(STORAGE_KEYS.UI_THEME);
        if (storedTheme) setUiTheme(storedTheme);

        // Load Custom Models
        const storedCustomModels = StorageManager.getJSON(STORAGE_KEYS.CUSTOM_MODELS);
        if (storedCustomModels) {
            setCustomModels(storedCustomModels);
        }

        // Load Saved Keys
        const storedSavedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
        const storedProviderKeys = StorageManager.getJSON('novel_writer_chat_provider_keys');

        if (storedSavedKeys && Array.isArray(storedSavedKeys)) {
            setSavedKeys(storedSavedKeys);
        } else if (storedProviderKeys) {
            // Migration: Convert legacy map to saved keys list
            const migratedKeys: SavedKey[] = Object.entries(storedProviderKeys).map(([provider, key]) => ({
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                name: `Default ${provider} Key`,
                provider,
                key: key as string,
                createdAt: Date.now()
            }));
            setSavedKeys(migratedKeys);
            StorageManager.setJSON(STORAGE_KEYS.SAVED_KEYS, migratedKeys);
        }

        if (storedProviderKeys) {
            setProviderKeys(storedProviderKeys);
        }

        // Load RAG settings
        const storedRagProvider = StorageManager.get(STORAGE_KEYS.RAG_PROVIDER);
        const storedRagKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY);
        const storedRagUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL);
        const storedRagModel = StorageManager.get(STORAGE_KEYS.RAG_MODEL);

        if (storedRagProvider) setRagProvider(storedRagProvider);
        if (storedRagKey) setRagApiKey(storedRagKey);
        if (storedRagUrl) setRagBaseUrl(storedRagUrl);
        if (storedRagModel) setRagModel(storedRagModel);

        // Load Vector settings
        const storedVectorProvider = StorageManager.get(STORAGE_KEYS.VECTOR_PROVIDER);
        const storedVectorKey = StorageManager.get(STORAGE_KEYS.VECTOR_API_KEY);
        const storedVectorUrl = StorageManager.get(STORAGE_KEYS.VECTOR_BASE_URL);
        const storedVectorModel = StorageManager.get(STORAGE_KEYS.VECTOR_MODEL);

        if (storedVectorProvider) setVectorProvider(storedVectorProvider);
        if (storedVectorKey) setVectorApiKey(storedVectorKey);
        if (storedVectorUrl) setVectorBaseUrl(storedVectorUrl);
        if (storedVectorModel) setVectorModel(storedVectorModel);

        // Load Big Model settings
        const storedBigModelProvider = StorageManager.get(STORAGE_KEYS.BIG_MODEL_PROVIDER);
        const storedBigModelKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY);
        const storedBigModelUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL);
        const storedBigModelModel = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL);

        if (storedBigModelProvider) setBigModelProvider(storedBigModelProvider);
        if (storedBigModelKey) setBigModelApiKey(storedBigModelKey);
        if (storedBigModelUrl) setBigModelBaseUrl(storedBigModelUrl);
        if (storedBigModelModel) setBigModelModel(storedBigModelModel);

        // Load Writing settings
        const storedWritingProvider = StorageManager.get(STORAGE_KEYS.WRITING_PROVIDER);
        const storedWritingKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY);
        const storedWritingUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL);
        const storedWritingModel = StorageManager.get(STORAGE_KEYS.WRITING_MODEL);

        if (storedWritingProvider) setWritingProvider(storedWritingProvider);
        if (storedWritingKey) setWritingApiKey(storedWritingKey);
        if (storedWritingUrl) setWritingBaseUrl(storedWritingUrl);
        if (storedWritingModel) setWritingModel(storedWritingModel);

        // Load Chat settings
        const storedChatProvider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER);
        const storedChatKey = StorageManager.get(STORAGE_KEYS.CHAT_API_KEY);
        const storedChatUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL);
        const storedChatModel = StorageManager.get(STORAGE_KEYS.CHAT_MODEL);

        if (storedChatProvider) setChatProvider(storedChatProvider);
        if (storedChatKey) setChatApiKey(storedChatKey);
        if (storedChatUrl) setChatBaseUrl(storedChatUrl);
        if (storedChatModel) setChatModel(storedChatModel);

        // Load Image settings
        const storedImageProvider = StorageManager.get(STORAGE_KEYS.IMAGE_PROVIDER);
        const storedImageKey = StorageManager.get(STORAGE_KEYS.IMAGE_API_KEY);
        const storedImageUrl = StorageManager.get(STORAGE_KEYS.IMAGE_BASE_URL);
        const storedImageModel = StorageManager.get(STORAGE_KEYS.IMAGE_MODEL);

        if (storedImageProvider) setImageProvider(storedImageProvider);
        if (storedImageKey) setImageApiKey(storedImageKey);
        if (storedImageUrl) setImageBaseUrl(storedImageUrl);
        if (storedImageModel) setImageModel(storedImageModel);

        (async () => {
            const storedEditorConfig = await StorageManager.getJSONAsync('editor_config');
            if (storedEditorConfig) {
                editorConfigBaseRef.current = storedEditorConfig;
                setEditorConfig(prev => ({ ...prev, ...storedEditorConfig }));
            }
            editorConfigHydratedRef.current = true;

            // Load MAX Mode setting
            const storedMaxMode = StorageManager.get(STORAGE_KEYS.ENABLE_MAX_MODE);
            if (storedMaxMode === 'true') setIsMaxModeEnabled(true);
        })();

        // Migration from old single-key setup (Module 1-6)
        if (!storedRagKey && !storedWritingKey && !storedProviderKeys) {
            const oldKey = StorageManager.get('novel_writer_api_key');
            if (oldKey) {
                setRagApiKey(oldKey);
                setWritingApiKey(oldKey);
            }
        }

        (async () => {
            try {
                const res = await fetch('/api/user/settings', { credentials: 'include' });
                if (!res.ok) return;
                const json = await res.json();
                const cloud = json?.data;
                if (!cloud || typeof cloud !== 'object') return;

                const applyIfMissing = (current: string | null, key: string, setter: (v: string) => void) => {
                    const v = (cloud as any)[key];
                    if (current) return;
                    if (typeof v !== 'string' || !v) return;
                    setter(v);
                    StorageManager.set(key, v);
                };

                applyIfMissing(storedRagProvider, STORAGE_KEYS.RAG_PROVIDER, setRagProvider);
                applyIfMissing(storedRagKey, STORAGE_KEYS.RAG_API_KEY, setRagApiKey);
                applyIfMissing(storedRagUrl, STORAGE_KEYS.RAG_BASE_URL, setRagBaseUrl);
                applyIfMissing(storedRagModel, STORAGE_KEYS.RAG_MODEL, setRagModel);

                applyIfMissing(storedVectorProvider, STORAGE_KEYS.VECTOR_PROVIDER, setVectorProvider);
                applyIfMissing(storedVectorKey, STORAGE_KEYS.VECTOR_API_KEY, setVectorApiKey);
                applyIfMissing(storedVectorUrl, STORAGE_KEYS.VECTOR_BASE_URL, setVectorBaseUrl);
                applyIfMissing(storedVectorModel, STORAGE_KEYS.VECTOR_MODEL, setVectorModel);

                applyIfMissing(storedBigModelProvider, STORAGE_KEYS.BIG_MODEL_PROVIDER, setBigModelProvider);
                applyIfMissing(storedBigModelKey, STORAGE_KEYS.BIG_MODEL_API_KEY, setBigModelApiKey);
                applyIfMissing(storedBigModelUrl, STORAGE_KEYS.BIG_MODEL_BASE_URL, setBigModelBaseUrl);
                applyIfMissing(storedBigModelModel, STORAGE_KEYS.BIG_MODEL_MODEL, setBigModelModel);

                applyIfMissing(storedWritingProvider, STORAGE_KEYS.WRITING_PROVIDER, setWritingProvider);
                applyIfMissing(storedWritingKey, STORAGE_KEYS.WRITING_API_KEY, setWritingApiKey);
                applyIfMissing(storedWritingUrl, STORAGE_KEYS.WRITING_BASE_URL, setWritingBaseUrl);
                applyIfMissing(storedWritingModel, STORAGE_KEYS.WRITING_MODEL, setWritingModel);

                applyIfMissing(storedChatProvider, STORAGE_KEYS.CHAT_PROVIDER, setChatProvider);
                applyIfMissing(storedChatKey, STORAGE_KEYS.CHAT_API_KEY, setChatApiKey);
                applyIfMissing(storedChatUrl, STORAGE_KEYS.CHAT_BASE_URL, setChatBaseUrl);
                applyIfMissing(storedChatModel, STORAGE_KEYS.CHAT_MODEL, setChatModel);

                applyIfMissing(storedImageProvider, STORAGE_KEYS.IMAGE_PROVIDER, setImageProvider);
                applyIfMissing(storedImageKey, STORAGE_KEYS.IMAGE_API_KEY, setImageApiKey);
                applyIfMissing(storedImageUrl, STORAGE_KEYS.IMAGE_BASE_URL, setImageBaseUrl);
                applyIfMissing(storedImageModel, STORAGE_KEYS.IMAGE_MODEL, setImageModel);
            } catch {
                return;
            }
        })();
    }, []);

    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (!res.ok) return;
                const json = await res.json();
                setUserLevel(json?.data?.level || null);
                setMembershipExpiresAt(json?.data?.membershipExpiresAt || null);
                setUserQuota(json?.data?.quota || null);
            } catch {
                return;
            }
        };
        loadUserInfo();
    }, []);

    useEffect(() => {
        if (!editorConfigHydratedRef.current) return;
        const merged = { ...editorConfigBaseRef.current, ...editorConfig };
        editorConfigBaseRef.current = merged;
        if (editorConfigSaveTimerRef.current) {
            clearTimeout(editorConfigSaveTimerRef.current);
        }
        editorConfigSaveTimerRef.current = setTimeout(() => {
            StorageManager.setJSON('editor_config', merged);
        }, 300);
        return () => {
            if (editorConfigSaveTimerRef.current) {
                clearTimeout(editorConfigSaveTimerRef.current);
            }
        };
    }, [editorConfig]);

    const getLevelLabel = (level: typeof userLevel) => {
        if (!level) return '';
        if (level === 'PRO_PLUS') return 'PRO+';
        return level;
    };

    const getLevelColor = (level: typeof userLevel) => {
        switch (level) {
            case 'PRO':
                return 'bg-blue-600';
            case 'PRO_PLUS':
                return 'bg-purple-600';
            case 'MAX':
                return 'bg-orange-600';
            case 'PROMAX':
                return 'bg-red-600';
            default:
                return 'bg-gray-500';
        }
    };

    const formatExpiryDate = (value: string | null) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString('zh-CN');
    };

    // Theme Handler
    const handleThemeChange = (theme: string) => {
        setUiTheme(theme);
        // Force synchronous update for theme to ensure ThemeProvider gets it immediately
        localStorage.setItem(STORAGE_KEYS.UI_THEME, theme);
        StorageManager.set(STORAGE_KEYS.UI_THEME, theme);
        // Dispatch events for ThemeProvider
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.UI_THEME, newValue: theme }));
        window.dispatchEvent(new Event('local-storage-update'));
    };

    const handleAddKey = () => {
        if (!newKeyName.trim() || !newKeyValue.trim()) {
            alert('请填写 Key 名称和内容');
            return;
        }

        const newKey: SavedKey = {
            id: Date.now().toString(),
            name: newKeyName,
            provider: newKeyProvider,
            key: newKeyValue,
            createdAt: Date.now()
        };

        const updatedKeys = [...savedKeys, newKey];
        setSavedKeys(updatedKeys);
        StorageManager.setJSON(STORAGE_KEYS.SAVED_KEYS, updatedKeys);

        setNewKeyName('');
        setNewKeyValue('');
        alert('Key 添加成功！');
    };

    const handleDeleteKey = (id: string) => {
        if (confirm('确定要删除这个 Key 吗？')) {
            const updatedKeys = savedKeys.filter(k => k.id !== id);
            setSavedKeys(updatedKeys);
            StorageManager.setJSON(STORAGE_KEYS.SAVED_KEYS, updatedKeys);
        }
    };

    const addCustomModel = (provider: string, model: string) => {
        if (!model.trim()) return;
        const currentModels = customModels[provider] || [];
        if (!currentModels.includes(model)) {
            const newModels = {
                ...customModels,
                [provider]: [...currentModels, model]
            };
            setCustomModels(newModels);
            StorageManager.setJSON(STORAGE_KEYS.CUSTOM_MODELS, newModels);
            alert(`模型 "${model}" 已添加到列表`);
        }
    };

    const removeCustomModel = (provider: string, model: string) => {
        if (confirm(`确定要从列表中移除 "${model}" 吗？`)) {
            const currentModels = customModels[provider] || [];
            const newModels = {
                ...customModels,
                [provider]: currentModels.filter(m => m !== model)
            };
            setCustomModels(newModels);
            StorageManager.setJSON(STORAGE_KEYS.CUSTOM_MODELS, newModels);

            // If the removed model was selected, you might want to reset it, 
            // but for now let's keep it as a "custom" value (which it will become since it's no longer in the list)
        }
    };

    const handleChatProviderChange = (newProvider: string) => {
        // Logic: Try to find a saved key for this provider to auto-fill? 
        // Or use the cache map? Let's use the cache map for continuity.
        const cachedKey = providerKeys[newProvider];

        setChatProvider(newProvider);

        if (cachedKey) {
            setChatApiKey(cachedKey);
        } else {
            // If no cache, try to find the first saved key for this provider
            const defaultSavedKey = savedKeys.find(k => k.provider === newProvider);
            if (defaultSavedKey) {
                setChatApiKey(defaultSavedKey.key);
            } else {
                setChatApiKey('');
            }
        }

        if (newProvider === 'siliconflow') {
            setChatBaseUrl('https://api.siliconflow.cn/v1');
            setChatModel('deepseek-ai/DeepSeek-V3');
        } else if (newProvider === 'openai') {
            setChatBaseUrl('https://api.openai.com/v1');
            setChatModel('gpt-4o');
        } else if (newProvider === 'vectorengine') {
            setChatBaseUrl('https://api.vectorengine.ai/v1');
            setChatModel('gpt-5.2');
        } else if (newProvider === 'alibaba') {
            setChatBaseUrl('https://dashscope.aliyuncs.com/compatible-mode/v1');
            setChatModel('qwen-plus');
        } else {
            setChatBaseUrl('');
            setChatModel('');
        }
    };

    const handleProviderChange = (type: 'rag' | 'writing' | 'big_model' | 'chat' | 'image' | 'vector', newProvider: string) => {
        if (type === 'chat') {
            handleChatProviderChange(newProvider);
            return;
        }

        let setUrl, setModel, setProvider, setKey;

        if (type === 'rag') {
            setUrl = setRagBaseUrl;
            setModel = setRagModel;
            setProvider = setRagProvider;
            setKey = setRagApiKey;
        } else if (type === 'big_model') {
            setUrl = setBigModelBaseUrl;
            setModel = setBigModelModel;
            setProvider = setBigModelProvider;
            setKey = setBigModelApiKey;
        } else if (type === 'image') {
            setUrl = setImageBaseUrl;
            setModel = setImageModel;
            setProvider = setImageProvider;
            setKey = setImageApiKey;
        } else if (type === 'vector') {
            setUrl = setVectorBaseUrl;
            setModel = setVectorModel;
            setProvider = setVectorProvider;
            setKey = setVectorApiKey;
        } else {
            setUrl = setWritingBaseUrl;
            setModel = setWritingModel;
            setProvider = setWritingProvider;
            setKey = setWritingApiKey;
        }

        setProvider(newProvider);

        // Auto-fill key from saved keys if available
        const defaultSavedKey = savedKeys.find(k => k.provider === newProvider);
        if (defaultSavedKey) {
            setKey(defaultSavedKey.key);
        } else {
            setKey('');
        }

        if (newProvider === 'siliconflow') {
            setUrl('https://api.siliconflow.cn/v1');
            if (type === 'vector') {
                setModel('text-embedding-3-large');
            } else if (type === 'big_model') {
                setModel('deepseek-ai/DeepSeek-V3');
            } else if (type === 'image') {
                setModel('Qwen/Qwen-Image');
            } else {
                setModel('deepseek-ai/DeepSeek-R1');
            }
        } else if (newProvider === 'openai') {
            setUrl('https://api.openai.com/v1');
            if (type === 'vector') {
                setModel('text-embedding-3-large');
            } else if (type === 'image') {
                setModel('dall-e-3');
            } else {
                setModel('gpt-4o');
            }
        } else if (newProvider === 'vectorengine') {
            setUrl('https://api.vectorengine.ai/v1');
            if (type === 'vector') {
                setModel('text-embedding-3-large');
            } else if (type === 'image') {
                setModel('grok-4-image');
            } else {
                setModel('gpt-5.2');
            }
        } else if (newProvider === 'alibaba') {
            setUrl('https://dashscope.aliyuncs.com/compatible-mode/v1');
            if (type === 'vector') {
                setModel('text-embedding-3-large');
            } else if (type === 'image') {
                setModel('wanx-v1');
            } else {
                setModel('qwen-plus');
            }
        } else if (newProvider === 'iflow') {
            setUrl('https://apis.iflow.cn/v1');
            if (type === 'vector') {
                setModel('text-embedding-3-large');
            } else if (type === 'image') {
                setModel('black-forest-labs/FLUX.1-dev');
            } else {
                setModel('deepseek-ai/DeepSeek-V3');
            }
        }
    };

    const testConnection = async (type: 'rag' | 'writing' | 'big_model' | 'chat' | 'image' | 'vector') => {
        let apiKey, baseUrl, setStatus;

        if (type === 'rag') {
            apiKey = ragApiKey;
            baseUrl = ragBaseUrl;
            setStatus = setRagStatus;
        } else if (type === 'vector') {
            apiKey = vectorApiKey;
            baseUrl = vectorBaseUrl;
            setStatus = setVectorStatus;
        } else if (type === 'big_model') {
            apiKey = bigModelApiKey;
            baseUrl = bigModelBaseUrl;
            setStatus = setBigModelStatus;
        } else if (type === 'chat') {
            apiKey = chatApiKey;
            baseUrl = chatBaseUrl;
            setStatus = setChatStatus;
        } else if (type === 'image') {
            apiKey = imageApiKey;
            baseUrl = imageBaseUrl;
            setStatus = setImageStatus;
        } else {
            apiKey = writingApiKey;
            baseUrl = writingBaseUrl;
            setStatus = setWritingStatus;
        }

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

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert('图片大小不能超过 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setUserAvatar(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        StorageManager.set(STORAGE_KEYS.USER_AVATAR, userAvatar);

        StorageManager.set(STORAGE_KEYS.RAG_PROVIDER, ragProvider);
        StorageManager.set(STORAGE_KEYS.RAG_API_KEY, ragApiKey);
        StorageManager.set(STORAGE_KEYS.RAG_BASE_URL, ragBaseUrl);
        StorageManager.set(STORAGE_KEYS.RAG_MODEL, ragModel);

        StorageManager.set(STORAGE_KEYS.VECTOR_PROVIDER, vectorProvider);
        StorageManager.set(STORAGE_KEYS.VECTOR_API_KEY, vectorApiKey);
        StorageManager.set(STORAGE_KEYS.VECTOR_BASE_URL, vectorBaseUrl);
        StorageManager.set(STORAGE_KEYS.VECTOR_MODEL, vectorModel);

        StorageManager.set(STORAGE_KEYS.BIG_MODEL_PROVIDER, bigModelProvider);
        StorageManager.set(STORAGE_KEYS.BIG_MODEL_API_KEY, bigModelApiKey);
        StorageManager.set(STORAGE_KEYS.BIG_MODEL_BASE_URL, bigModelBaseUrl);
        StorageManager.set(STORAGE_KEYS.BIG_MODEL_MODEL, bigModelModel);

        StorageManager.set(STORAGE_KEYS.WRITING_PROVIDER, writingProvider);
        StorageManager.set(STORAGE_KEYS.WRITING_API_KEY, writingApiKey);
        StorageManager.set(STORAGE_KEYS.WRITING_BASE_URL, writingBaseUrl);
        StorageManager.set(STORAGE_KEYS.WRITING_MODEL, writingModel);

        StorageManager.set(STORAGE_KEYS.CHAT_PROVIDER, chatProvider);
        StorageManager.set(STORAGE_KEYS.CHAT_API_KEY, chatApiKey);
        StorageManager.set(STORAGE_KEYS.CHAT_BASE_URL, chatBaseUrl);
        StorageManager.set(STORAGE_KEYS.CHAT_MODEL, chatModel);

        StorageManager.set(STORAGE_KEYS.IMAGE_PROVIDER, imageProvider);
        StorageManager.set(STORAGE_KEYS.IMAGE_API_KEY, imageApiKey);
        StorageManager.set(STORAGE_KEYS.IMAGE_BASE_URL, imageBaseUrl);
        StorageManager.set(STORAGE_KEYS.IMAGE_MODEL, imageModel);

        // Update cache map for FloatingAI
        const newProviderKeys = { ...providerKeys };
        // Update keys for active providers
        if (ragApiKey) newProviderKeys[ragProvider] = ragApiKey;
        if (bigModelApiKey) newProviderKeys[bigModelProvider] = bigModelApiKey;
        if (writingApiKey) newProviderKeys[writingProvider] = writingApiKey;
        if (chatApiKey) newProviderKeys[chatProvider] = chatApiKey;
        if (imageApiKey) newProviderKeys[imageProvider] = imageApiKey;

        setProviderKeys(newProviderKeys);
        StorageManager.setJSON('novel_writer_chat_provider_keys', newProviderKeys);

        // Save Editor Config (Merge with existing to preserve fontSize etc)
        const mergedEditorConfig = { ...editorConfigBaseRef.current, ...editorConfig };
        editorConfigBaseRef.current = mergedEditorConfig;
        StorageManager.setJSON('editor_config', mergedEditorConfig);

        // Save MAX Mode Setting
        StorageManager.set(STORAGE_KEYS.ENABLE_MAX_MODE, String(isMaxModeEnabled));
        // Dispatch custom event to notify Sidebar
        window.dispatchEvent(new Event('local-storage-update'));

        // Trigger Cloud Sync if logged in (Silent)
        StorageManager.syncToCloud().catch(() => { });

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleCloudBackup = async () => {
        setSyncStatus('loading');
        try {
            const success = await StorageManager.syncToCloud();
            if (success) {
                setSyncStatus('success');
                alert('设置已成功备份到云端！');
            } else {
                setSyncStatus('error');
                alert('备份失败：请确保您已登录。');
            }
        } catch (e) {
            setSyncStatus('error');
            alert('备份失败：网络错误');
        }
        setTimeout(() => setSyncStatus('idle'), 3000);
    };

    const handleCloudRestore = async () => {
        if (!confirm('确定要从云端恢复设置吗？这将覆盖当前本地设置。')) return;

        setSyncStatus('loading');
        try {
            const success = await StorageManager.syncFromCloud();
            if (success) {
                setSyncStatus('success');
                alert('设置已成功从云端恢复！页面将刷新以应用更改。');
                window.location.reload();
            } else {
                setSyncStatus('error');
                alert('恢复失败：未找到云端备份或未登录。');
            }
        } catch (e) {
            setSyncStatus('error');
            alert('恢复失败：网络错误');
        }
        setTimeout(() => setSyncStatus('idle'), 3000);
    };

    const getButtonClass = (status: TestStatus) => {
        switch (status) {
            case 'success': return 'bg-green-600 text-white hover:bg-green-700';
            case 'error': return 'bg-red-600 text-white hover:bg-red-700';
            case 'loading': return 'bg-gray-400 text-white cursor-wait';
            default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300';
        }
    };

    const getButtonContent = (status: TestStatus) => {
        switch (status) {
            case 'success': return <><Check className="w-4 h-4 mr-2" /> 连接成功</>;
            case 'error': return <><X className="w-4 h-4 mr-2" /> 连接失败</>;
            case 'loading': return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 测试中...</>;
            default: return '测试连接';
        }
    };

    const renderImageModelInput = (provider: string, model: string, setModel: (m: string) => void) => {
        const predefinedModels = IMAGE_MODELS[provider as keyof typeof IMAGE_MODELS] || [];
        const userCustomModels = customModels[provider] || [];
        const availableModels = [...predefinedModels, ...userCustomModels];

        if (predefinedModels.length > 0 || userCustomModels.length > 0) {
            const isKnownModel = availableModels.includes(model);
            const showInput = !isKnownModel;
            const isUserCustom = userCustomModels.includes(model);

            return (
                <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                        <select
                            value={isKnownModel ? model : 'custom'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                    setModel('');
                                } else {
                                    setModel(val);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white flex-1"
                        >
                            {predefinedModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            {userCustomModels.length > 0 && (
                                <optgroup label="自定义保存 (Saved)">
                                    {userCustomModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </optgroup>
                            )}
                            <option value="custom">自定义 / 手动输入 (Custom)</option>
                        </select>
                        {isUserCustom && (
                            <button
                                onClick={() => removeCustomModel(provider, model)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="从列表删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {showInput && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                placeholder="输入模型名称..."
                            />
                            {model && (
                                <button
                                    onClick={() => addCustomModel(provider, model)}
                                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                                    title="保存到列表"
                                >
                                    <Plus className="w-4 h-4" /> 保存
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex gap-2">
                <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder={provider === 'custom' ? "输入模型名称..." : ""}
                />
                {model && (
                    <button
                        onClick={() => addCustomModel(provider, model)}
                        className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                        title="保存到列表"
                    >
                        <Plus className="w-4 h-4" /> 保存
                    </button>
                )}
            </div>
        );
    };

    const renderVectorModelInput = (provider: string, model: string, setModel: (m: string) => void) => {
        const predefinedModels = VECTOR_MODELS[provider as keyof typeof VECTOR_MODELS] || [];
        const userCustomModels = customModels[provider] || [];
        const availableModels = [...predefinedModels, ...userCustomModels];

        if (predefinedModels.length > 0 || userCustomModels.length > 0) {
            const isKnownModel = availableModels.includes(model);
            const showInput = !isKnownModel;
            const isUserCustom = userCustomModels.includes(model);

            return (
                <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                        <select
                            value={isKnownModel ? model : 'custom'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                    setModel('');
                                } else {
                                    setModel(val);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white flex-1"
                        >
                            {predefinedModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            {userCustomModels.length > 0 && (
                                <optgroup label="自定义保存 (Saved)">
                                    {userCustomModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </optgroup>
                            )}
                            <option value="custom">自定义 / 手动输入 (Custom)</option>
                        </select>
                        {isUserCustom && (
                            <button
                                onClick={() => removeCustomModel(provider, model)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="从列表删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {showInput && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                placeholder="输入模型名称..."
                            />
                            {model && (
                                <button
                                    onClick={() => addCustomModel(provider, model)}
                                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                                    title="保存到列表"
                                >
                                    <Plus className="w-4 h-4" /> 保存
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex gap-2">
                <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder={provider === 'custom' ? "输入模型名称..." : ""}
                />
                {model && (
                    <button
                        onClick={() => addCustomModel(provider, model)}
                        className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                        title="保存到列表"
                    >
                        <Plus className="w-4 h-4" /> 保存
                    </button>
                )}
            </div>
        );
    };

    const renderModelInput = (provider: string, model: string, setModel: (m: string) => void) => {
        const predefinedModels = PROVIDER_MODELS[provider as keyof typeof PROVIDER_MODELS] || [];
        const userCustomModels = customModels[provider] || [];
        const availableModels = [...predefinedModels, ...userCustomModels];

        if (predefinedModels.length > 0 || userCustomModels.length > 0) {
            const isKnownModel = availableModels.includes(model);
            const showInput = !isKnownModel;
            const isUserCustom = userCustomModels.includes(model);

            return (
                <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                        <select
                            value={isKnownModel ? model : 'custom'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                    setModel('');
                                } else {
                                    setModel(val);
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white flex-1"
                        >
                            {predefinedModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            {userCustomModels.length > 0 && (
                                <optgroup label="自定义保存 (Saved)">
                                    {userCustomModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </optgroup>
                            )}
                            <option value="custom">自定义 / 手动输入 (Custom)</option>
                        </select>
                        {isUserCustom && (
                            <button
                                onClick={() => removeCustomModel(provider, model)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="从列表删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {showInput && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                placeholder="输入模型名称..."
                            />
                            {model && (
                                <button
                                    onClick={() => addCustomModel(provider, model)}
                                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                                    title="保存到列表"
                                >
                                    <Plus className="w-4 h-4" /> 保存
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex gap-2">
                <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    placeholder={provider === 'custom' ? "输入模型名称..." : ""}
                />
                {model && (
                    <button
                        onClick={() => addCustomModel(provider, model)}
                        className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                        title="保存到列表"
                    >
                        <Plus className="w-4 h-4" /> 保存
                    </button>
                )}
            </div>
        );
    };

    const renderKeySelector = (provider: string, currentKey: string, setKey: (k: string) => void) => {
        const availableKeys = savedKeys.filter(k => k.provider === provider);
        const isManual = !availableKeys.some(k => k.key === currentKey) && currentKey !== '';
        const selectedValue = isManual ? 'manual' : currentKey;

        return (
            <div className="space-y-2">
                <select
                    value={selectedValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'manual') {
                            // Keep current key, just show input
                        } else if (val === '') {
                            setKey('');
                        } else {
                            setKey(val);
                        }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                >
                    <option value="">-- 选择已保存的 Key --</option>
                    {availableKeys.map(k => (
                        <option key={k.id} value={k.key}>{k.name}</option>
                    ))}
                    <option disabled>────────────────</option>
                    <option value="manual">手动输入 / 自定义 (Manual Input)</option>
                </select>

                {(selectedValue === 'manual' || selectedValue === '') && (
                    <input
                        type="password"
                        value={currentKey}
                        onChange={(e) => setKey(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                        placeholder="sk-..."
                    />
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">设置</h1>

            {/* UI Theme Settings */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    界面主题 (UI Theme)
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <button
                        onClick={() => handleThemeChange('default')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'default'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#F8F5F0] border border-gray-300 shadow-sm mb-1"></div>
                        <span className="text-sm font-medium">默认 (Default)</span>
                    </button>
                    
                    <button
                        onClick={() => handleThemeChange('pixel')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'pixel'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#e0e0e0] border-2 border-black shadow-[1px_1px_0px_#000] mb-1 font-mono text-[6px] flex items-center justify-center text-black">PIXEL</div>
                        <span className="text-sm font-medium">像素风 (Pixel)</span>
                    </button>
                    
                    <button
                        onClick={() => handleThemeChange('eyecare')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'eyecare'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#A7B5A4] border border-green-300 shadow-sm mb-1"></div>
                        <span className="text-sm font-medium">护眼 (EyeCare)</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('cyberpunk')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'cyberpunk'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#050505] border border-[#00f3ff] shadow-[0_0_8px_#00f3ff] mb-1 font-mono text-[6px] flex items-center justify-center text-[#00f3ff]">NEON</div>
                        <span className="text-sm font-medium">赛博 (Cyber)</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('ios26')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'ios26'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-white border border-gray-100 shadow-lg mb-1 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm"></div>
                        </div>
                        <span className="text-sm font-medium">iOS26</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('vision-os')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'vision-os'
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 hover:border-indigo-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#1a1a1a] border border-white/20 shadow-xl mb-1 flex items-center justify-center overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 blur-sm"></div>
                            <div className="w-4 h-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 z-10"></div>
                        </div>
                        <span className="text-sm font-medium">Vision</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('steampunk')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'steampunk'
                                ? 'border-amber-700 bg-amber-50 text-amber-800'
                                : 'border-gray-200 hover:border-amber-300 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#3d2914] border border-[#b87333] shadow-[0_0_8px_rgba(184,115,51,0.5)] mb-1 flex items-center justify-center overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#cd7f32]/30 to-[#8b4513]/30"></div>
                            <div className="w-3 h-3 rounded-full border-2 border-[#b87333] bg-[#3d2914] z-10 relative">
                                <div className="absolute inset-0.5 rounded-full bg-[#b87333]"></div>
                            </div>
                        </div>
                        <span className="text-sm font-medium">蒸汽朋克</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('retro-gaming')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'retro-gaming'
                                ? 'border-purple-600 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-300 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#1a0a2e] border-2 border-[#ff00ff] shadow-[0_0_8px_rgba(255,0,255,0.5)] mb-1 flex items-center justify-center overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#ff00ff]/20 to-[#00ffff]/20"></div>
                            <div className="grid grid-cols-4 gap-0.5 z-10">
                                <div className="w-1.5 h-1.5 bg-[#ff00ff]"></div>
                                <div className="w-1.5 h-1.5 bg-[#00ffff]"></div>
                                <div className="w-1.5 h-1.5 bg-[#ffff00]"></div>
                                <div className="w-1.5 h-1.5 bg-[#00ff00]"></div>
                            </div>
                        </div>
                        <span className="text-sm font-medium">90年代游戏</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('neumorphism')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'neumorphism'
                                ? 'border-gray-400 bg-gray-100 text-gray-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded-xl bg-[#e0e5ec] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] mb-1 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-[#e0e5ec] shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]"></div>
                        </div>
                        <span className="text-sm font-medium">新拟态</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('bauhaus')}
                        className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                            uiTheme === 'bauhaus'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-200 hover:border-red-200 text-gray-600'
                        }`}
                    >
                        <div className="w-12 h-7 rounded bg-[#fafafa] border-2 border-[#212121] mb-1 flex items-center justify-center overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-4 h-4 bg-[#e53935]"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#1e88e5]"></div>
                            <div className="w-2 h-2 bg-[#fdd835] rotate-45"></div>
                        </div>
                        <span className="text-sm font-medium">包豪斯</span>
                    </button>
                </div>
                <p className="mt-3 text-xs text-gray-500 italic">
                    注：主题切换会同步应用到 MAX 专注模式。
                </p>
            </div>

            {/* Cloud Sync & Avatar Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar Upload (Left/Top) */}
                    <div className="flex flex-col items-center gap-4 min-w-[120px]">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 bg-gray-100 flex items-center justify-center shadow-inner">
                                {userAvatar ? (
                                    <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-gray-300" />
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all duration-200 backdrop-blur-[2px]">
                                <div className="flex flex-col items-center gap-1">
                                    <Upload className="w-5 h-5" />
                                    <span className="text-[10px] font-bold">更换头像</span>
                                </div>
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            </label>
                        </div>
                        <div className="flex flex-col items-center">
                            {userLevel && (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm mb-1 ${getLevelColor(userLevel)}`}>
                                    {getLevelLabel(userLevel)}
                                </span>
                            )}
                            {membershipExpiresAt && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {formatExpiryDate(membershipExpiresAt)} 到期
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info & Sync Controls (Right/Bottom) */}
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                个人账户设置
                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-500 rounded-md border border-blue-100 font-bold uppercase tracking-wider">Cloud Sync</span>
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">设置您的头像并同步 API 配置到云端，以便在多个设备间无缝切换。</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="输入头像 URL..."
                                        value={userAvatar}
                                        onChange={(e) => setUserAvatar(e.target.value)}
                                        className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm focus:border-blue-400 focus:bg-white transition-all"
                                    />
                                    {userAvatar && (
                                        <button
                                            onClick={() => setUserAvatar('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="清除"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <Cloud className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-900">配置云端同步</p>
                                        <p className="text-[11px] text-blue-700/70 leading-tight">加密备份您的所有 API Key 和模型偏好</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={handleCloudBackup}
                                        disabled={syncStatus === 'loading'}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all font-bold text-xs shadow-sm active:scale-95 disabled:opacity-50"
                                    >
                                        {syncStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        备份
                                    </button>
                                    <button
                                        onClick={handleCloudRestore}
                                        disabled={syncStatus === 'loading'}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {syncStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        恢复
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* UI Theme Settings Removed (Moved to Top) */}

            {/* MAX Mode - Only visible to MAX and PROMAX users */}
            {(userLevel === 'MAX' || userLevel === 'PROMAX') && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Maximize2 className="w-5 h-5 text-orange-500" />
                        MAX 专注模式
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">开启 MAX 创作中心</p>
                                <p className="text-sm text-gray-500">
                                    开启后将隐藏 0.5~6 号模块，仅保留 MAX 创作中心，提供更沉浸的创作体验。
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isMaxModeEnabled}
                                    onChange={(e) => {
                                        const newValue = e.target.checked;
                                        setIsMaxModeEnabled(newValue);
                                        // Immediate save and update for Sidebar reaction
                                        StorageManager.set(STORAGE_KEYS.ENABLE_MAX_MODE, String(newValue));
                                        window.dispatchEvent(new Event('local-storage-update'));
                                    }}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI 智能预测与续写 (AI Auto-Complete)
                </h2>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800">启用自动续写</p>
                            <p className="text-sm text-gray-500">
                                在写作时自动预测后续内容，以灰色文字显示在光标后，按 Tab 键采纳。
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={editorConfig.predictEnabled}
                                onChange={(e) => setEditorConfig(prev => ({ ...prev, predictEnabled: e.target.checked }))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className={`space-y-6 transition-opacity duration-200 ${editorConfig.predictEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-700">
                                <span>单次续写字数</span>
                                <span className="font-bold text-indigo-600">{editorConfig.predictLength} 字</span>
                            </div>
                            <input
                                type="range"
                                min="15"
                                max="200"
                                step="5"
                                value={editorConfig.predictLength}
                                onChange={(e) => setEditorConfig(prev => ({ ...prev, predictLength: parseInt(e.target.value) }))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>15</span>
                                <span>200</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-700">
                                <span>触发延迟 (停顿多久后触发)</span>
                                <span className="font-bold text-indigo-600">{editorConfig.predictThreshold / 1000} 秒</span>
                            </div>
                            <input
                                type="range"
                                min="500"
                                max="5000"
                                step="500"
                                value={editorConfig.predictThreshold}
                                onChange={(e) => setEditorConfig(prev => ({ ...prev, predictThreshold: parseInt(e.target.value) }))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>0.5s</span>
                                <span>5.0s</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage Stats - Visible to all */}
            <div className="mb-8">
                <TokenUsageDisplay variant={(uiTheme === 'cyberpunk' || uiTheme === 'vision-os' || uiTheme === 'retro-gaming') ? 'dark' : 'light'} userQuota={userQuota} userLevel={userLevel} />
            </div>

            {/* Model Capability Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    模型能力参考 (Model Capabilities)
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {['siliconflow', 'vectorengine'].map(provider => (
                        <div key={provider} className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`w-2 h-8 rounded-full ${provider === 'siliconflow' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                <h3 className="font-bold text-lg text-gray-800">{PROVIDER_NAMES[provider]}</h3>
                            </div>
                            
                            <div className="space-y-3">
                                {Array.from(new Set(PROVIDER_MODELS[provider] || [])).map(model => {
                                    const scores = MODEL_SCORES[model] || { text: 8.0, logic: 8.0, understanding: 8.0 };
                                    return (
                                        <div key={model} className="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-sm text-gray-800">{model.split('/').pop()}</span>
                                                <span className="text-[9px] text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-[120px]" title={model}>{model}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 mb-1">文本 (Text)</div>
                                                    <ScoreBar score={scores.text} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-500 mb-1">逻辑 (Logic)</div>
                                                    <ScoreBar score={scores.logic} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-500 mb-1">理解 (Und.)</div>
                                                    <ScoreBar score={scores.understanding} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Model & API Settings - Only visible to PROMAX */}
            {userLevel === 'PROMAX' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Global Key Management Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-8 lg:col-span-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                        
                        <div className="relative">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-lg">
                                    <Key className="w-5 h-5" />
                                </div>
                                API Key 库 (Key Library)
                            </h2>
                            <p className="text-sm text-gray-500 mt-2">在此处统一管理您的 API Key，命名后可在下方各模块中直接选择使用，数据仅存储在本地或同步至云端。</p>
                        </div>

                        {/* Add New Key Form - Redesigned */}
                        <div className="bg-gray-50/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/60 shadow-inner">
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-gray-700">
                                <Plus className="w-4 h-4 text-gray-900" /> 
                                添加新 Key
                            </h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="flex-[2]">
                                    <select
                                        value={newKeyProvider}
                                        onChange={(e) => setNewKeyProvider(e.target.value)}
                                        className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all appearance-none cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                                    >
                                        <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                                        <option value="iflow">心流 API (iFlow)</option>
                                        <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                        <option value="alibaba">阿里大模型 (Alibaba)</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="custom">自定义 (Custom)</option>
                                    </select>
                                </div>
                                <div className="flex-[3]">
                                    <input
                                        type="text"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                                        placeholder="Key 名称 (如: 个人DeepSeek)"
                                    />
                                </div>
                                <div className="flex-[4] relative">
                                    <input
                                        type={showKeyInput ? "text" : "password"}
                                        value={newKeyValue}
                                        onChange={(e) => setNewKeyValue(e.target.value)}
                                        className="w-full h-11 px-4 pr-10 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                                        placeholder="sk-..."
                                    />
                                    <button
                                        onClick={() => setShowKeyInput(!showKeyInput)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="flex-[1.5]">
                                    <button
                                        onClick={handleAddKey}
                                        className="w-full h-11 bg-gray-900 text-white rounded-xl hover:bg-black text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        添加
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Key List - Card Style */}
                        <div className="space-y-3">
                            {savedKeys.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                                    <ShieldCheck className="w-12 h-12 text-gray-200 mb-3" />
                                    <p className="text-sm text-gray-400">暂无保存的 Key，请在上方添加</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {savedKeys.map(key => (
                                        <div key={key.id} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all duration-300">
                                                    <Key className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-800">{key.name}</span>
                                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                            {PROVIDER_NAMES[key.provider] || key.provider}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-400 mt-0.5">
                                                        {key.key.slice(0, 12)}••••••••{key.key.slice(-4)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

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
                                <option value="iflow">心流 API (iFlow)</option>
                                <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                <option value="alibaba">阿里大模型 (Alibaba)</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                            {renderKeySelector(ragProvider, ragApiKey, setRagApiKey)}
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
                            {renderModelInput(ragProvider, ragModel, setRagModel)}
                        </div>

                        <button
                            onClick={() => testConnection('rag')}
                            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(ragStatus)}`}
                            disabled={ragStatus === 'loading'}
                        >
                            {getButtonContent(ragStatus)}
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                            向量模型 (Embedding)
                        </h2>
                        <p className="text-sm text-gray-500">用于拆书向量检索与索引构建 (模块 MAX)</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">服务商</label>
                            <select
                                value={vectorProvider}
                                onChange={(e) => handleProviderChange('vector', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                            >
                                <option value="custom">自定义 (Custom)</option>
                                <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                                <option value="iflow">心流 API (iFlow)</option>
                                <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                <option value="alibaba">阿里大模型 (Alibaba)</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                            {renderKeySelector(vectorProvider, vectorApiKey, setVectorApiKey)}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                            <input
                                type="text"
                                value={vectorBaseUrl}
                                onChange={(e) => setVectorBaseUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                disabled={vectorProvider !== 'custom'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                            {renderVectorModelInput(vectorProvider, vectorModel, setVectorModel)}
                        </div>

                        <button
                            onClick={() => testConnection('vector')}
                            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(vectorStatus)}`}
                            disabled={vectorStatus === 'loading'}
                        >
                            {getButtonContent(vectorStatus)}
                        </button>
                    </div>

                    {/* Big Model Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                            大文本模型 (Big Model)
                        </h2>
                        <p className="text-sm text-gray-500">用于拆书分析、长文本处理 (模块 0.5)</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">服务商</label>
                            <select
                                value={bigModelProvider}
                                onChange={(e) => handleProviderChange('big_model', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                            >
                                <option value="custom">自定义 (Custom)</option>
                                <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                                <option value="iflow">心流 API (iFlow)</option>
                                <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                <option value="alibaba">阿里大模型 (Alibaba)</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                            {renderKeySelector(bigModelProvider, bigModelApiKey, setBigModelApiKey)}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                            <input
                                type="text"
                                value={bigModelBaseUrl}
                                onChange={(e) => setBigModelBaseUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                disabled={bigModelProvider !== 'custom'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                            {renderModelInput(bigModelProvider, bigModelModel, setBigModelModel)}
                        </div>

                        <button
                            onClick={() => testConnection('big_model')}
                            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(bigModelStatus)}`}
                            disabled={bigModelStatus === 'loading'}
                        >
                            {getButtonContent(bigModelStatus)}
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
                                <option value="iflow">心流 API (iFlow)</option>
                                <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                <option value="alibaba">阿里大模型 (Alibaba)</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                            {renderKeySelector(writingProvider, writingApiKey, setWritingApiKey)}
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
                            {renderModelInput(writingProvider, writingModel, setWritingModel)}
                        </div>

                        <button
                            onClick={() => testConnection('writing')}
                            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(writingStatus)}`}
                            disabled={writingStatus === 'loading'}
                        >
                            {getButtonContent(writingStatus)}
                        </button>
                    </div>

                    {/* Chat Model Section (Floating AI) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                            墨灵助手 (Floating AI)
                        </h2>
                        <p className="text-sm text-gray-500">用于右下角悬浮助手对话</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">服务商</label>
                            <select
                                value={chatProvider}
                                onChange={(e) => handleProviderChange('chat', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                            >
                                <option value="custom">自定义 (Custom)</option>
                                <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                                <option value="iflow">心流 API (iFlow)</option>
                                <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                <option value="alibaba">阿里大模型 (Alibaba)</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                            {renderKeySelector(chatProvider, chatApiKey, setChatApiKey)}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                            <input
                                type="text"
                                value={chatBaseUrl}
                                onChange={(e) => setChatBaseUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                disabled={chatProvider !== 'custom'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                            {renderModelInput(chatProvider, chatModel, setChatModel)}
                        </div>

                        <button
                            onClick={() => testConnection('chat')}
                            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(chatStatus)}`}
                            disabled={chatStatus === 'loading'}
                        >
                            {getButtonContent(chatStatus)}
                        </button>
                    </div>

                    {/* Image Generation Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
                            AI 生图 (Image Generation)
                        </h2>
                        <p className="text-sm text-gray-500">用于墨灵助手的文生图功能</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">服务商</label>
                            <select
                                value={imageProvider}
                                onChange={(e) => handleProviderChange('image', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                            >
                                <option value="custom">自定义 (Custom)</option>
                                <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                                <option value="iflow">心流 API (iFlow)</option>
                                <option value="vectorengine">向量引擎 (VectorEngine)</option>
                                <option value="alibaba">阿里大模型 (Alibaba)</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                            {renderKeySelector(imageProvider, imageApiKey, setImageApiKey)}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                            <input
                                type="text"
                                value={imageBaseUrl}
                                onChange={(e) => setImageBaseUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                                disabled={imageProvider !== 'custom'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                            {renderImageModelInput(imageProvider, imageModel, setImageModel)}
                        </div>

                        <button
                            onClick={() => testConnection('image')}
                            className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center ${getButtonClass(imageStatus)}`}
                            disabled={imageStatus === 'loading'}
                        >
                            {getButtonContent(imageStatus)}
                        </button>
                    </div>
                </div>
            )}

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
