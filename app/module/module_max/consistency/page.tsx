'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { consistencyService, ConsistencyReport } from '@/lib/consistency';
import { Shield, AlertCircle, AlertTriangle, Info, Play, Download, Loader, Zap } from 'lucide-react';

export default function ConsistencyPage() {
    const pathname = usePathname();
    const [report, setReport] = useState<ConsistencyReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'character' | 'world' | 'timeline'>('all');

    // Navigation State
    const isMaxHome = pathname === '/module/module_max';
    const isMaxIdea = pathname === '/module/module_max/idea';
    const isMaxDismantle = pathname === '/module/module_max/dismantle';
    const isMaxPolish = pathname === '/module/module_max/polish';
    const isMaxCreation = pathname === '/module/module_max/creation';
    const isMaxOutline = pathname === '/module/module_max/outline';
    const isMaxConsistency = pathname === '/module/module_max/consistency';

    const handleCheck = async () => {
        setLoading(true);
        try {
            const result = await fetch('/api/consistency/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope: 'all' })
            });

            if (!result.ok) {
                throw new Error('检查失败');
            }

            const data = await result.json();
            setReport(data);
        } catch (error) {
            console.error('一致性检查错误:', error);
            alert('检查失败，请稍后再试');
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
        <div className="min-h-screen bg-[#18181b] text-gray-300 font-serif flex flex-col">
            {/* Top Bar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#18181b] shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-[#27272a] rounded-lg p-1">
                        <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxHome ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>MAX 主页</Link>
                        <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxIdea ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>脑洞风暴</Link>
                        <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxDismantle ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>拆书</Link>
                        <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxOutline ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>大纲生成</Link>
                        <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxCreation ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>万字冲刺</Link>
                        <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxPolish ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>自循环</Link>
                        <Link href="/module/module_max/consistency" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxConsistency ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>一致性</Link>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <h1 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        一致性检查器
                    </h1>
                </div>
            </header>

            <div className="max-w-6xl mx-auto w-full p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Shield className="w-10 h-10 text-purple-400" />
                        <div>
                            <h1 className="text-3xl font-bold text-white">一致性检查器</h1>
                            <p className="text-gray-400 text-sm">检测人物、世界观、时间线的前后矛盾</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCheck}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                导出报告
                            </button>
                        )}
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
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
                            <div className="text-center py-16 bg-gray-800/50 rounded-xl">
                                <Shield className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
                                <p className="text-xl font-bold text-gray-400">
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
                    <div className="text-center py-16 bg-gray-800/50 rounded-xl">
                        <Shield className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
                        <p className="text-xl font-bold text-gray-400 mb-2">点击"开始检查"进行一致性分析</p>
                        <p className="text-sm text-gray-500">系统将检查人物、世界观和时间线的前后一致性</p>
                    </div>
                )}
            </div>
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
                className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
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
                        <p className="text-gray-300 text-sm">{check.description}</p>
                    </div>
                </div>
            </div>

            {expanded && check.evidence.length > 0 && (
                <div className="border-t border-white/10 p-6 bg-black/20">
                    <h4 className="font-bold mb-4 text-sm text-gray-400">相关证据：</h4>
                    <div className="space-y-3">
                        {check.evidence.map((evidence: any, idx: number) => (
                            <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                                <div className="text-xs text-gray-500 mb-2">第 {evidence.chapterNumber} 章</div>
                                <div className="text-sm text-gray-300">{evidence.excerpt}</div>
                            </div>
                        ))}
                    </div>
                    {check.suggestion && (
                        <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <div className="text-xs text-purple-400 font-bold mb-1">修复建议：</div>
                            <div className="text-sm text-gray-300">{check.suggestion}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
