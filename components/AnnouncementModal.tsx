'use client';
import { useState, useEffect } from 'react';
import { X, Sparkles, Megaphone, Zap, Layout, Play, PanelTopClose, Settings2, Trash2, Bot, User, Type, Maximize2 } from 'lucide-react';

const CURRENT_VERSION = '1.32';
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
                <p className="text-ink/60 mt-1">Version {CURRENT_VERSION} - MAX 沉浸式体验与视觉升级</p>
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
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white/50">
            
            {/* MAX Module Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-xl border-b border-purple-100 pb-2">
                    <Sparkles className="w-6 h-6" />
                    <span>MAX 创作中心 (New)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
                        <h4 className="font-bold text-purple-900 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> 拆书中心 (Dismantle)
                        </h4>
                        <p className="text-sm text-ink/70 leading-relaxed">
                            全自动小说拆解引擎。导入正文，AI 自动提取<strong>节奏、爽点、钩子、人设</strong>，并生成可直接用于仿写的素材库。支持“一键备料”，让仿写从未如此简单。
                        </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
                        <h4 className="font-bold text-purple-900 flex items-center gap-2">
                            <Layout className="w-4 h-4" /> 自循环润色 (Self-Loop)
                        </h4>
                        <p className="text-sm text-ink/70 leading-relaxed">
                            业界首创的<strong>“评审-润色-再评审”</strong>闭环系统。设定目标分数（如 9.0 分），AI 将不断自我迭代优化文稿，直到达成目标，解放您的双手。
                        </p>
                    </div>
                </div>

                <div className="bg-gray-900 text-gray-300 p-5 rounded-xl border border-gray-800 shadow-inner space-y-3">
                    <h4 className="font-bold text-white flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" /> 沉浸式暗黑模式 (Dark Mode)
                    </h4>
                    <p className="text-sm leading-relaxed">
                        专为长时间写作设计的<strong>MAX 专属暗黑主题</strong>。
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-gray-400 pl-2">
                        <li><strong>智能变色</strong>：进入 MAX 模块时，界面自动切换为深邃的黑紫配色，降低视疲劳。</li>
                        <li><strong>助手停靠</strong>：墨灵助手自动吸附至屏幕右侧，不再遮挡正文，支持边写边问。</li>
                        <li><strong>视觉降噪</strong>：隐藏不必要的 UI 元素，让您完全沉浸在文字世界中。</li>
                    </ul>
                </div>
            </div>

            {/* General Updates */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-daiqing font-bold text-xl border-b border-ink/5 pb-2">
                    <Type className="w-6 h-6" />
                    <span>体验与交互升级</span>
                </div>
                <div className="bg-paper/60 p-5 rounded-xl border border-ink/10 text-ink/80 space-y-4 text-sm leading-relaxed">
                    <div>
                        <strong className="text-ink block mb-1">1. 批量创作模块优化 (Module 4 & Max)：</strong>
                        为了提供更精准的控制体验，我们升级了批量生成功能：
                        <ul className="list-disc list-inside text-xs space-y-1 text-ink/60 pl-2 mt-1">
                            <li><strong>精准章节范围</strong>：从自动选择改为手动输入（起始章节-结束章节），现在您可以自由决定生成哪几章。</li>
                            <li><strong>自定义字数目标</strong>：新增单章字数设置，不再强制锁死 2000 字，想写多少您说了算。</li>
                        </ul>
                    </div>
                    <div>
                        <strong className="text-ink block mb-1">2. 字体系统重构 (Typography)：</strong>
                        为了提升阅读体验，助手对话区域及正文区域全面改用<strong>无衬线字体 (Sans-serif)</strong>。新字体在小字号下更清晰，在深色背景下对比度更佳。
                    </div>
                    <div>
                        <strong className="text-ink block mb-1">3. 智能交互细节：</strong>
                        <ul>
                            <li className="flex items-start gap-2 mt-1">
                                <span className="text-daiqing">•</span>
                                <span>助手输入框现在会根据内容自动伸缩高度，长指令编辑更方便。</span>
                            </li>
                            <li className="flex items-start gap-2 mt-1">
                                <span className="text-daiqing">•</span>
                                <span>修复了导航栏高亮状态下的显示问题，选中状态更加醒目。</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Update Guide */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                    <Zap className="w-5 h-5" />
                    <span>无损更新指南</span>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-ink/80 text-sm leading-relaxed">
                    <p>
                        下载新版压缩包后，直接<strong>解压并覆盖</strong>到当前目录即可完成更新。
                        <br/>
                        <span className="text-xs text-green-700 mt-2 block">
                            * 您的所有小说数据（大纲、正文、设定等）均安全储存在浏览器本地数据库 (IndexedDB) 中，替换程序文件绝不会导致数据丢失。
                        </span>
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
