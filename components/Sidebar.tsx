'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, FileText, List, PenTool, Edit3, Wand2, Home, Settings, Coffee, Database, BookMarked, X, ChevronLeft, ChevronRight, Menu, FlaskConical, ClipboardCheck, Maximize2, Minimize2, Sparkles, Layout, Layers, Target, Feather, User, LogOut, Map, MessageSquare } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import AnnouncementModal from './AnnouncementModal';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

const menuItems = [
  { name: '首页', href: '/', icon: Home },
  { name: '0.5 拆书模块', href: '/module/module0_5', icon: BookMarked },
  { name: 'MAX 创作中心', href: '/module/module_max', icon: Maximize2 },
  { name: '上帝模式', href: '/module/module_max/godmode', icon: Map },
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
  { name: '11. 创作备忘录', href: '/module/module11', icon: BookOpen },
  { name: '12. 对话写作', href: '/module/module12', icon: MessageSquare },
  { name: '请开发者喝杯咖啡', href: '/coffee', icon: Coffee },
  { name: '储存管理', href: '/storage', icon: Database },
  { name: '设置', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMaxMode } = useEditorAgent();
  const isMaxRoute = pathname.startsWith('/module/module_max');
  const isVisualMax = isMaxMode || isMaxRoute;
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showFullAnnouncement, setShowFullAnnouncement] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [userLevel, setUserLevel] = useState<'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX' | null>(null);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(null);
  const [isMaxModeEnabled, setIsMaxModeEnabled] = useState(false);

  // Only MAX and PROMAX users can access MAX features
  const canUseMaxMode = userLevel === 'MAX' || userLevel === 'PROMAX';

  // Effective MAX mode: user setting AND permission OR currently in MAX route (immersive experience)
  const shouldSimplifyMenu = (isMaxModeEnabled || isVisualMax) && canUseMaxMode;

  const displayedMenuItems = shouldSimplifyMenu
    ? menuItems.filter(item =>
      // Keep MAX, Home, Settings, Coffee, Storage
      item.href === '/module/module_max' ||
      item.href === '/' ||
      item.href === '/settings' ||
      item.href === '/coffee' ||
      item.href === '/storage' ||
      // Keep tools (7, 8, 9, 10, 11, 12) and Godmode if needed, but user said Godmode is inside MAX center.
      // We'll keep tools but hide 0.5-6 as requested.
      ['/module/module7', '/module/module8', '/module/module9', '/module/module10', '/module/module11', '/module/module12'].includes(item.href)
    )
    // When NOT in MAX mode:
    // If user has MAX permission (canUseMaxMode), show EVERYTHING including MAX module.
    // If user NO permission, hide MAX module.
    : menuItems.filter((item) => {
        if (!canUseMaxMode) {
            // Hide MAX items if no permission
            return item.href !== '/module/module_max' && item.href !== '/module/module_max/godmode';
        }
        // If has permission, show everything (including MAX module)
        // But still hide Godmode from sidebar as it is in the MAX center
        return item.href !== '/module/module_max/godmode';
    });

  // Force re-render when isMaxModeEnabled changes
  // This is already handled by state update, but ensure menuItems is derived correctly.

  // Fix: Move helper functions before they are used (or rely on hoisting, but best practice to define early or inside component)
  // Actually, helper functions inside component are fine. The issue might be where they are called.
  // Let's ensure they are defined before usage in JSX.

  const getLevelLabel = (level: typeof userLevel) => {
    if (!level) return '';
    if (level === 'PRO_PLUS') return 'PRO+';
    if (level === 'PROMAX') return 'MAX';
    return level;
  };

  const formatExpiryDate = (value: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('zh-CN');
  };

  const getLevelColor = (level: typeof userLevel) => {
    switch (level) {
      case 'PRO':
        return 'bg-blue-600';
      case 'PRO_PLUS':
        return 'bg-purple-600';
      case 'MAX':
        return 'bg-orange-600';
      case 'PROMAX':
        return 'bg-orange-600';
      default:
        return 'bg-gray-500';
    }
  };

  const shouldShowExpiry = (level: typeof userLevel) => {
    if (!level) return false;
    // MAX level (and PROMAX) is permanent, don't show expiry
    if (level === 'MAX' || level === 'PROMAX') return false;
    return true;
  };

  const shouldShowLevelBadge = (level: typeof userLevel) => {
    if (!level) return false;
    // MAX level (and PROMAX) is hidden as requested
    if (level === 'MAX' || level === 'PROMAX') return false;
    return true;
  };

  useEffect(() => {
    // Load Avatar
    const storedAvatar = StorageManager.get(STORAGE_KEYS.USER_AVATAR);
    if (storedAvatar) setUserAvatar(storedAvatar);

    // Load MAX Mode setting
    const checkMaxMode = () => {
      const storedMaxMode = StorageManager.get(STORAGE_KEYS.ENABLE_MAX_MODE);
      if (storedMaxMode === 'true') {
        setIsMaxModeEnabled(true);
      } else {
        setIsMaxModeEnabled(false);
      }
    };

    checkMaxMode();

    // Listen for storage changes to update sidebar immediately when settings change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ENABLE_MAX_MODE) {
        checkMaxMode();
      }
    };

    // Custom event for same-window updates
    const handleLocalStorageChange = () => {
      checkMaxMode();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleLocalStorageChange); // We'll trigger this in settings

    const loadUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        const level = (json?.data?.level || null) as typeof userLevel;
        setUserLevel(level === 'PROMAX' ? 'MAX' : level);
        setMembershipExpiresAt(json?.data?.membershipExpiresAt || null);
      } catch {
        return;
      }
    };

    loadUserInfo();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleLocalStorageChange);
    };
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      StorageManager.remove(STORAGE_KEYS.USER_NAME);
      StorageManager.remove(STORAGE_KEYS.USER_AVATAR);
      setUserAvatar('');
      setUserLevel(null);
      setMembershipExpiresAt(null);
      setIsMobileOpen(false);
      router.push('/login');
      router.refresh();
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
      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 backdrop-blur-sm rounded-full shadow-sm border border-sidebar-border bg-sidebar/80 text-sidebar-text/70 hover:bg-sidebar hover:text-sidebar-text transition-all"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {showFullAnnouncement && (
        <AnnouncementModal forceOpen={true} onClose={() => setShowFullAnnouncement(false)} />
      )}

      <div
        className={`sidebar-shell flex h-screen flex-col border-r transition-all duration-300 
        fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0
        ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isVisualMax ? 'bg-[#18181b] border-white/10 text-[#f4f4f5]' : 'bg-sidebar border-sidebar-border text-sidebar-text'}
      `}
      >
        <div className={`sidebar-header flex items-center justify-between h-16 px-4 relative border-b 
            ${isVisualMax ? 'bg-[#18181b] border-white/10' : 'bg-sidebar-header border-sidebar-border'}
        `}>
          {/* Minimalist Bamboo Pattern Overlay - Removed for cleaner look in MAX mode */}
          {!isVisualMax && (
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 10% 20%, currentColor 1px, transparent 1px), radial-gradient(circle at 90% 80%, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              color: 'var(--color-sidebar-text)'
            }}>
          </div>
          )}

          {!isCollapsed && (
            <span className="text-xl font-bold truncate tracking-tight text-sidebar-text">墨灵写作助手</span>
          )}
          <div className="flex items-center gap-2 z-10">
            {!isCollapsed && (
              <button
                onClick={toggleFullscreen}
                className="transition-colors p-1 text-sidebar-text/60 hover:text-sidebar-text"
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
              <div className={`relative rounded-full overflow-hidden border-2 shadow-sm transition-all group-hover:shadow-md flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'} border-sidebar-border bg-sidebar-active/20 group-hover:border-sidebar-active/40`}>
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="transition-colors text-sidebar-text/40 group-hover:text-sidebar-text">
                    <User className="w-5 h-5" />
                  </div>
                )}
                {userLevel && shouldShowLevelBadge(userLevel) && (
                  <span
                    className={`absolute -right-1 -bottom-1 px-1 py-[1px] rounded-full text-[9px] leading-none text-white border border-white/70 ${getLevelColor(userLevel)}`}
                  >
                    {getLevelLabel(userLevel)}
                  </span>
                )}
              </div>
            </button>
            {!isCollapsed && userLevel && (shouldShowLevelBadge(userLevel) || shouldShowExpiry(userLevel)) && (
              <span className="flex items-center gap-2">
                {shouldShowLevelBadge(userLevel) && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${getLevelColor(userLevel)}`}>
                    {getLevelLabel(userLevel)}
                  </span>
                )}
                {shouldShowExpiry(userLevel) && membershipExpiresAt && (
                  <span className="text-xs text-sidebar-text/50">
                    到期 {formatExpiryDate(membershipExpiresAt)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1 px-2">
            {displayedMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden ${isCollapsed ? 'justify-center' : ''
                      } ${isActive
                        ? 'text-sidebar-active-text bg-sidebar-active'
                        : 'text-sidebar-text/65 hover:text-sidebar-text hover:bg-sidebar-active/50'
                      }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${isCollapsed ? 'w-6 h-6' : ''
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
          <div className="px-4 py-3 relative group bg-sidebar-active/10 border-t border-sidebar-border">
            <button
              onClick={() => setShowAnnouncement(false)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-text/40 hover:text-sidebar-text"
              title="关闭公告"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-2 mb-2 text-daiqing font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cinnabar animate-pulse"></span>
              更新公告 (v1.3.3)
            </div>
            <div className={`text-xs space-y-1.5 leading-relaxed text-sidebar-text/60`}>
              <p>1. <span className="font-bold text-sidebar-text">Max 创作中心升级</span>：UI 全新改版，支持全局模型独立配置。</p>
              <p>2. <span className="font-bold text-sidebar-text">体验优化</span>：一致性检查升级，系统稳定性提升。</p>
            </div>
          </div>
        )}

        {/* 收起时的公告图标提示 */}
        {showAnnouncement && isCollapsed && (
          <div className="py-4 flex justify-center border-t border-sidebar-border">
            <div className="relative group cursor-pointer" onClick={() => setIsCollapsed(false)}>
              <div className="w-2 h-2 rounded-full bg-cinnabar animate-pulse absolute top-0 right-0"></div>
              <BookOpen className="w-5 h-5 text-sidebar-text/50 group-hover:text-sidebar-text" />
            </div>
          </div>
        )}

        <div
          className={`p-4 border-t border-sidebar-border text-xs text-sidebar-text/40 hover:text-sidebar-text transition-colors ${isCollapsed ? 'text-center cursor-pointer' : ''}`}
          onClick={() => setShowFullAnnouncement(true)}
          title="点击查看更新公告"
        >
          {isCollapsed ? (
            'v1.3.4'
          ) : (
            <div className="flex items-center justify-between">
              <span className="cursor-pointer">v1.3.4</span>
              {userLevel && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-sidebar-border bg-sidebar-active/20 text-sidebar-text/70 hover:bg-sidebar-active/40 hover:text-sidebar-text transition-colors"
                  title="退出登录"
                  type="button"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
