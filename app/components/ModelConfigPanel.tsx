import React, { useEffect, useMemo, useState } from 'react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { PROVIDER_MODELS, PROVIDER_NAMES } from '@/lib/models';

export interface ModelConfig {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    customModel?: string;
}

interface Props {
    moduleKey: string; // e.g., 'idea', 'outline'
    onConfigChange: (config: ModelConfig) => void;
    className?: string;
}

export function ModelConfigPanel({ moduleKey, onConfigChange, className = '' }: Props) {
    const kind = useMemo(() => {
        if (moduleKey === 'consistency') return 'rag';
        if (moduleKey === 'creation' || moduleKey === 'polish' || moduleKey === 'humanizer') return 'writing';
        return 'big';
    }, [moduleKey]);

    const [provider, setProvider] = useState('vectorengine');
    const [model, setModel] = useState('');
    const [options, setOptions] = useState<string[]>([]);

    const storageKeys = useMemo(() => {
        if (kind === 'rag') {
            return {
                providerKey: STORAGE_KEYS.RAG_PROVIDER,
                apiKey: STORAGE_KEYS.RAG_API_KEY,
                baseUrl: STORAGE_KEYS.RAG_BASE_URL,
                model: STORAGE_KEYS.RAG_MODEL,
                defaultModel: 'deepseek-ai/DeepSeek-R1'
            };
        }
        if (kind === 'writing') {
            return {
                providerKey: STORAGE_KEYS.WRITING_PROVIDER,
                apiKey: STORAGE_KEYS.WRITING_API_KEY,
                baseUrl: STORAGE_KEYS.WRITING_BASE_URL,
                model: STORAGE_KEYS.WRITING_MODEL,
                defaultModel: 'gpt-5.1'
            };
        }
        return {
            providerKey: STORAGE_KEYS.BIG_MODEL_PROVIDER,
            apiKey: STORAGE_KEYS.BIG_MODEL_API_KEY,
            baseUrl: STORAGE_KEYS.BIG_MODEL_BASE_URL,
            model: STORAGE_KEYS.BIG_MODEL_MODEL,
            defaultModel: 'deepseek-ai/DeepSeek-V3'
        };
    }, [kind]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const providerKey = StorageManager.get(storageKeys.providerKey) || 'vectorengine';
            const currentModel = StorageManager.get(storageKeys.model) || storageKeys.defaultModel;
            const providerKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
            const apiKey = providerKeys[providerKey] || StorageManager.get(storageKeys.apiKey) || StorageManager.get('novel_writer_api_key') || '';
            const baseUrl = StorageManager.get(storageKeys.baseUrl) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';

            const customMap = (await StorageManager.getJSONAsync(STORAGE_KEYS.CUSTOM_MODELS)) || StorageManager.getJSON(STORAGE_KEYS.CUSTOM_MODELS) || {};
            const allOptions: string[] = [];
            Object.keys(PROVIDER_MODELS).forEach(key => {
                const predefined = PROVIDER_MODELS[key] || [];
                const customForProvider = customMap[key] || [];
                allOptions.push(...predefined, ...customForProvider);
            });

            const nextOptions = Array.from(new Set([currentModel, ...allOptions].filter(Boolean)));

            if (cancelled) return;
            setProvider(providerKey);
            setModel(currentModel);
            setOptions(nextOptions);
            onConfigChange({ provider: providerKey, model: currentModel, apiKey, baseUrl });
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [moduleKey, onConfigChange, storageKeys]);

    const updateModel = async (newModel: string) => {
        const customMap = (await StorageManager.getJSONAsync(STORAGE_KEYS.CUSTOM_MODELS)) || StorageManager.getJSON(STORAGE_KEYS.CUSTOM_MODELS) || {};
        let nextProvider = provider || (StorageManager.get(storageKeys.providerKey) || 'vectorengine');

        Object.keys(PROVIDER_MODELS).some(key => {
            const list = PROVIDER_MODELS[key] || [];
            if (list.includes(newModel)) {
                nextProvider = key;
                return true;
            }
            return false;
        });

        if (nextProvider === 'siliconflow') {
            Object.keys(customMap).some(key => {
                const list = customMap[key] || [];
                if (Array.isArray(list) && list.includes(newModel)) {
                    nextProvider = key;
                    return true;
                }
                return false;
            });
        }

        StorageManager.set(storageKeys.providerKey, nextProvider);
        StorageManager.set(storageKeys.model, newModel);

        const providerKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
        const apiKey = providerKeys[nextProvider] || StorageManager.get(storageKeys.apiKey) || StorageManager.get('novel_writer_api_key') || '';
        const baseUrl = StorageManager.get(storageKeys.baseUrl) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';

        setProvider(nextProvider);
        setModel(newModel);
        onConfigChange({ provider: nextProvider, model: newModel, apiKey, baseUrl });
    };

    const providerLabel = PROVIDER_NAMES[provider] || provider;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-xs text-max-text-muted whitespace-nowrap">{providerLabel}</span>
            <select
                value={model || ''}
                onChange={(e) => { void updateModel(e.target.value); }}
                className="text-xs text-max-text bg-max-surface border border-max-border rounded-lg px-2 py-1 outline-none focus:border-max-accent max-w-[220px]"
                title="选择模型"
            >
                {!model && <option value="">请选择模型</option>}
                {options.map(m => (
                    <option key={m} value={m}>
                        {m}
                    </option>
                ))}
            </select>
        </div>
    );
}
