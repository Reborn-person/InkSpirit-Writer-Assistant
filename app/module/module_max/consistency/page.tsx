'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { consistencyService, ConsistencyReport } from '@/lib/consistency';
import { Shield, AlertCircle, AlertTriangle, Info, Play, Download, Loader, Zap } from 'lucide-react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { Check, X, Trash2, BookOpen, Plus } from 'lucide-react';

interface WorkItem {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export default function ConsistencyPage() {
    const pathname = usePathname();
    const { isAiOpen, setIsMaxMode } = useEditorAgent();

    useEffect(() => {
        setIsMaxMode(true);
    }, [setIsMaxMode]);
    const [report, setReport] = useState<ConsistencyReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'character' | 'world' | 'timeline'>('all');
    
    // New Configuration Options
    const [targetChapter, setTargetChapter] = useState<number | undefined>(undefined);

    // Model Config
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        provider: 'siliconflow',
        model: 'deepseek-ai/DeepSeek-V3',
        apiKey: '',
        baseUrl: 'https://api.siliconflow.cn/v1'
    });

    // Work Management State
    const [works, setWorks] = useState<WorkItem[]>([]);
    const [activeWorkId, setActiveWorkId] = useState<string>('');
    const [showWorksManager, setShowWorksManager] = useState(false);
    const [newWorkTitle, setNewWorkTitle] = useState('');
    
    const worksKey = 'novel_writer_max_works';
    const activeWorkKey = 'novel_writer_max_active_work';

    // Load works on mount
    useEffect(() => {
        const loadWorks = () => {
            const savedWorks = StorageManager.getJSON(worksKey) || [];
            setWorks(savedWorks);
            const savedActiveId = StorageManager.get(activeWorkKey);
            if (savedActiveId) {
                setActiveWorkId(savedActiveId);
            } else if (savedWorks.length > 0) {
                // Default to first work
                setActiveWorkId(savedWorks[0].id);
                StorageManager.set(activeWorkKey, savedWorks[0].id);
            }
        };
        loadWorks();
    }, []);

    const handleAddWork = () => {
        if (!newWorkTitle.trim()) return;
        
        const newWork: WorkItem = {
            id: Date.now().toString(),
            title: newWorkTitle.trim(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        const updatedWorks = [newWork, ...works];
        setWorks(updatedWorks);
        StorageManager.setJSON(worksKey, updatedWorks);
        
        // Select new work
        setActiveWorkId(newWork.id);
        StorageManager.set(activeWorkKey, newWork.id);
        
        setNewWorkTitle('');
    };

    const handleDeleteWork = (id: string, title: string) => {
        if (!confirm(`确定要删除作品 "${title}" 吗？此操作不可恢复。`)) return;
        
        const updatedWorks = works.filter(w => w.id !== id);
        setWorks(updatedWorks);
        StorageManager.setJSON(worksKey, updatedWorks);
        
        if (activeWorkId === id) {
            const nextWork = updatedWorks[0];
            if (nextWork) {
                setActiveWorkId(nextWork.id);
                StorageManager.set(activeWorkKey, nextWork.id);
            } else {
                setActiveWorkId('');
                StorageManager.remove(activeWorkKey);
            }
        }
    };

    const handleSelectWork = (workId: string) => {
        if (workId === activeWorkId) {
            setShowWorksManager(false);
            return;
        }
        
        setActiveWorkId(workId);
        StorageManager.set(activeWorkKey, workId);
        setShowWorksManager(false);
        // Reset report when switching works
        setReport(null);
    };

    // Navigation State
    const isMaxHome = pathname === '/module/module_max';
    const isMaxIdea = pathname === '/module/module_max/idea';
    const isMaxDismantle = pathname === '/module/module_max/dismantle';
    const isMaxPolish = pathname === '/module/module_max/polish';
    const isMaxCreation = pathname === '/module/module_max/creation';
    const isMaxOutline = pathname === '/module/module_max/outline';
    const isMaxConsistency = pathname === '/module/module_max/consistency';
    const isMaxHumanizer = pathname === '/module/module_max/humanizer';
    const isMaxGodMode = pathname === '/module/module_max/godmode';

    const handleCheck = async () => {
        const { apiKey, baseUrl, model } = modelConfig;
        
        if (!model) {
            alert('请先配置模型');
            return;
        }

        setLoading(true);
        try {
            // Sync config to StorageManager for consistency service and vector store
            if (apiKey) {
                StorageManager.set('novel_writer_api_key', apiKey);
                StorageManager.set(STORAGE_KEYS.RAG_API_KEY, apiKey);
            }
            if (baseUrl) {
                StorageManager.set('novel_writer_base_url', baseUrl);
                StorageManager.set(STORAGE_KEYS.RAG_BASE_URL, baseUrl);
            }
            if (model) {
                StorageManager.set(STORAGE_KEYS.RAG_MODEL, model);
            }
            
            // 直接在客户端执行检查，以便访问本地存储 (LocalStorage/IndexedDB)
            // 之前的 API 路由方式会导致服务器无法读取客户端的本地数据
            const report = await consistencyService.runCheck({ 
                scope: 'all',
                // apiKey, // Service will get from StorageManager
                // baseUrl,
                // model,
                targetChapter,
            });

            setReport(report);
        } catch (error: any) {
            console.error('一致性检查错误:', error);
            alert(`检查失败: ${error.message || '未知错误'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleExportReport = () => {
        if (!report) return;

        const markdown = formatReportAsMarkdown(report);
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `一致性检查报告_${new Date().toLocaleDateString()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatReportAsMarkdown = (report: ConsistencyReport): string => {
        const timestamp = new Date(report.generatedAt).toLocaleString('zh-CN');
        const scopeText = (report.scope?.types || []).map(t =>
            t === 'character' ? '人物' : t === 'world' ? '世界观' : '时间线'
        ).join('、');

        let md = `# 一致性检查报告\n\n`;
        md += `**生成时间**: ${timestamp}\n`;
        md += `**检查范围**: ${scopeText}\n\n`;
        md += `## 概览\n\n`;
        md += `- 总计问题: ${report.summary.total}\n`;
        md += `- 严重: ${report.summary.errors}\n`;
        md += `- 警告: ${report.summary.warnings}\n`;
        md += `- 提示: ${report.summary.info}\n\n`;

        if (report.checks.length === 0) {
            md += `## 检查结果\n\n✅ 未发现一致性问题\n`;
            return md;
        }

        md += `## 详细问题列表\n\n`;

        report.checks.forEach((check, idx) => {
            const severityEmoji = check.severity === 'error' ? '🔴' : check.severity === 'warning' ? '🟡' : 'ℹ️';
            const severityText = check.severity === 'error' ? '严重' : check.severity === 'warning' ? '警告' : '提示';

            md += `### ${idx + 1}. ${severityEmoji} ${check.title}\n\n`;
            md += `**严重程度**: ${severityText}\n\n`;
            md += `**描述**: ${check.description}\n\n`;

            if (check.evidence && check.evidence.length > 0) {
                md += `**相关证据**:\n\n`;
                check.evidence.forEach((evidence, eIdx) => {
                    md += `${eIdx + 1}. 第 ${evidence.chapterNumber} 章: "${evidence.excerpt}"\n`;
                });
                md += `\n`;
            }

            if (check.suggestion) {
                md += `**修复建议**: ${check.suggestion}\n\n`;
            }

            md += `---\n\n`;
        });

        return md;
    };

    const filteredChecks = report?.checks.filter(check =>
        filter === 'all' || check.type === filter
    ) || [];

    return (
        <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-max-bg-alt text-max-text font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
            {/* Top Bar */}
            <header className="h-14 border-b border-max-border flex items-center justify-between px-4 bg-max-bg shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-max-surface rounded-lg p-1 border border-max-border overflow-x-auto no-scrollbar max-w-[60vw]">
                        <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHome ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>MAX 主页</Link>
                        <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxIdea ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>脑洞风暴</Link>
                        <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxDismantle ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>拆书</Link>
                        <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxOutline ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>大纲生成</Link>
                        <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxCreation ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>万字冲刺</Link>
                        <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxPolish ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>自循环</Link>
                        <Link href="/module/module_max/consistency" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxConsistency ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>一致性</Link>
                        <Link href="/module/module_max/humanizer" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHumanizer ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>AI去味</Link>
                        <Link href="/module/module_max/godmode" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxGodMode ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>上帝模式</Link>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <h1 className="text-sm font-bold text-max-text flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        一致性检查器
                    </h1>
                    <div className="ml-4 flex items-center gap-2">
                        <button
                            onClick={() => setShowWorksManager(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-max-surface hover:bg-max-surface-alt border border-max-border rounded-lg text-xs font-medium transition-colors"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{works.find(w => w.id === activeWorkId)?.title || '选择作品'}</span>
                        </button>
                        <ModelConfigPanel moduleKey="consistency" onConfigChange={setModelConfig} />
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto w-full p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="w-10 h-10 text-purple-400" />
                        <div>
                            <h1 className="text-3xl font-bold text-max-text">一致性检查器</h1>
                            <p className="text-max-text-muted text-sm">检测人物、世界观、时间线的前后矛盾</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCheck}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-max-accent hover:opacity-90 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    检查中...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    开始检查
                                </>
                            )}
                        </button>

                        {report && (
                            <button
                                onClick={handleExportReport}
                                className="flex items-center gap-2 px-6 py-3 bg-max-surface hover:bg-max-surface-alt border border-max-border text-max-text rounded-lg font-bold transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                导出报告
                            </button>
                        )}
                    </div>
                </div>

                {/* Configuration Panel */}
                <div className="bg-max-surface rounded-xl p-6 border border-max-border mb-8">
                    <h2 className="text-lg font-bold text-max-text mb-4">检查配置</h2>
                    <div className="flex flex-wrap gap-6">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm text-max-text-muted mb-2">目标检查章节 (留空则检查最新)</label>
                            <input
                                type="number"
                                placeholder="输入章节号 (例如: 10)"
                                value={targetChapter || ''}
                                onChange={(e) => setTargetChapter(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full bg-max-bg border border-max-border rounded-lg px-4 py-2 text-max-text focus:outline-none focus:border-max-accent"
                            />
                            <p className="text-xs text-max-text-muted mt-1">系统将检查该章节内容，并以该章节之前的内容作为一致性参考。</p>
                        </div>
                        
                    </div>
                </div>

                {/* Summary Cards */}
                {report && (
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <SummaryCard
                            icon={<Shield className="w-6 h-6" />}
                            label="总计"
                            value={report.summary.total}
                            color="bg-blue-500/20 text-blue-400"
                        />
                        <SummaryCard
                            icon={<AlertCircle className="w-6 h-6" />}
                            label="严重问题"
                            value={report.summary.errors}
                            color="bg-red-500/20 text-red-400"
                        />
                        <SummaryCard
                            icon={<AlertTriangle className="w-6 h-6" />}
                            label="警告"
                            value={report.summary.warnings}
                            color="bg-yellow-500/20 text-yellow-400"
                        />
                        <SummaryCard
                            icon={<Info className="w-6 h-6" />}
                            label="提示"
                            value={report.summary.info}
                            color="bg-cyan-500/20 text-cyan-400"
                        />
                    </div>
                )}

                {/* Filter Tabs */}
                {report && (
                    <div className="flex gap-2 mb-6">
                        {(['all', 'character', 'world', 'timeline'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${filter === type
                                    ? 'bg-max-accent text-white'
                                    : 'bg-max-surface text-max-text-muted hover:bg-max-surface-alt'
                                    }`}
                            >
                                {type === 'all'
                                    ? '全部'
                                    : type === 'character'
                                        ? '人物'
                                        : type === 'world'
                                            ? '世界观'
                                            : '时间线'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Issue List */}
                {report ? (
                    <div className="space-y-4">
                        {filteredChecks.length === 0 ? (
                            <div className="text-center py-16 bg-max-surface border border-max-border rounded-xl">
                                <Shield className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
                                <p className="text-xl font-bold text-max-text">
                                    {filter === 'all' ? '未发现一致性问题' : `未发现${filter === 'character' ? '人物' : filter === 'world' ? '世界观' : '时间线'}问题`}
                                </p>
                            </div>
                        ) : (
                            filteredChecks.map((check) => (
                                <IssueCard key={check.id} check={check} />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-max-surface border border-max-border rounded-xl shadow-lg">
                        <Shield className="w-20 h-20 mx-auto mb-6 text-purple-500 opacity-80" />
                        <p className="text-2xl font-bold text-max-text mb-3">点击“开始检查”进行一致性分析</p>
                        <p className="text-base text-max-text-muted">系统将全方位扫描人物设定、世界观逻辑和时间线的一致性</p>
                    </div>
                )}
            </div>
        </div>

        {/* Works Manager Modal */}
        {showWorksManager && (
            <div className="fixed inset-0 bg-max-backdrop backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-max-bg border border-max-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-max-border">
                        <h2 className="text-sm font-bold text-max-text flex items-center gap-2">
                            作品管理
                        </h2>
                        <button onClick={() => setShowWorksManager(false)} className="text-max-text-muted hover:text-max-text">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newWorkTitle}
                                onChange={(e) => setNewWorkTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddWork();
                                }}
                                className="flex-1 px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-max-accent transition-all"
                                placeholder="输入作品名称..."
                            />
                            <button
                                type="button"
                                onClick={handleAddWork}
                                className="px-4 py-2 text-xs font-bold bg-max-accent text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                新增作品
                            </button>
                        </div>
                        {works.length === 0 ? (
                            <div className="text-xs text-max-text-muted">暂无作品</div>
                        ) : (
                            <div className="space-y-2">
                                {works.map(work => (
                                    <div
                                        key={work.id}
                                        onClick={() => handleSelectWork(work.id)}
                                        className={`flex items-center justify-between px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg cursor-pointer group ${activeWorkId === work.id ? 'bg-max-accent/10 border-max-accent/40' : 'hover:bg-max-surface-alt'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {activeWorkId === work.id && (
                                                <Check className="w-3 h-3 text-max-accent shrink-0" />
                                            )}
                                            <span className="text-xs text-max-text truncate">{work.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-max-text-muted">{new Date(work.createdAt).toLocaleDateString()}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteWork(work.id, work.title);
                                                }}
                                                className="p-1 text-max-text-muted hover:text-red-400 transition-colors"
                                                title="删除作品"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
    );
}

function SummaryCard({ icon, label, value, color }: any) {
    return (
        <div className={`p-6 rounded-xl ${color}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-sm font-bold opacity-80">{label}</span>
            </div>
            <div className="text-3xl font-bold">{value}</div>
        </div>
    );
}

function IssueCard({ check }: any) {
    const [expanded, setExpanded] = useState(false);

    const severityConfig = {
        error: { icon: AlertCircle, color: 'border-red-500 bg-red-500/10', badge: 'bg-red-500 text-white' },
        warning: { icon: AlertTriangle, color: 'border-yellow-500 bg-yellow-500/10', badge: 'bg-yellow-500 text-black' },
        info: { icon: Info, color: 'border-cyan-500 bg-cyan-500/10', badge: 'bg-cyan-500 text-black' }
    };

    const config = severityConfig[check.severity as keyof typeof severityConfig];
    const Icon = config.icon;

    return (
        <div className={`border-2 rounded-xl overflow-hidden ${config.color}`}>
            <div
                className="p-6 cursor-pointer hover:bg-max-surface-alt transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start gap-4">
                    <Icon className="w-6 h-6 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{check.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${config.badge}`}>
                                {check.severity === 'error' ? '严重' : check.severity === 'warning' ? '警告' : '提示'}
                            </span>
                        </div>
                        <p className="text-max-text text-sm">{check.description}</p>
                    </div>
                </div>
            </div>

            {expanded && check.evidence.length > 0 && (
                <div className="border-t border-max-border p-6 bg-max-bg-alt/50">
                    <h4 className="font-bold mb-4 text-sm text-max-text-muted">相关证据：</h4>
                    <div className="space-y-3">
                        {check.evidence.map((evidence: any, idx: number) => (
                            <div key={idx} className="bg-max-surface rounded-lg p-4">
                                <div className="text-xs text-max-text-muted mb-2">第 {evidence.chapterNumber} 章</div>
                                <div className="text-sm text-max-text">{evidence.excerpt}</div>
                            </div>
                        ))}
                    </div>
                    {check.suggestion && (
                        <div className="mt-4 p-4 bg-max-accent/10 border border-max-accent/30 rounded-lg">
                            <div className="text-xs text-max-accent font-bold mb-1">修复建议：</div>
                            <div className="text-sm text-max-text">{check.suggestion}</div>
                        </div>
                    )}
                </div>)}
            </div>
    );
}
