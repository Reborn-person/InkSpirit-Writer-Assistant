'use client';

import React, { useEffect, useState } from 'react';
import { StorageManager, TokenUsageRecord } from '@/lib/storage';
import { BarChart3, TrendingUp, History } from 'lucide-react';

export function TokenUsageDisplay({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
    const [stats, setStats] = useState<{
        total: number;
        today: number;
        byModel: Record<string, number>;
        history: TokenUsageRecord[];
    }>({
        total: 0,
        today: 0,
        byModel: {},
        history: []
    });

    useEffect(() => {
        loadStats();
        // Listen for storage updates
        window.addEventListener('local-storage-update', loadStats);
        return () => window.removeEventListener('local-storage-update', loadStats);
    }, []);

    const loadStats = async () => {
        const data = await StorageManager.getTokenStats();
        if (data) {
            setStats(data);
        }
    };

    const maxUsage = Math.max(...Object.values(stats.byModel), 1);

    const isLight = variant === 'light';
    const containerClass = isLight 
        ? "bg-white border border-gray-200 rounded-xl p-6 w-full shadow-sm" 
        : "bg-[#18181b] border border-white/10 rounded-xl p-4 w-full";
    
    const titleClass = isLight ? "text-gray-800" : "text-gray-300";
    const cardClass = isLight ? "bg-gray-50 border border-gray-100" : "bg-white/5";
    const labelClass = isLight ? "text-gray-500" : "text-gray-400";
    const valueClass = isLight ? "text-gray-900" : "text-white";
    const barBgClass = isLight ? "bg-gray-100" : "bg-white/5";

    return (
        <div className={containerClass}>
            <div className={`flex items-center gap-2 mb-4 ${titleClass}`}>
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span className="font-bold">Token 消耗统计</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`${cardClass} rounded-lg p-3`}>
                    <div className={`text-xs ${labelClass} mb-1 flex items-center gap-1`}>
                        <TrendingUp className="w-3 h-3" />
                        今日消耗
                    </div>
                    <div className={`text-xl font-bold ${valueClass}`}>{stats.today.toLocaleString()}</div>
                </div>
                <div className={`${cardClass} rounded-lg p-3`}>
                    <div className={`text-xs ${labelClass} mb-1 flex items-center gap-1`}>
                        <History className="w-3 h-3" />
                        历史总计
                    </div>
                    <div className={`text-xl font-bold ${valueClass}`}>{stats.total.toLocaleString()}</div>
                </div>
            </div>

            <div className="space-y-3">
                <div className={`text-xs ${labelClass} font-medium uppercase tracking-wider`}>模型消耗排行</div>
                {Object.entries(stats.byModel).map(([model, usage]) => (
                    <div key={model} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className={`${isLight ? 'text-gray-700' : 'text-gray-300'} truncate max-w-[200px]`}>{model}</span>
                            <span className={`${labelClass} font-mono`}>{usage.toLocaleString()}</span>
                        </div>
                        <div className={`h-2 ${barBgClass} rounded-full overflow-hidden`}>
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${(usage / maxUsage) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
                {Object.keys(stats.byModel).length === 0 && (
                    <div className={`text-center text-xs ${labelClass} py-4`}>
                        暂无使用记录
                    </div>
                )}
            </div>
        </div>
    );
}
