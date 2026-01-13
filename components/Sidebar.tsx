'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, FileText, List, PenTool, Edit3, Wand2, Home, Settings, Coffee, Database, BookMarked, X, ChevronLeft, ChevronRight, Menu, FlaskConical, ClipboardCheck, Maximize2, Minimize2 } from 'lucide-react';
import AnnouncementModal from './AnnouncementModal';

const menuItems = [
  { name: '首页', href: '/', icon: Home },
  { name: '0.5 拆书模块', href: '/module/module0_5', icon: BookMarked },
  { name: '1. 脑洞具象化', href: '/module/module1', icon: Wand2 },
  { name: '2. 大纲生成', href: '/module/module2', icon: FileText },
  { name: '2.5 细纲生成', href: '/module/module2_5', icon: List },
  { name: '3. 开篇生成', href: '/module/module3', icon: BookOpen },
  { name: '4. 章节批量', href: '/module/module4', icon: PenTool },
  { name: '5. 仿写创作', href: '/module/module5', icon: Edit3 },
  { name: '6. 全文润色', href: '/module/module6', icon: Wand2 },
  { name: '7. AI 辅助写作', href: '/module/module7', icon: Edit3 },
  { name: '8. 文章评审', href: '/module/module8', icon: ClipboardCheck },
  { name: '9. 提示词炼金', href: '/module/module9', icon: FlaskConical },
  { name: '10. 提示词管理', href: '/module/module10', icon: BookMarked },
  { name: '请开发者喝杯咖啡', href: '/coffee', icon: Coffee },
  { name: '储存管理', href: '/storage', icon: Database },
  { name: '设置', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showFullAnnouncement, setShowFullAnnouncement] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle Fullscreen Function
  const toggleFullscreen = async () => {
      try {
          if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
              setIsFullscreen(true);
              setIsHidden(true); // Optionally hide sidebar too for immersion
          } else {
              if (document.exitFullscreen) {
                  await document.exitFullscreen();
                  setIsFullscreen(false);
                  setIsHidden(false);
              }
          }
      } catch (err) {
          console.error("Error toggling fullscreen:", err);
      }
  };

  // F10 Full Screen Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
        if (!document.fullscreenElement) {
            setIsHidden(false); // Restore sidebar when exiting fullscreen via ESC
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <>
    {showFullAnnouncement && (
        <AnnouncementModal forceOpen={true} onClose={() => setShowFullAnnouncement(false)} />
    )}
    
    {/* Floating Button when Hidden/Fullscreen */}
    {isHidden && (
        <button
            onClick={toggleFullscreen}
            className="fixed bottom-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-all opacity-50 hover:opacity-100"
            title="退出全屏 (F10)"
        >
            <Maximize2 className="w-5 h-5" />
        </button>
    )}

    <div 
      className={`flex h-screen flex-col bg-gray-900 text-white transition-all duration-300 ${
        isHidden ? 'w-0 overflow-hidden' : (isCollapsed ? 'w-20' : 'w-64')
      }`}
    >
      <div className="flex items-center justify-between h-16 border-b border-gray-800 px-4">
        {!isCollapsed && (
          <span className="text-xl font-bold truncate">墨灵写作助手</span>
        )}
        <div className="flex items-center gap-1">
            {!isCollapsed && (
                <button
                    onClick={toggleFullscreen}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    title="浏览器全屏 (F10)"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            )}
            <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`text-gray-400 hover:text-white transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
            title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
            {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <ul className="space-y-2 px-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-800 transition-colors ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : ''}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* 公告区域 - 仅在展开时显示 */}
      {showAnnouncement && !isCollapsed && (
        <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700 relative group">
          <button 
            onClick={() => setShowAnnouncement(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="关闭公告"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
             <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
             更新公告 (v1.2)
          </div>
          <div className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
             <p>1. <span className="text-white font-medium">炼金工坊 2.0</span>：生成-执行-评审三阶全自动闭环。</p>
             <p>2. <span className="text-white font-medium">多模型系统</span>：支持多开模型创作，沉浸式输入折叠。</p>
             <p>3. <span className="text-white font-medium">提示词升级</span>：支持多选组合与一键应用。</p>
          </div>
        </div>
      )}

      {/* 收起时的公告图标提示 */}
      {showAnnouncement && isCollapsed && (
         <div className="py-4 flex justify-center border-t border-gray-800">
            <div className="relative group cursor-pointer" onClick={() => setIsCollapsed(false)}>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse absolute top-0 right-0"></div>
                <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </div>
         </div>
      )}

      <div 
        className={`p-4 border-t border-gray-800 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors ${isCollapsed ? 'text-center' : ''}`}
        onClick={() => setShowFullAnnouncement(true)}
        title="点击查看更新公告"
      >
        {isCollapsed ? 'v1.2' : 'v1.2.0'}
      </div>
    </div>
    </>
  );
}
