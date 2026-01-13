'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Megaphone, Zap, Layout, Play, PanelTopClose, Settings2, Trash2 } from 'lucide-react';

const CURRENT_VERSION = '1.2.0';
const ANNOUNCEMENT_KEY = `announcement_read_${CURRENT_VERSION}`;

export default function AnnouncementModal({ forceOpen = false, onClose }: { forceOpen?: boolean, onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // If forced open, always show
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Otherwise check local storage
    const hasRead = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (!hasRead) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (!forceOpen) {
        localStorage.setItem(ANNOUNCEMENT_KEY, 'true');
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-start text-white">
          <div className="flex gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Megaphone className="w-8 h-8 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-bold">AI Novel Writer 更新公告</h2>
                <p className="text-purple-100 mt-1">Version {CURRENT_VERSION} - 炼金工坊重磅升级</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
            
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-lg">
                    <Sparkles className="w-5 h-5" />
                    <span>核心更新：提示词炼金工坊 (Module 9)</span>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-gray-700 space-y-2 text-sm leading-relaxed">
                    <p>
                        <strong className="text-purple-800">1. 全新“三阶炼金”流程：</strong><br/>
                        不再只有单纯的提示词生成。现在，系统会自动执行 <span className="bg-white px-1 rounded border border-purple-200">生成提示词</span> &rarr; <span className="bg-white px-1 rounded border border-purple-200">实际生成内容</span> &rarr; <span className="bg-white px-1 rounded border border-purple-200">专业评审打分</span> 的完整闭环，让您直观看到提示词的实际效果。
                    </p>
                    <p>
                        <strong className="text-purple-800">2. 极简操作体验：</strong><br/>
                        移除了繁琐的测试场景输入。只需一句话需求，一键点击，系统全自动完成双方案对抗生成与评测。
                    </p>
                    <p>
                        <strong className="text-purple-800">3. 智能模型配置：</strong><br/>
                        默认升级为 <span className="font-mono text-xs bg-gray-200 px-1 rounded">DeepSeek-V3.2</span> 模型，同时保留 R1 作为对抗生成源，确保创意与逻辑的平衡。
                    </p>
                    <p>
                        <strong className="text-purple-800">4. 提示词一键应用：</strong><br/>
                        满意的提示词可以“一键应用”到任意目标模块（如脑洞具象化、正文生成等），系统会自动为您创建并选中新的提示词模板，无需手动复制。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
                    <Zap className="w-5 h-5" />
                    <span>重磅功能：多模型并行系统 (Multi-Model)</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-gray-700 space-y-4 text-sm leading-relaxed">
                    <div>
                        <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-1">
                            <Layout className="w-4 h-4" /> 1. 同时运行多个模型
                        </h4>
                        <p>您现在可以在任意模块（除拆书外）同时开启多个 AI 模型进行创作。点击输入框上方的 <span className="bg-white px-1 py-0.5 rounded border border-blue-200 text-xs font-mono">+ 添加模型</span> 按钮即可无限增加。</p>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-1">
                            <PanelTopClose className="w-4 h-4" /> 2. 沉浸式输入折叠
                        </h4>
                        <p>为了给多模型输出腾出更多空间，当您点击 <span className="bg-white px-1 py-0.5 rounded border border-blue-200 text-xs font-mono">+ 添加模型</span> 开启多开模式后，输入框会自动向上收起，变为顶部的迷你工具栏。您随时可以点击顶部的 <Settings2 className="w-3 h-3 inline" /> 图标重新展开进行编辑。</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-1">
                            <Trash2 className="w-4 h-4" /> 3. 输出管理与锁定
                        </h4>
                        <p>
                            不喜欢某个模型的生成结果？直接点击卡片右上角的 <X className="w-3 h-3 inline bg-gray-200 rounded-full p-0.5" /> 移除它（如果您想重新生成该卡片，它会自动排到队尾重试）。<br/>
                            如果对结果满意，点击 <span className="text-green-600 font-bold">✔ 确定</span> 锁定它，锁定后的内容不会因重新生成而消失。
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                    <Sparkles className="w-5 h-5 text-gray-500" />
                    <span>其他优化</span>
                </div>
                <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm pl-2">
                    <li><strong>提示词管理升级</strong>：支持多选提示词模板，系统会自动将选中的多个模板组合成一个强大的指令集。</li>
                    <li><strong>API Key 优化</strong>：炼金模块现在自动复用全局写作设置的 API Key，无需重复配置，且支持更稳定的 Base URL 连接。</li>
                    <li><strong>界面视觉微调</strong>：优化了部分按钮和布局的交互体验。</li>
                </ul>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
                onClick={handleClose}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-all shadow-lg hover:shadow-xl font-medium"
            >
                开始体验
            </button>
        </div>
      </div>
    </div>
  );
}
