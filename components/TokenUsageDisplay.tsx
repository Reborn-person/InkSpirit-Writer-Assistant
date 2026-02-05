'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { StorageManager, TokenUsageRecord } from '@/lib/storage';
import { BarChart3, TrendingUp, History, PieChart, Activity, Award } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabType = 'distribution' | 'trend' | 'proportion' | 'ranking';

export function TokenUsageDisplay({ 
    variant = 'dark',
    userQuota,
    userLevel
}: { 
    variant?: 'dark' | 'light',
    userQuota?: {
        dailyTokensUsed: number;
        dailyTokenLimit: number;
        totalTokensUsed: number;
    } | null,
    userLevel?: string | null
}) {
    const [activeTab, setActiveTab] = useState<TabType>('distribution');
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
        window.addEventListener('local-storage-update', loadStats);
        return () => window.removeEventListener('local-storage-update', loadStats);
    }, []);

    const loadStats = async () => {
        const data = await StorageManager.getTokenStats();
        if (data) {
            setStats(data);
        }
    };

    // Calculate processed data for charts
    const chartData = useMemo(() => {
        const history = stats.history || [];
        
        // Distribution by model (Tokens)
        const modelConsumption = Object.entries(stats.byModel)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        // Call Proportion (Count)
        const callCounts: Record<string, number> = {};
        history.forEach(rec => {
            const key = `${rec.provider}/${rec.model}`;
            callCounts[key] = (callCounts[key] || 0) + 1;
        });
        const modelCalls = Object.entries(callCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Trend (Last 24 hours or last 7 days)
        const hourlyTrend: Record<string, number> = {};
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 3600000);
            const hourStr = d.toISOString().split(':')[0]; // YYYY-MM-DDTHH
            hourlyTrend[hourStr] = 0;
        }
        
        history.forEach(rec => {
            const hourStr = rec.date.split(':')[0];
            if (hourlyTrend[hourStr] !== undefined) {
                hourlyTrend[hourStr] += rec.totalTokens;
            }
        });

        return {
            modelConsumption,
            modelCalls,
            hourlyTrend: Object.entries(hourlyTrend).map(([hour, tokens]) => ({ hour, tokens }))
        };
    }, [stats]);

    const isLight = variant === 'light';
    const containerClass = cn(
        "token-usage-card",
        isLight 
            ? "bg-white border border-gray-200 rounded-2xl p-6 w-full shadow-sm" 
            : "bg-[#18181b] border border-white/10 rounded-2xl p-6 w-full"
    );
    
    const textBase = isLight ? "text-gray-800" : "text-gray-200";
    const textMuted = isLight ? "text-gray-500" : "text-gray-400";
    const cardBg = isLight ? "bg-gray-50/50 border border-gray-100" : "bg-white/5 border border-white/5";

    const tabs = [
        { id: 'distribution', label: '消耗分布', icon: BarChart3 },
        { id: 'trend', label: '消耗趋势', icon: Activity },
        { id: 'proportion', label: '调用占比', icon: PieChart },
        { id: 'ranking', label: '排行榜', icon: Award },
    ] as const;

    return (
        <div className={containerClass}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    <span className={cn("font-bold text-lg", textBase)}>模型数据分析</span>
                </div>
                
                <div className={cn("flex p-1 rounded-xl", isLight ? "bg-gray-100" : "bg-white/5")}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                activeTab === tab.id 
                                    ? (isLight ? "bg-white text-purple-600 shadow-sm" : "bg-purple-500 text-white shadow-lg shadow-purple-500/20")
                                    : (isLight ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-200")
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {/* Balance Card (New) */}
                <div className={cn("rounded-2xl p-5 relative overflow-hidden", cardBg, "sm:col-span-2 lg:col-span-1")}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Award className="w-12 h-12" />
                    </div>
                    <div className={cn("text-xs font-medium mb-2 flex items-center justify-between", textMuted)}>
                        <span>今日可用额度 (Balance)</span>
                        <span className="text-[10px] opacity-70">系统自动重置</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div className={cn("text-3xl font-bold font-mono tracking-tight", textBase)}>
                            {userLevel === 'PROMAX' || userQuota?.dailyTokenLimit === -1 
                                ? '∞ 无限' 
                                : (Math.max((userQuota?.dailyTokenLimit || 0) - (userQuota?.dailyTokensUsed || 0), 0)).toLocaleString()
                            }
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-1">
                            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                                {userLevel === 'PROMAX' || userQuota?.dailyTokenLimit === -1 ? (
                                    <div className="h-full w-full bg-gradient-to-r from-purple-500 to-daiqing animate-pulse"></div>
                                ) : (
                                    <div 
                                        className={cn(
                                            "h-full transition-all duration-1000",
                                            ((userQuota?.dailyTokensUsed || 0) / (userQuota?.dailyTokenLimit || 1)) > 0.9 ? 'bg-red-500' : 
                                            ((userQuota?.dailyTokensUsed || 0) / (userQuota?.dailyTokenLimit || 1)) > 0.7 ? 'bg-amber-500' : 'bg-purple-500'
                                        )}
                                        style={{ 
                                            width: `${Math.min(((userQuota?.dailyTokensUsed || 0) / (userQuota?.dailyTokenLimit || 1)) * 100, 100)}%` 
                                        }}
                                    ></div>
                                )}
                            </div>
                            <div className="flex justify-between text-[10px] opacity-60">
                                <span>已用 {userQuota?.dailyTokensUsed?.toLocaleString() || 0}</span>
                                <span>上限 {userLevel === 'PROMAX' || userQuota?.dailyTokenLimit === -1 ? '∞' : userQuota?.dailyTokenLimit?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cn("rounded-2xl p-5 relative overflow-hidden", cardBg)}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-12 h-12" />
                    </div>
                    <div className={cn("text-xs font-medium mb-2", textMuted)}>本地今日消耗 (Local Today)</div>
                    <div className={cn("text-3xl font-bold font-mono tracking-tight", textBase)}>
                        {stats.today.toLocaleString()}
                    </div>
                </div>
                <div className={cn("rounded-2xl p-5 relative overflow-hidden", cardBg)}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <History className="w-12 h-12" />
                    </div>
                    <div className={cn("text-xs font-medium mb-2", textMuted)}>本地历史总计 (Local Total)</div>
                    <div className={cn("text-3xl font-bold font-mono tracking-tight", textBase)}>
                        {stats.total.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[300px]">
                {activeTab === 'distribution' && (
                    <div className="animate-in fade-in duration-500">
                        <h3 className={cn("text-sm font-semibold mb-8", textBase)}>模型消耗分布</h3>
                        <div className="h-64 w-full relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={cn("w-full border-t border-dashed", isLight ? "border-gray-100" : "border-white/5")} />
                                ))}
                            </div>
                            
                            <div className="absolute inset-0 flex items-end gap-4 px-2">
                                {chartData.modelConsumption.length > 0 ? (
                                    chartData.modelConsumption.map(([model, tokens], idx) => {
                                        const maxTokens = chartData.modelConsumption[0][1] || 1;
                                        const height = (tokens / maxTokens) * 100;
                                        return (
                                            <div key={model} className="flex-1 group relative h-full flex flex-col justify-end items-center gap-2">
                                                <div 
                                                    className={cn(
                                                        "w-full rounded-t-lg transition-all duration-1000 cursor-pointer relative z-10",
                                                        idx % 3 === 0 ? "bg-purple-500/80 hover:bg-purple-500" : idx % 3 === 1 ? "bg-emerald-500/80 hover:bg-emerald-500" : "bg-amber-500/80 hover:bg-amber-500"
                                                    )}
                                                    style={{ 
                                                        height: `${Math.max(height, 5)}%`,
                                                        transitionDelay: `${idx * 50}ms`
                                                    }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                                        <div className={cn("px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[10px] whitespace-nowrap shadow-xl border border-white/10")}>
                                                            <div className="font-bold mb-0.5">{model.split('/').pop()}</div>
                                                            <div>{tokens.toLocaleString()} Tokens</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={cn("text-[10px] truncate w-full text-center relative z-10", textMuted)} title={model}>
                                                    {model.split('/').pop()}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <EmptyState textMuted={textMuted} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'proportion' && (
                    <div className="animate-in fade-in duration-500 flex flex-col items-center">
                        <h3 className={cn("text-sm font-semibold mb-8 self-start", textBase)}>模型调用次数占比</h3>
                        {chartData.modelCalls.length > 0 ? (
                            <div className="flex flex-col md:flex-row items-center gap-12 w-full justify-center">
                                {/* Donut Chart SVG */}
                                <div className="relative w-48 h-48">
                                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                        {(() => {
                                            const total = chartData.modelCalls.reduce((acc, curr) => acc + curr[1], 0);
                                            let currentOffset = 0;
                                            const colors = ['#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
                                            
                                            return chartData.modelCalls.map(([name, count], i) => {
                                                const percentage = (count / total) * 100;
                                                const strokeDasharray = `${percentage} ${100 - percentage}`;
                                                const strokeDashoffset = -currentOffset;
                                                currentOffset += percentage;
                                                
                                                return (
                                                    <circle
                                                        key={name}
                                                        cx="18"
                                                        cy="18"
                                                        r="15.915"
                                                        fill="transparent"
                                                        stroke={colors[i % colors.length]}
                                                        strokeWidth="3.8"
                                                        strokeDasharray={strokeDasharray}
                                                        strokeDashoffset={strokeDashoffset}
                                                        className="transition-all duration-1000"
                                                    />
                                                );
                                            });
                                        })()}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className={cn("text-2xl font-bold", textBase)}>
                                            {chartData.modelCalls.reduce((acc, curr) => acc + curr[1], 0)}
                                        </div>
                                        <div className={cn("text-[10px]", textMuted)}>总调用次数</div>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-col gap-3">
                                    {chartData.modelCalls.map(([name, count], i) => {
                                        const colors = ['bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-red-500'];
                                        const total = chartData.modelCalls.reduce((acc, curr) => acc + curr[1], 0);
                                        return (
                                            <div key={name} className="flex items-center gap-3">
                                                <div className={cn("w-3 h-3 rounded-full", colors[i % colors.length])} />
                                                <div className="flex flex-col">
                                                    <span className={cn("text-xs font-medium", textBase)}>{name.split('/').pop()}</span>
                                                    <span className={cn("text-[10px]", textMuted)}>
                                                        {count} 次 ({Math.round((count/total)*100)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <EmptyState textMuted={textMuted} />
                        )}
                    </div>
                )}

                {activeTab === 'trend' && (
                    <div className="animate-in fade-in duration-500 h-full">
                        <h3 className={cn("text-sm font-semibold mb-8", textBase)}>最近 24 小时消耗趋势</h3>
                        <div className="h-48 w-full flex items-end gap-1 px-2">
                            {chartData.hourlyTrend.map((item, i) => {
                                const maxTokens = Math.max(...chartData.hourlyTrend.map(t => t.tokens), 1);
                                const height = (item.tokens / maxTokens) * 100;
                                return (
                                    <div key={item.hour} className="flex-1 group relative h-full flex flex-col justify-end">
                                        <div 
                                            className={cn(
                                                "w-full bg-purple-500/40 hover:bg-purple-500 rounded-t-sm transition-all duration-500 cursor-pointer",
                                                item.tokens > 0 ? "opacity-100" : "opacity-10"
                                            )}
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                <div className={cn("px-2 py-1 rounded bg-gray-900 text-white text-[10px] whitespace-nowrap shadow-xl")}>
                                                    {item.hour.split('T')[1]}:00 - {item.tokens.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-4 px-2">
                            <span className={cn("text-[10px]", textMuted)}>{chartData.hourlyTrend[0]?.hour.split('T')[1]}:00</span>
                            <span className={cn("text-[10px]", textMuted)}>{chartData.hourlyTrend[12]?.hour.split('T')[1]}:00</span>
                            <span className={cn("text-[10px]", textMuted)}>{chartData.hourlyTrend[23]?.hour.split('T')[1]}:00</span>
                        </div>
                    </div>
                )}

                {activeTab === 'ranking' && (
                    <div className="animate-in fade-in duration-500">
                        <h3 className={cn("text-sm font-semibold mb-6", textBase)}>模型消耗总榜</h3>
                        <div className="rounded-xl overflow-hidden border border-white/5">
                            <table className="w-full text-xs text-left">
                                <thead className={cn(isLight ? "bg-gray-100" : "bg-white/5", textMuted)}>
                                    <tr>
                                        <th className="px-4 py-3 font-medium">排名</th>
                                        <th className="px-4 py-3 font-medium">模型名称</th>
                                        <th className="px-4 py-3 font-medium text-right">消耗 (Tokens)</th>
                                    </tr>
                                </thead>
                                <tbody className={cn("divide-y", isLight ? "divide-gray-100" : "divide-white/5")}>
                                    {Object.entries(stats.byModel)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([model, tokens], i) => (
                                            <tr key={model} className={cn(textBase, "hover:bg-white/5 transition-colors")}>
                                                <td className="px-4 py-3 font-mono">
                                                    {i < 3 ? <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">{i+1}</span> : i+1}
                                                </td>
                                                <td className="px-4 py-3 truncate max-w-[150px]">{model}</td>
                                                <td className="px-4 py-3 text-right font-mono">{tokens.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({ textMuted }: { textMuted: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className={cn("w-12 h-12 mb-4 opacity-20", textMuted)} />
            <p className={cn("text-sm", textMuted)}>暂无足够的数据生成图表</p>
        </div>
    );
}
