'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileText, List, PenTool, Edit3, Wand2, Home, Settings, Coffee, Database, BookMarked, X, ChevronLeft, ChevronRight, Menu, FlaskConical, ClipboardCheck, Maximize2, Minimize2, Sparkles, Layout, Layers, Target, Feather, User } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import AnnouncementModal from './AnnouncementModal';

const menuItems = [
  { name: '首页', href: '/', icon: Home },
  { name: '0.5 拆书模块', href: '/module/module0_5', icon: BookMarked },
  { name: '1. 脑洞具象化', href: '/module/module1', icon: Sparkles },
  { name: '2. 大纲生成', href: '/module/module2', icon: Layout },
  { name: '2.5 细纲生成', href: '/module/module2_5', icon: Layers },
  { name: '3. 开篇生成', href: '/module/module3', icon: Target },
  { name: '4. 章节批量', href: '/module/module4', icon: PenTool },
  { name: '5. 仿写创作', href: '/module/module5', icon: Feather },
  { name: '6. 全文润色', href: '/module/module6', icon: Wand2 },
  { name: '7. 墨灵编辑器', href: '/module/module7', icon: Edit3 },
  { name: '8. 文章评审', href: '/module/module8', icon: ClipboardCheck },
  { name: '9. 提示词炼金', href: '/module/module9', icon: FlaskConical },
  { name: '10. 提示词管理', href: '/module/module10', icon: Database },
  { name: '请开发者喝杯咖啡', href: '/coffee', icon: Coffee },
  { name: '储存管理', href: '/storage', icon: Database },
  { name: '设置', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showFullAnnouncement, setShowFullAnnouncement] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');

  useEffect(() => {
    // Load Avatar
    const storedAvatar = StorageManager.get(STORAGE_KEYS.USER_AVATAR);
    if (storedAvatar) setUserAvatar(storedAvatar);
  }, []);

  // Toggle Fullscreen Function
  const toggleFullscreen = async () => {
      try {
          if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
              setIsFullscreen(true);
              setIsCollapsed(true); // Auto collapse sidebar but don't hide completely
          } else {
              if (document.exitFullscreen) {
                  await document.exitFullscreen();
                  setIsFullscreen(false);
                  setIsCollapsed(false); // Restore sidebar state (optional, or keep user preference)
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
        // When exiting fullscreen via ESC, ensure we sync state
        if (!document.fullscreenElement) {
             setIsFullscreen(false);
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
    
    {/* Floating Button when Fullscreen (optional, now sidebar is visible) */}
    {isFullscreen && isCollapsed && (
        // Only show if user really wants a floating trigger, but now sidebar has toggle button.
        // We can hide this or keep it as a quick exit. Let's keep it but position it better if needed.
        // Actually, since sidebar is visible (collapsed), we don't strictly need this unless sidebar is hidden.
        // User requested sidebar to be "enabled" (visible) in fullscreen.
        null
    )}

    <div 
      className={`flex h-screen flex-col bg-[#F5F2EC] border-r border-ink/10 text-ink transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 border-b border-ink/10 px-4 bg-rice-texture relative">
        {/* Minimalist Bamboo Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{
                 backgroundImage: 'radial-gradient(circle at 10% 20%, #607476 1px, transparent 1px), radial-gradient(circle at 90% 80%, #607476 1px, transparent 1px)',
                 backgroundSize: '20px 20px'
             }}>
        </div>

        {!isCollapsed && (
          <span className="text-xl font-bold truncate tracking-tight text-ink">墨灵写作助手</span>
        )}
        <div className="flex items-center gap-1 z-10">
            {!isCollapsed && (
                <button
                    onClick={toggleFullscreen}
                    className="text-gray-500 hover:text-daiqing transition-colors p-1"
                    title="浏览器全屏 (F10)"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            )}
            <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`transition-all duration-300 outline-none group ${isCollapsed ? 'mx-auto' : ''}`}
            title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
                <div className={`rounded-full overflow-hidden border-2 border-white/50 shadow-sm transition-all group-hover:border-daiqing/50 group-hover:shadow-md bg-white/50 flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}>
                    {userAvatar ? (
                        <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-gray-400 group-hover:text-daiqing transition-colors">
                            <User className="w-5 h-5" />
                        </div>
                    )}
                </div>
            </button>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
                <li key={item.name}>
                <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden ${
                    isCollapsed ? 'justify-center' : ''
                    } ${
                        isActive 
                            ? 'text-cinnabar bg-cinnabar/5 selection-cinnabar' 
                            : 'text-gray-600 hover:text-daiqing hover-ink-smudge'
                    }`}
                    title={isCollapsed ? item.name : ''}
                >
                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                        isCollapsed ? 'w-6 h-6' : ''
                    } ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
                </li>
            );
          })}
        </ul>
      </nav>
      
      {/* 公告区域 - 仅在展开时显示 */}
      {showAnnouncement && !isCollapsed && (
        <div className="px-4 py-3 bg-white/50 border-t border-ink/10 relative group">
          <button 
            onClick={() => setShowAnnouncement(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-daiqing opacity-0 group-hover:opacity-100 transition-opacity"
            title="关闭公告"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 mb-2 text-daiqing font-bold text-xs uppercase tracking-wider">
             <span className="w-2 h-2 rounded-full bg-cinnabar animate-pulse"></span>
             更新公告 (v1.2)
          </div>
          <div className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
             <p>1. <span className="text-ink font-bold">炼金工坊 2.0</span>：生成-执行-评审三阶全自动闭环。</p>
             <p>2. <span className="text-ink font-bold">多模型系统</span>：支持多开模型创作，沉浸式输入折叠。</p>
             <p>3. <span className="text-ink font-bold">提示词升级</span>：支持多选组合与一键应用。</p>
          </div>
        </div>
      )}

      {/* 收起时的公告图标提示 */}
      {showAnnouncement && isCollapsed && (
         <div className="py-4 flex justify-center border-t border-ink/10">
            <div className="relative group cursor-pointer" onClick={() => setIsCollapsed(false)}>
                <div className="w-2 h-2 rounded-full bg-cinnabar animate-pulse absolute top-0 right-0"></div>
                <BookOpen className="w-5 h-5 text-gray-500 group-hover:text-daiqing" />
            </div>
         </div>
      )}

      <div 
        className={`p-4 border-t border-ink/10 text-xs text-gray-400 cursor-pointer hover:text-daiqing transition-colors ${isCollapsed ? 'text-center' : ''}`}
        onClick={() => setShowFullAnnouncement(true)}
        title="点击查看更新公告"
      >
        {isCollapsed ? 'v1.2' : 'v1.2.0'}
      </div>
    </div>
    </>
  );
}
