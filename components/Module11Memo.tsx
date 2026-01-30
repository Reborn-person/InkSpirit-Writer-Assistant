'use client';

import { useState, useEffect } from 'react';
import { StorageManager } from '@/lib/storage';
import { 
  User, Settings, Globe, Layout, Book, Smile, FileText, 
  BookOpen, Zap, Feather, Copy, Search, Command, 
  Plus, Trash2, Edit2, Save, X, ChevronRight, Tag,
  AlertCircle, CheckCircle2, Lightbulb, Library
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CATEGORIES = [
  { id: 'character', name: '人设', icon: User, desc: '主角、配角、反派的核心设定与性格特征' },
  { id: 'brainstorm', name: '脑洞库', icon: Lightbulb, desc: '模块1生成的脑洞方案与灵感' },
  { id: 'dismantling', name: '拆书库', icon: Library, desc: '模块0.5生成的拆书分析结果' },
  { id: 'setting', name: '设定', icon: Settings, desc: '功法、道具、等级体系等具体设定' },
  { id: 'worldview', name: '世界观', icon: Globe, desc: '地理、历史、势力分布、种族等宏观背景' },
  { id: 'panel', name: '系统人物面板', icon: Layout, desc: '系统流面板属性、状态栏模板' },
  { id: 'vocabulary', name: '个人惯用词库', icon: Book, desc: '高频形容词、成语、动作描写词汇' },
  { id: 'meme', name: '热梗库', icon: Smile, desc: '流行梗、搞笑段子、吐槽金句' },
  { id: 'sample', name: '样本库', icon: FileText, desc: '优秀段落样本、描写范例' },
  { id: 'story', name: '故事库', icon: BookOpen, desc: '灵感片段、短篇故事、支线剧情' },
  { id: 'trope', name: '爽文套路/爽点', icon: Zap, desc: '装逼打脸、扮猪吃虎等经典套路结构' },
  { id: 'technique', name: '写作技巧', icon: Feather, desc: '结构法、节奏控制、情绪调动技巧' },
  { id: 'style_ref', name: '参考文风', icon: Copy, desc: '模仿对象的文风片段（需标注来源）' },
  { id: 'foreshadowing', name: '伏笔/拆书结果', icon: Search, desc: '前文事件概括与伏笔标记' },
  { id: 'instruction', name: '补充指令', icon: Command, desc: '给AI的额外指令或特殊规则' },
];

interface MemoItem {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  tags?: string[];
  isRef?: boolean; // For style_ref, indicates "Reference/Imitation"
}

export default function Module11Memo() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [items, setItems] = useState<MemoItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MemoItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MemoItem>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Load items when category changes
  useEffect(() => {
    const savedItems = StorageManager.getJSON(`memo_data_${activeCategory}`);
    if (savedItems && Array.isArray(savedItems)) {
      setItems(savedItems.sort((a, b) => b.lastModified - a.lastModified));
    } else {
      setItems([]);
    }
    setSelectedItem(null);
    setIsEditing(false);
  }, [activeCategory]);

  const handleSaveItem = () => {
    if (!editForm.title || !editForm.content) {
      alert('标题和内容不能为空');
      return;
    }

    const newItem: MemoItem = {
      id: editForm.id || Date.now().toString(),
      title: editForm.title,
      content: editForm.content,
      lastModified: Date.now(),
      tags: editForm.tags,
      isRef: editForm.isRef
    };

    let newItems = [...items];
    if (editForm.id) {
      // Update existing
      const index = newItems.findIndex(i => i.id === editForm.id);
      if (index !== -1) {
        newItems[index] = newItem;
      }
    } else {
      // Add new
      newItems = [newItem, ...newItems];
    }

    setItems(newItems);
    StorageManager.setJSON(`memo_data_${activeCategory}`, newItems);
    
    setSelectedItem(newItem);
    setIsEditing(false);
    setEditForm({});
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      const newItems = items.filter(i => i.id !== id);
      setItems(newItems);
      StorageManager.setJSON(`memo_data_${activeCategory}`, newItems);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
        setIsEditing(false);
      }
    }
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setIsEditing(true);
    setEditForm({
      title: '',
      content: '',
      isRef: activeCategory === 'style_ref' // Default true for style_ref
    });
  };

  const handleEdit = (item: MemoItem) => {
    setSelectedItem(item);
    setIsEditing(true);
    setEditForm({ ...item });
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6 max-w-[1600px] mx-auto font-serif">
      {/* Sidebar: Categories */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
        <h2 className="text-lg font-bold text-ink mb-4 px-2">知识库分类</h2>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group ${
              activeCategory === cat.id
                ? 'bg-daiqing text-white shadow-md'
                : 'bg-white/50 text-ink/70 hover:bg-white hover:text-ink hover:shadow-sm'
            }`}
          >
            <cat.icon className={`w-5 h-5 ${activeCategory === cat.id ? 'text-white' : 'text-daiqing/70 group-hover:text-daiqing'}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{cat.name}</div>
              {activeCategory === cat.id && (
                <div className="text-[10px] opacity-80 truncate">{cat.desc}</div>
              )}
            </div>
            {activeCategory === cat.id && <ChevronRight className="w-4 h-4 opacity-80" />}
          </button>
        ))}
      </div>

      {/* Middle: Item List */}
      <div className="w-80 flex-shrink-0 flex flex-col glass-card rounded-xl border border-ink/10 overflow-hidden">
        <div className="p-4 border-b border-ink/10 bg-paper/50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-ink">{CATEGORIES.find(c => c.id === activeCategory)?.name}</h3>
            <span className="text-xs text-ink/40">{items.length} 条记录</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-ink/30" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索..."
              className="w-full pl-8 pr-3 py-2 bg-white/60 border border-ink/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-daiqing/30"
            />
          </div>
          <button 
            onClick={handleAddNew}
            className="w-full py-2 bg-daiqing text-white rounded-lg flex items-center justify-center gap-2 hover:bg-daiqing/90 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 新建记录
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-paper/30">
          {filteredItems.length === 0 ? (
            <div className="text-center text-ink/30 py-10 text-sm">暂无记录</div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => { setSelectedItem(item); setIsEditing(false); }}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedItem?.id === item.id
                    ? 'bg-white border-daiqing/30 shadow-sm ring-1 ring-daiqing/10'
                    : 'bg-white/40 border-transparent hover:bg-white/70 hover:border-ink/5'
                }`}
              >
                <div className="font-medium text-ink truncate mb-1">{item.title}</div>
                <div className="text-xs text-ink/50 line-clamp-2">{item.content.substring(0, 100)}</div>
                <div className="flex justify-between items-center mt-2">
                   <span className="text-[10px] text-ink/30">
                     {new Date(item.lastModified).toLocaleDateString()}
                   </span>
                   {item.isRef && (
                     <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">
                       参考
                     </span>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Content Editor/Viewer */}
      <div className="flex-1 glass-card rounded-xl border border-ink/10 overflow-hidden flex flex-col bg-white/60">
        {isEditing ? (
          <div className="flex-1 flex flex-col p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                {editForm.id ? <Edit2 className="w-5 h-5 text-daiqing" /> : <Plus className="w-5 h-5 text-daiqing" />}
                {editForm.id ? '编辑记录' : '新建记录'}
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-ink/60 hover:bg-paper rounded-lg transition-colors text-sm"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveItem}
                  className="px-6 py-2 bg-daiqing text-white rounded-lg hover:bg-daiqing/90 transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
                >
                  <Save className="w-4 h-4" /> 保存
                </button>
              </div>
            </div>

            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">标题</label>
                <input 
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-ink/10 rounded-lg focus:outline-none focus:border-daiqing/50 focus:ring-2 focus:ring-daiqing/10 transition-all text-ink font-bold"
                  placeholder="请输入标题..."
                />
              </div>

              {activeCategory === 'style_ref' && (
                 <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <input 
                      type="checkbox" 
                      id="isRef"
                      checked={editForm.isRef || false}
                      onChange={(e) => setEditForm({...editForm, isRef: e.target.checked})}
                      className="w-4 h-4 text-daiqing rounded border-gray-300 focus:ring-daiqing"
                    />
                    <label htmlFor="isRef" className="text-sm text-yellow-800 cursor-pointer select-none">
                      这是一段参考/模仿素材（AI 将会仅学习风格而不照搬内容）
                    </label>
                 </div>
              )}

              {activeCategory === 'foreshadowing' && (
                 <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold mb-1">建议格式：</p>
                      <ul className="list-disc list-inside opacity-80 space-y-1">
                        <li>前文事件概括：[第X-Y章] 发生了...</li>
                        <li>伏笔标记：[伏笔] 神秘玉佩在第10章发光 (未回收)</li>
                      </ul>
                    </div>
                 </div>
              )}

              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-sm font-medium text-ink/70 mb-1">内容</label>
                <textarea 
                  value={editForm.content || ''}
                  onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  className="flex-1 w-full p-4 bg-white border border-ink/10 rounded-lg focus:outline-none focus:border-daiqing/50 focus:ring-2 focus:ring-daiqing/10 transition-all text-ink leading-relaxed resize-none custom-scrollbar font-mono text-sm"
                  placeholder="请输入详细内容..."
                />
              </div>
            </div>
          </div>
        ) : selectedItem ? (
          <div className="flex-1 flex flex-col relative h-full">
            {/* View Header */}
            <div className="p-6 border-b border-ink/5 bg-white/40 flex justify-between items-start sticky top-0 z-10 backdrop-blur-sm">
              <div>
                <h2 className="text-2xl font-bold text-ink mb-2">{selectedItem.title}</h2>
                <div className="flex items-center gap-3 text-xs text-ink/40">
                  <span>上次修改: {new Date(selectedItem.lastModified).toLocaleString()}</span>
                  {selectedItem.isRef && (
                    <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">
                      <AlertCircle className="w-3 h-3" /> 参考素材
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(selectedItem)}
                  className="p-2 text-ink/50 hover:text-daiqing hover:bg-daiqing/5 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  className="p-2 text-ink/50 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* View Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="prose prose-stone max-w-none prose-p:leading-loose prose-headings:font-serif">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedItem.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-ink/20">
            <BookOpen className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">选择左侧记录查看详情</p>
            <p className="text-sm mt-2">或点击“新建记录”添加内容</p>
          </div>
        )}
      </div>
    </div>
  );
}
