'use client';

import { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronRight,
  Sparkles,
  Share2,
  Heart,
  Globe,
  FileJson,
  Upload
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';
import { PROMPTS } from '@/lib/prompts';

// Define MODULES constant since lib/modules doesn't exist
const MODULES = [
  { id: 'module0_5', name: '0.5 拆书模块' },
  { id: 'module1', name: '1. 脑洞具象化' },
  { id: 'module2', name: '2. 大纲生成' },
  { id: 'module2_5', name: '2.5 细纲生成' },
  { id: 'module3', name: '3. 开篇生成' },
  { id: 'module4', name: '4. 章节批量' },
  { id: 'module5', name: '5. 仿写创作' },
  { id: 'module6', name: '6. 全文润色' },
  { id: 'module7', name: '7. AI 辅助写作' },
  { id: 'module8', name: '8. 文章评审' },
  { id: 'module_max', name: 'Max 创作中心 - 大纲' },
  { id: 'module_max_outline', name: 'Max 创作中心 - 大纲范式' },
  { id: 'module_max_tracking', name: 'Max 创作中心 - 角色追踪' },
  { id: 'module_max_consistency_vector', name: 'Max 一致性检查 - 向量冲突检测' },
  { id: 'module_max_consistency_appearance', name: 'Max 一致性检查 - 外貌冲突检测' },
];

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

interface MarketPrompt extends PromptTemplate {
  uploaderName: string;
  likeCount: number;
  categoryId: string;
  createdAt: number;
}

interface Module10ManagerProps {
  onSelectPrompt?: (prompt: string) => void;
  onClose?: () => void;
}

export default function Module10Manager({ onSelectPrompt = () => {}, onClose = () => {} }: Module10ManagerProps) {
  const [activeSection, setActiveSection] = useState<'library' | 'market'>('library');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(MODULES[0].id);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [marketItems, setMarketItems] = useState<MarketPrompt[]>([]);
  const [likedMarketIds, setLikedMarketIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [marketTab, setMarketTab] = useState<'hot' | 'month' | 'latest' | 'liked'>('hot');
  const [marketCategoryId, setMarketCategoryId] = useState<string>('all');
  const [currentUsername, setCurrentUsername] = useState<string>('');

  const fetchWithFallback = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options ? { ...options, body: options.body } : undefined);
      if (res.status === 404 && url.includes('/market/prompts')) {
        const singularUrl = url.replace('/market/prompts', '/market/prompt');
        console.warn(`404 on ${url}, retrying with ${singularUrl}`);
        return fetch(singularUrl, options);
      }
      return res;
    } catch (e) {
      throw e;
    }
  };

  // Load user info
  useEffect(() => {
    // Always check session API to ensure fresh auth state
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.username) {
          setCurrentUsername(json.data.username);
          localStorage.setItem('username', json.data.username);
        } else {
          // If session is invalid, clear local username
          setCurrentUsername('');
          localStorage.removeItem('username');
        }
      })
      .catch((err) => {
        console.error('Auth check failed', err);
        // Fallback to localStorage if API fails (network error)
        const saved = localStorage.getItem('username');
        if (saved) setCurrentUsername(saved);
      });
  }, []);

  // Load local templates
  useEffect(() => {
    const loadTemplates = () => {
      const saved = StorageManager.getJSON(`prompt_templates_${selectedModuleId}`);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setPromptTemplates(saved);
      } else {
        // Try to load default from PROMPTS
        const defaultPrompt = PROMPTS[selectedModuleId];
        if (defaultPrompt && defaultPrompt.system) {
            const initialTemplate: PromptTemplate = {
                id: 'default',
                title: '默认提示词',
                content: defaultPrompt.system,
                lastModified: Date.now()
            };
            setPromptTemplates([initialTemplate]);
        } else {
            setPromptTemplates([]);
        }
      }
    };
    loadTemplates();
  }, [selectedModuleId]);

  // Fetch market items from API
  const fetchMarketItems = async () => {
    try {
      const res = await fetchWithFallback('/api/market/prompts');
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setMarketItems(json.data.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt).getTime(),
          lastModified: new Date(item.lastModified).getTime()
        })));
      } else {
        // Fallback or empty
        setMarketItems([]);
      }
    } catch (err) {
      console.error('Failed to fetch market items', err);
    }
  };

  // Load market items and liked status
  useEffect(() => {
    fetchMarketItems();
    
    // Load local liked status
    const loadLiked = async () => {
      const savedLiked = await StorageManager.getJSONAsync('prompt_market_liked');
      if (savedLiked && Array.isArray(savedLiked)) {
        setLikedMarketIds(savedLiked);
      }
    };
    loadLiked();
  }, []);

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    const newTemplates = editingTemplate.id 
      ? promptTemplates.map(t => t.id === editingTemplate.id ? { ...editingTemplate, lastModified: Date.now() } : t)
      : [...promptTemplates, { ...editingTemplate, id: Date.now().toString(), lastModified: Date.now() }];

    setPromptTemplates(newTemplates);
    StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, newTemplates);
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('确定要删除这个提示词吗？')) return;
    const newTemplates = promptTemplates.filter(t => t.id !== id);
    setPromptTemplates(newTemplates);
    StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, newTemplates);
  };

  const handleShareToMarket = async (template: PromptTemplate) => {
    // Re-check auth status right before sharing
    try {
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      
      if (!authRes.ok || !authJson.data || !authJson.data.username) {
        alert('登录状态已失效，请重新登录');
        // Clear local state
        setCurrentUsername('');
        localStorage.removeItem('username');
        return;
      }

      // Proceed with sharing
      const res = await fetchWithFallback('/api/market/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          content: template.content,
          categoryId: selectedModuleId
        })
      });

      if (res.ok) {
        alert('已分享到提示词市场');
        fetchMarketItems();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(`分享失败 (${res.status}): ${json.error || '未知错误'}`);
      }
    } catch (e) {
      console.error(e);
      alert('分享出错，请检查网络');
    }
  };

  const handleLikeMarketItem = async (item: MarketPrompt) => {
    if (likedMarketIds.includes(item.id)) return;

    // Add to local library
    const baseTemplates = StorageManager.getJSON(`prompt_templates_${item.categoryId}`) || [];
    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      title: item.title,
      content: item.content,
      lastModified: Date.now()
    };
    
    const updatedTemplates = [...baseTemplates, newTemplate];
    StorageManager.setJSON(`prompt_templates_${item.categoryId}`, updatedTemplates);
    
    // Update state if in same module
    if (item.categoryId === selectedModuleId) {
      setPromptTemplates(updatedTemplates);
    }

    // Call API to like
    try {
      await fetchWithFallback(`/api/market/prompts/${item.id}/like`, { method: 'POST' });
      // Don't await refresh, just update UI optimistically or lazily
      // fetchMarketItems(); 
    } catch (e) { 
      console.error(e); 
    }

    // Update liked status
    const updatedLiked = [...likedMarketIds, item.id];
    setLikedMarketIds(updatedLiked);
    StorageManager.setJSON('prompt_market_liked', updatedLiked);

    alert('已加入提示词库并点赞');
  };

  const handleDeleteMarketItem = async (item: MarketPrompt) => {
    // Only allow deletion if user is logged in and matches uploader
    if (!currentUsername || item.uploaderName !== currentUsername) return;
    
    if (!confirm('确定要删除这个提示词吗？')) return;

    try {
      const res = await fetchWithFallback(`/api/market/prompts/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMarketItems();
      } else {
        alert('删除失败');
      }
    } catch (e) {
      console.error(e);
      alert('删除出错');
    }
  };

  const filteredTemplates = promptTemplates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMarketItemsBase = marketItems
    .filter((item) => {
      if (marketCategoryId !== 'all' && item.categoryId !== marketCategoryId) return false;
      const q = marketSearchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.uploaderName.toLowerCase().includes(q)
      );
    })
    .filter((item) => {
      if (marketTab !== 'liked') return true;
      return likedMarketIds.includes(item.id);
    })
    .filter((item) => {
      if (marketTab !== 'month') return true;
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return now - item.createdAt <= thirtyDays;
    });

  const filteredMarketItems = [...filteredMarketItemsBase].sort((a, b) => {
    if (marketTab === 'latest') return b.createdAt - a.createdAt;
    if (marketTab === 'month' || marketTab === 'hot') return (b.likeCount ?? 0) - (a.likeCount ?? 0) || b.createdAt - a.createdAt;
    if (marketTab === 'liked') return b.createdAt - a.createdAt;
    return 0;
  });

  const selectedModuleName = MODULES.find(m => m.id === selectedModuleId)?.name;

  return (
    <div className="flex h-[calc(100vh-4rem)] glass-card overflow-hidden rounded-xl font-serif">
      {/* Sidebar: Module List */}
      <div className="w-64 bg-white/40 border-r border-ink/10 flex flex-col backdrop-blur-sm">
        <div className="p-4 border-b border-ink/10">
          <h2 className="font-bold text-ink flex items-center gap-2">
            <FileJson className="w-5 h-5 text-daiqing" />
            模块选择
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {MODULES.map(module => (
            <button
              key={module.id}
              onClick={() => setSelectedModuleId(module.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedModuleId === module.id
                  ? 'bg-daiqing/10 text-daiqing'
                  : 'text-ink/60 hover:bg-paper'
              }`}
            >
              {module.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Template List/Edit */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <div className="p-4 border-b border-ink/10 flex justify-between items-center bg-white/40 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => {
                  setActiveSection('library');
                  setViewMode('list');
                  setEditingTemplate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'library'
                    ? 'bg-daiqing/10 text-daiqing'
                    : 'text-ink/50 hover:bg-paper'
                }`}
              >
                提示词库
              </button>
              <button
                onClick={() => {
                  setActiveSection('market');
                  setViewMode('list');
                  setEditingTemplate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'market'
                    ? 'bg-daiqing/10 text-daiqing'
                    : 'text-ink/50 hover:bg-paper'
                }`}
              >
                提示词市场
              </button>
            </div>
            <h2 className="text-xl font-bold text-ink">
              {activeSection === 'library' 
                ? `${selectedModuleName} - 提示词库`
                : '提示词市场 (所有模块)'
              }
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeSection === 'library' && viewMode === 'list' && (
              <button
                onClick={() => {
                  setEditingTemplate({ id: '', title: '', content: '', lastModified: 0 });
                  setViewMode('edit');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-daiqing text-paper rounded-lg hover:bg-daiqing/90 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                新建
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ink/40 hover:text-ink hover:bg-paper rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-paper/30">
          {activeSection === 'library' ? (
            viewMode === 'list' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索本地提示词..."
                    className="w-full pl-9 pr-4 py-2 bg-white/50 border border-ink/10 rounded-lg text-sm focus:outline-none focus:border-daiqing/30 focus:ring-1 focus:ring-daiqing/30"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(template => (
                    <div 
                      key={template.id}
                      className="bg-white/60 p-4 rounded-xl border border-ink/5 hover:border-daiqing/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-ink/80">{template.title}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleShareToMarket(template)}
                            className="p-1.5 text-ink/40 hover:text-daiqing hover:bg-daiqing/10 rounded-lg"
                            title="分享到市场"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setViewMode('edit');
                            }}
                            className="p-1.5 text-ink/40 hover:text-daiqing hover:bg-daiqing/10 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 text-ink/40 hover:text-cinnabar hover:bg-cinnabar/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-ink/60 line-clamp-3 mb-3 font-mono bg-paper/50 p-2 rounded-lg">
                        {template.content}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-ink/30">
                          {new Date(template.lastModified).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => onSelectPrompt(template.content)}
                          className="flex items-center gap-1 text-xs text-daiqing hover:underline"
                        >
                          使用 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-white/60 p-6 rounded-xl border border-ink/5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1">标题</label>
                    <input
                      type="text"
                      value={editingTemplate?.title}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full px-4 py-2 bg-white/50 border border-ink/10 rounded-lg focus:outline-none focus:border-daiqing/30"
                      placeholder="输入提示词标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1">内容</label>
                    <textarea
                      value={editingTemplate?.content}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                      className="w-full h-64 px-4 py-3 bg-white/50 border border-ink/10 rounded-lg focus:outline-none focus:border-daiqing/30 font-mono text-sm resize-none"
                      placeholder="输入提示词内容..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setViewMode('list');
                        setEditingTemplate(null);
                      }}
                      className="px-4 py-2 text-ink/60 hover:bg-paper rounded-lg transition-colors text-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-daiqing text-paper rounded-lg hover:bg-daiqing/90 transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMarketTab('hot')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'hot' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  热榜
                </button>
                <button
                  onClick={() => setMarketTab('month')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'month' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  月榜
                </button>
                <button
                  onClick={() => setMarketTab('latest')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'latest' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  最新
                </button>
                <button
                  onClick={() => setMarketTab('liked')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'liked' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  已收藏
                </button>
              </div>

              <div className="bg-white/40 border border-ink/10 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMarketCategoryId('all')}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      marketCategoryId === 'all' ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20' : 'bg-white/60 border-ink/10 text-ink/60 hover:bg-paper'
                    }`}
                  >
                    全部
                  </button>
                  {MODULES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMarketCategoryId(m.id)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        marketCategoryId === m.id ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20' : 'bg-white/60 border-ink/10 text-ink/60 hover:bg-paper'
                      }`}
                      title={m.name}
                    >
                      {m.name.replace(/^\d+(\.\d+)?\s*/, '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                <input
                  type="text"
                  value={marketSearchTerm}
                  onChange={(e) => setMarketSearchTerm(e.target.value)}
                  placeholder="搜索市场提示词或上传者..."
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-ink/10 rounded-lg text-sm focus:outline-none focus:border-daiqing/30 focus:ring-1 focus:ring-daiqing/30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarketItems.map(item => (
                  <div 
                    key={item.id}
                    className="bg-white/70 p-4 rounded-xl border border-ink/10 hover:border-daiqing/30 transition-all flex flex-col shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-daiqing/10 border border-daiqing/20 flex items-center justify-center text-daiqing font-bold shrink-0">
                          {(item.uploaderName || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-paper/60 border border-ink/10 text-ink/60">
                              {MODULES.find(m => m.id === item.categoryId)?.name || item.categoryId}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-ink/40">
                              <Globe className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{item.uploaderName}</span>
                            </span>
                          </div>
                          <h3 className="font-bold text-ink/80 text-sm mt-1 truncate">{item.title}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleLikeMarketItem(item)}
                          className={`p-2 rounded-lg transition-colors ${
                            likedMarketIds.includes(item.id)
                              ? 'text-cinnabar bg-cinnabar/10'
                              : 'text-ink/40 hover:text-cinnabar hover:bg-cinnabar/10'
                          }`}
                          title="收藏并加入提示词库"
                        >
                          <Heart className={`w-4 h-4 ${likedMarketIds.includes(item.id) ? 'fill-current' : ''}`} />
                        </button>
                        <span className="text-xs text-ink/40 min-w-5 text-center">
                          {item.likeCount ?? 0}
                        </span>
                        {currentUsername && item.uploaderName === currentUsername && (
                          <button
                            onClick={() => handleDeleteMarketItem(item)}
                            className="p-2 rounded-lg text-ink/40 hover:text-cinnabar hover:bg-cinnabar/10 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-ink/70 bg-paper/50 p-3 rounded-lg h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap border border-ink/5 font-mono">
                      {item.content}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink/40">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectPrompt(item.content)}
                          className="px-3 py-1.5 rounded-lg bg-daiqing text-paper hover:bg-daiqing/90 transition-colors"
                          title="应用到当前模块"
                        >
                          使用
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredMarketItems.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-ink/30">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>暂无提示词</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
