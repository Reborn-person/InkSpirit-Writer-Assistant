'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Megaphone, Zap, Layout, Play, PanelTopClose, Settings2, Trash2, Bot, User, Type, MessageSquare } from 'lucide-react';

const CURRENT_VERSION = '1.3.4';
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
                <p className="text-ink/60 mt-1">Version {CURRENT_VERSION} - UI 优化与体验升级</p>
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
                <div className="flex items-center gap-2 text-pink-500 font-bold text-lg">
                    <MessageSquare className="w-5 h-5" />
                    <span>模块12：对话写作升级</span>
                </div>
                <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 text-ink/80 space-y-3 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">1. 沉浸式单智能体体验：</strong><br/>
                        优化了对话写作界面，现在采用更专注的单智能体模式，左侧文件管理支持折叠，为您提供更开阔的创作空间。
                    </p>
                    <p>
                        <strong className="text-ink">2. 智能开场白：</strong><br/>
                        新建对话时，智能体将自动根据您的作品生成一句贴切的开场白，帮助您快速进入创作状态。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                    <Settings2 className="w-5 h-5" />
                    <span>Bug 修复与优化</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-ink/80 space-y-3 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">1. Max 模式优化：</strong><br/>
                        修复了 Max 模式下部分功能模型配置的问题，现在所有模块均支持独立配置 AI 模型。
                    </p>
                    <p>
                        <strong className="text-ink">2. 一致性检查：</strong><br/>
                        移除了冗余的配置选项，优化了检查流程。
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
