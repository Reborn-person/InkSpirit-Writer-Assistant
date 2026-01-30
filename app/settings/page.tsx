'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2, Upload, User, Plus, Trash2, Eye, EyeOff, Edit2, Sparkles, Maximize2, Cloud, Download } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { TokenUsageDisplay } from '@/components/TokenUsageDisplay';
import { PROVIDER_MODELS, VECTOR_MODELS, IMAGE_MODELS, PROVIDER_NAMES } from '@/lib/models';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export default function SettingsPage() {
    // Avatar Configuration
    const [userAvatar, setUserAvatar] = useState('');
    const [userLevel, setUserLevel] = useState<'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX' | null>(null);
    const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(null);

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

            {/* Avatar Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex items-center gap-6">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                        {userAvatar ? (
                            <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-gray-400" />
                        )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                        <Upload className="w-6 h-6" />
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-gray-800">个人头像</h2>
                        {userLevel && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${getLevelColor(userLevel)}`}>
                                {getLevelLabel(userLevel)}
                            </span>
                        )}
                        {membershipExpiresAt && (
                            <span className="text-xs text-gray-500">
                                到期 {formatExpiryDate(membershipExpiresAt)}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">设置您的个性化头像，它将显示在侧边栏并作为折叠按钮。</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="或者输入图片 URL..."
                            value={userAvatar}
                            onChange={(e) => setUserAvatar(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                        />
                        <button
                            onClick={() => setUserAvatar('')}
                            className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors"
                        >
                            清除
                        </button>
                    </div>
                </div>
            </div>

            {/* MAX Mode - Only visible to MAX and PROMAX users */}
            {(process.env.NODE_ENV !== 'production' || userLevel === 'MAX' || userLevel === 'PROMAX') && (
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

            {/* Global Key Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Token Usage Stats - New Position */}
                <div className="lg:col-span-2">
                     <TokenUsageDisplay variant="light" />
                </div>

                {/* Cloud Sync Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                        <span className="w-1 h-6 bg-blue-400 rounded-full"></span>
                        云端备份与同步 (Cloud Sync)
                    </h2>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div>
                            <h3 className="font-medium text-blue-900 flex items-center gap-2">
                                <Cloud className="w-5 h-5" /> API 配置云端同步
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                                将您的所有 API Key 和模型配置安全地备份到云端服务器，以便在不同设备间同步。
                                <br /><span className="text-xs opacity-75">注意：数据经过高强度加密存储，仅您本人可解密。</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloudBackup}
                                disabled={syncStatus === 'loading'}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium shadow-sm"
                            >
                                {syncStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                立即备份
                            </button>
                            <button
                                onClick={handleCloudRestore}
                                disabled={syncStatus === 'loading'}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                            >
                                {syncStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                从云端恢复
                            </button>
                        </div>
                    </div>
                </div>

                {/* Global Key Management Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6 lg:col-span-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <span className="w-1 h-6 bg-gray-500 rounded-full"></span>
                        API Key 库 (Key Library)
                    </h2>
                    <p className="text-sm text-gray-500">在此处统一管理各服务商的 API Key，命名后可在下方各模块中直接选择使用。</p>

                    {/* Add New Key Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                            <Plus className="w-4 h-4" /> 添加新 Key
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-3">
                                <select
                                    value={newKeyProvider}
                                    onChange={(e) => setNewKeyProvider(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                                >
                                    {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
                                        <option key={key} value={key}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                    placeholder="Key 名称 (如: 个人DeepSeek)"
                                />
                            </div>
                            <div className="md:col-span-4 relative">
                                <input
                                    type={showKeyInput ? "text" : "password"}
                                    value={newKeyValue}
                                    onChange={(e) => setNewKeyValue(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm pr-8"
                                    placeholder="sk-..."
                                />
                                <button
                                    onClick={() => setShowKeyInput(!showKeyInput)}
                                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    onClick={handleAddKey}
                                    className="w-full px-3 py-2 bg-daiqing text-white rounded-lg hover:bg-daiqing/90 text-sm font-medium transition-colors"
                                >
                                    添加
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Key List */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">名称</th>
                                    <th className="px-4 py-3">服务商</th>
                                    <th className="px-4 py-3">Key (预览)</th>
                                    <th className="px-4 py-3 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savedKeys.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                                            暂无保存的 Key，请在上方添加
                                        </td>
                                    </tr>
                                ) : (
                                    savedKeys.map(key => (
                                        <tr key={key.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{key.name}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {PROVIDER_NAMES[key.provider] || key.provider}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-500">
                                                {key.key.slice(0, 8)}...{key.key.slice(-4)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
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
