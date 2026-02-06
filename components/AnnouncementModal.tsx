'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Megaphone, Zap, Layout, Play, PanelTopClose, Settings2, Trash2, Bot, User, Type, MessageSquare, BookOpen, Globe, Trophy } from 'lucide-react';

const CURRENT_VERSION = '1.3.5';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4 animate-fade-in font-serif">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-ink/10">
        {/* Header */}
        <div className="bg-paper p-6 flex justify-between items-start border-b border-ink/10 relative overflow-hidden">
          {/* Background Texture Overlay */}
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-rice-texture"></div>
          
          <div className="flex gap-4 relative z-10">
            <div className="p-3 bg-white/60 rounded-xl border border-ink/5 shadow-sm">
                <Megaphone className="w-8 h-8 text-daiqing" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-ink">AI Novel Writer 更新公告</h2>
              <p className="text-ink/60 mt-1">Version {CURRENT_VERSION} - Humanizer 去AI味功能全面升级</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-ink/5 rounded-full transition-colors text-ink/40 hover:text-ink relative z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 bg-white/50">

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                    <Sparkles className="w-5 h-5" />
                    <span>Humanizer 去AI味功能全面升级</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-ink/80 space-y-3 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">1. Stop-Slop 5维评分系统：</strong><br/>
                        引入专业的 AI 文本检测体系，从直接性、节奏多样性、读者信任度、真实感、信息密度五个维度全面评估文本质量。
                    </p>
                    <p>
                        <strong className="text-ink">2. 中文写作风格检测：</strong><br/>
                        新增针对中文 AI 写作特征的专项检测，包括儿化音、翻译腔、虚假亲昵、AI陈词、导游式结构等 9 大类问题识别。
                    </p>
                    <p>
                        <strong className="text-ink">3. 专栏作家风格改写：</strong><br/>
                        改写提示词全面升级，参考专业写作指南，让 AI 生成内容更像人类专栏作家作品，具有"毛边感"和独特见解。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-lg">
                    <Zap className="w-5 h-5" />
                    <span>Max 万字冲刺优化</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-ink/80 space-y-3 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">1. 导入编辑器问题修复：</strong><br/>
                        修复了万字冲刺导入到编辑器后，继续写作会创建重复目录的问题。现在导入和写作使用统一的项目ID，数据同步更稳定。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                    <Settings2 className="w-5 h-5" />
                    <span>历史更新</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-ink/80 space-y-3 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">v1.3.4 - 模块13 AI拆书：</strong><br/>
                        排行榜拆书 + AI自动收集功能上线，支持联网搜索书籍信息并生成拆书分析。
                    </p>
                    <p>
                        <strong className="text-ink">v1.3.3 - 模块12对话写作：</strong><br/>
                        沉浸式单智能体体验，左侧文件管理支持折叠，智能开场白功能。
                    </p>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-ink/10 bg-paper/50 flex justify-end">
            <button 
                onClick={handleClose}
                className="px-6 py-2 bg-daiqing text-white rounded-lg hover:bg-daiqing/90 transition-all shadow-md hover:shadow-lg font-medium"
            >
                开始体验 v{CURRENT_VERSION}
            </button>
        </div>
      </div>
    </div>
  );
}
