'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Megaphone, Zap, Layout, Play, PanelTopClose, Settings2, Trash2, Bot, User, Type } from 'lucide-react';

const CURRENT_VERSION = '1.2.2';
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
                <p className="text-ink/60 mt-1">Version {CURRENT_VERSION} - AI 生图与体验全面升级</p>
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
                    <Sparkles className="w-5 h-5" />
                    <span>AI 生图 2.0 (Image Generation V2)</span>
                </div>
                <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 text-ink/80 space-y-3 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">1. 智能提示词优化：</strong><br/>
                        不再担心“词穷”或“总是生成美少女”。只需输入简单描述（如“雨中街道”），AI 会自动将其扩写为专业的英文 Prompt，精准还原您心中的场景。
                    </p>
                    <p>
                        <strong className="text-ink">2. 高清画质与比例：</strong><br/>
                        新增 <span className="font-bold">3:4 (HD)</span>, <span className="font-bold">1:1 (HD)</span> 等高清分辨率选项，完美适配小说封面与插图需求。
                    </p>
                    <p>
                        <strong className="text-ink">3. 预览与下载：</strong><br/>
                        支持点击图片全屏预览高清大图，并新增了一键下载功能，方便您保存灵感。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-daiqing font-bold text-lg">
                    <Settings2 className="w-5 h-5" />
                    <span>设置与模型优化</span>
                </div>
                <div className="bg-paper/60 p-4 rounded-xl border border-ink/10 text-ink/80 space-y-2 text-sm leading-relaxed">
                    <p>
                        <strong className="text-ink">1. 自定义模型名称：</strong><br/>
                        所有模块（写作、生图、对话）现在均支持手动输入任意模型名称（Custom），不再受限于预设列表，方便您尝试最新的开源模型。
                    </p>
                    <p>
                        <strong className="text-ink">2. 配置隔离修复：</strong><br/>
                        修复了切换服务商时可能导致其他模块配置重置的问题，各模块配置更加独立稳定。
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-ink font-bold text-lg">
                    <Bot className="w-5 h-5 text-ink/40" />
                    <span>其他改进</span>
                </div>
                <ul className="list-disc list-inside text-ink/60 space-y-1 text-sm pl-2">
                    <li><strong>生图模型</strong>：硅基流动新增 Qwen/Qwen-Image-Edit 支持。</li>
                    <li><strong>UI 细节</strong>：优化了侧边栏与悬浮窗的交互体验。</li>
                </ul>
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
