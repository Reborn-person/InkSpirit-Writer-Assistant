'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Edit3, ChevronRight, Trophy, TrendingUp, Star, Clock, Search, Filter, Sparkles, Save, X, ChevronDown, ChevronUp, FileText, Lightbulb, Target, Zap, LayoutTemplate, Bot, Loader2, Globe } from 'lucide-react';
import { StorageManager } from '@/lib/storage';

// 拆书模板类型
type TemplateType = 'standard' | 'professional';

// 标准拆书数据结构
interface BookAnalysis {
  id: string;
  title: string;
  author: string;
  genre: string;
  wordCount: string;
  summary: string;
  templateType: TemplateType;
  // 核心拆解
  core: {
    theme: string;
    hook: string;
    conflict: string;
    climax: string;
    ending: string;
  };
  // 结构拆解
  structure: {
    act1: string;
    act2: string;
    act3: string;
    act4: string;
  };
  // 人物分析
  characters: Array<{
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting';
    traits: string;
    arc: string;
  }>;
  // 技巧分析
  techniques: {
    pacing: string;
    suspense: string;
    dialogue: string;
    description: string;
  };
  // 市场数据
  market: {
    platform: string;
    rating: number;
    heat: number;
    tags: string[];
  };
  // 专业模板额外字段
  professional?: {
    coreHook: string;           // 核心梗（The Hook）
    coreFormula: string;        // 核心公式
    protagonistTags: string;    // 主角标签
    protagonistContrast: string;// 主角反差点
    antagonistType: string;     // 反派类型
    antagonistFunction: string; // 反派功能
    bondFunction: string;       // 羁绊功能
    materialGap: string;        // 物资差爽点
    faceSlap: string;           // 打脸爽点
    timeGap: string;            // 时间差爽点
    chapter1Hook: string;       // 第1章钩子
    chapterEndHook: string;     // 章末钩子
    emotionalResonance: string; // 情绪共鸣点
    nostalgia: string;          // 代入感/怀旧杀
    trafficPassword: string;    // 流量密码
    imitationIdeas: string[];   // 仿写脑洞
  };
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'module13_book_analysis_v2';

// 示例数据 - 标准模板
const SAMPLE_ANALYSIS_STANDARD: BookAnalysis = {
  id: 'sample_1',
  title: '斗破苍穹',
  author: '天蚕土豆',
  genre: '玄幻',
  wordCount: '500万+',
  summary: '少年萧炎从天才沦为废人，在药老帮助下重获斗气，踏上复仇与成长之路',
  templateType: 'standard',
  core: {
    theme: '逆境崛起，永不放弃',
    hook: '天才变废材的反差设定',
    conflict: '与云岚宗的恩怨情仇',
    climax: '三上云岚宗，最终决战',
    ending: '成为斗帝，拯救大陆'
  },
  structure: {
    act1: '乌坦城：建立主角形象，引入药老',
    act2: '迦南学院：成长修炼，建立人脉',
    act3: '中州历练：面对魂殿，寻找异火',
    act4: '最终决战：成为斗帝，击败魂天帝'
  },
  characters: [
    { name: '萧炎', role: 'protagonist', traits: '坚韧、重情义、天赋异禀', arc: '从废材到斗帝的逆袭之路' },
    { name: '药老', role: 'supporting', traits: '神秘、强大、亦师亦友', arc: '灵魂体到重获肉身' },
    { name: '魂天帝', role: 'antagonist', traits: '野心勃勃、残忍无情', arc: '最终BOSS的覆灭' }
  ],
  techniques: {
    pacing: '快节奏升级流，爽点密集',
    suspense: '层层递进的实力提升',
    dialogue: '热血中二，符合年轻读者',
    description: '战斗场面宏大，特效感强'
  },
  market: {
    platform: '起点中文网',
    rating: 9.2,
    heat: 98,
    tags: ['玄幻', '升级流', '热血', '逆袭']
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 示例数据 - 专业模板（两界倒爷）
const SAMPLE_ANALYSIS_PROFESSIONAL: BookAnalysis = {
  id: 'sample_2',
  title: '两界倒爷：从1988到2025',
  author: '示例作者',
  genre: '都市',
  wordCount: '100万+',
  summary: '落魄男主获得连接1988年贫困农村与2025年繁华都市的双穿门，利用物资差进行双向倒卖',
  templateType: 'professional',
  core: {
    theme: '利用时代信息差实现逆袭',
    hook: '双穿门连接两个时代',
    conflict: '在两个时代生存并建立商业帝国',
    climax: '成为两界最强倒爷',
    ending: '改变两个时代的命运'
  },
  structure: {
    act1: '发现穿越能力，解决生存危机',
    act2: '建立倒卖渠道，积累原始资本',
    act3: '扩大商业版图，面对各方势力',
    act4: '成为两界传奇，实现人生巅峰'
  },
  characters: [
    { name: '陆唯', role: 'protagonist', traits: '护短、脸皮厚、行动力强', arc: '从落魄到掌控两界资源' },
    { name: '苏二宝', role: 'antagonist', traits: '势利眼、爱炫耀', arc: '被打脸的小丑角色' },
    { name: '妹妹', role: 'supporting', traits: '懂事、可爱', arc: '被哥哥宠爱的幸福成长' }
  ],
  techniques: {
    pacing: '快节奏，爽点密集',
    suspense: '时间流速差的悬念',
    dialogue: '年代感与现代感交织',
    description: '细节还原年代生活'
  },
  market: {
    platform: '番茄小说',
    rating: 9.0,
    heat: 95,
    tags: ['年代文', '双穿', '倒爷', '爽文']
  },
  professional: {
    coreHook: '落魄男主获得连接1988年贫困农村与2025年繁华都市的双穿门，利用"时代的垃圾是彼得的黄金"这一逻辑，进行物资与技术的双向倒卖',
    coreFormula: '极度匮乏的过去（痛点） + 极度富裕的未来（金手指） + 极大的时间流速差（外挂中的外挂）',
    protagonistTags: '护短、脸皮厚（倒爷必备）、行动力强、有家庭责任感',
    protagonistContrast: '在1988是被邻居瞧不起的穷小子，在2025是没身份证的"黑户"，但两界结合后他是掌控资源的"神"',
    antagonistType: '极品邻居/嫌贫爱富型',
    antagonistFunction: '提供初期的"压抑感"。通过炫耀电视、嘲笑主角家穷，积累读者的"憋屈值"，为主角打脸做铺垫',
    bondFunction: '懂事的妹妹、偏心的奶奶、受气的父母。这些是主角搞钱的原动力，也是爽点爆发后的情感承接处',
    materialGap: '2025年的垃圾（空酒瓶、烂水果） = 1988年的宝贝。这种"捡垃圾成首富"的低成本高回报设定',
    faceSlap: '邻居炫耀电视 -> 主角承诺买电视 -> 拿出现代水果（香蕉）降维打击邻居小孩',
    timeGap: '2025年的一天=1988年的一小时。主角拥有比别人多24倍的时间去学习、赚钱',
    chapter1Hook: '穿越机制的发现，那一滴血和消失的场景',
    chapterEndHook: '第6章结尾时间流速的谜题；第9章结尾主角立下"明天买电视"的Flag',
    emotionalResonance: '年代文的核心痛点是"匮乏"（吃不饱、被人看不起）。主角只需要当"搬运工"就能解决生存危机',
    nostalgia: '书中细节如"大解放鞋"、"几分钱的糖"、"看电视的卑微"，精准击中读者的怀旧情绪',
    trafficPassword: '现代人视若敝履的"烂水果"，在那个年代是顶级奢侈品。价值观的剧烈碰撞',
    imitationIdeas: [
      '《倒爷1980：我用螺丝母换回光刻机》- 硬核工业风',
      '《带着自助餐厅回六零，全村都被我喂胖了》- 饥荒囤货流',
      '《修仙倒爷：我拿不锈钢盆换灵石》- 两界修仙版',
      '《废土倒爷：一袋泡面换个女武神》- 末世互通版',
      '《大明倒爷：开局给崇祯直播带货》- 古今倒爷版'
    ]
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export default function Module13Page() {
  const [analyses, setAnalyses] = useState<BookAnalysis[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'heat'>('newest');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['core', 'structure']));
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('standard');
  
  // AI收集状态
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState('');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchAuthor, setAiSearchAuthor] = useState('');

  // 表单状态
  const [formData, setFormData] = useState<Partial<BookAnalysis>>({
    title: '',
    author: '',
    genre: '玄幻',
    wordCount: '',
    summary: '',
    templateType: 'standard',
    core: { theme: '', hook: '', conflict: '', climax: '', ending: '' },
    structure: { act1: '', act2: '', act3: '', act4: '' },
    characters: [],
    techniques: { pacing: '', suspense: '', dialogue: '', description: '' },
    market: { platform: '', rating: 0, heat: 0, tags: [] },
    professional: {
      coreHook: '',
      coreFormula: '',
      protagonistTags: '',
      protagonistContrast: '',
      antagonistType: '',
      antagonistFunction: '',
      bondFunction: '',
      materialGap: '',
      faceSlap: '',
      timeGap: '',
      chapter1Hook: '',
      chapterEndHook: '',
      emotionalResonance: '',
      nostalgia: '',
      trafficPassword: '',
      imitationIdeas: ['', '', '', '', '']
    }
  });

  // 加载数据
  useEffect(() => {
    const saved = StorageManager.getJSON(STORAGE_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      setAnalyses(saved);
    } else {
      // 首次使用添加示例
      setAnalyses([SAMPLE_ANALYSIS_STANDARD, SAMPLE_ANALYSIS_PROFESSIONAL]);
      StorageManager.setJSON(STORAGE_KEY, [SAMPLE_ANALYSIS_STANDARD, SAMPLE_ANALYSIS_PROFESSIONAL]);
    }
  }, []);

  // 保存数据
  useEffect(() => {
    if (analyses.length > 0) {
      StorageManager.setJSON(STORAGE_KEY, analyses);
    }
  }, [analyses]);

  const selectedAnalysis = analyses.find(a => a.id === selectedId);

  // 过滤和排序
  const filteredAnalyses = analyses
    .filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           a.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = filterGenre === 'all' || a.genre === filterGenre;
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'rating') return b.market.rating - a.market.rating;
      if (sortBy === 'heat') return b.market.heat - a.market.heat;
      return 0;
    });

  // 类型列表
  const genres = ['all', '玄幻', '仙侠', '都市', '科幻', '历史', '悬疑', '言情', '其他'];

  const handleCreate = () => {
    setFormData({
      title: '',
      author: '',
      genre: '玄幻',
      wordCount: '',
      summary: '',
      templateType: selectedTemplate,
      core: { theme: '', hook: '', conflict: '', climax: '', ending: '' },
      structure: { act1: '', act2: '', act3: '', act4: '' },
      characters: [{ name: '', role: 'protagonist', traits: '', arc: '' }],
      techniques: { pacing: '', suspense: '', dialogue: '', description: '' },
      market: { platform: '', rating: 0, heat: 0, tags: [] },
      professional: selectedTemplate === 'professional' ? {
        coreHook: '',
        coreFormula: '',
        protagonistTags: '',
        protagonistContrast: '',
        antagonistType: '',
        antagonistFunction: '',
        bondFunction: '',
        materialGap: '',
        faceSlap: '',
        timeGap: '',
        chapter1Hook: '',
        chapterEndHook: '',
        emotionalResonance: '',
        nostalgia: '',
        trafficPassword: '',
        imitationIdeas: ['', '', '', '', '']
      } : undefined
    });
    setIsCreating(true);
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleEdit = () => {
    if (!selectedAnalysis) return;
    setFormData({ ...selectedAnalysis });
    setSelectedTemplate(selectedAnalysis.templateType);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!formData.title) return;

    const now = Date.now();
    if (isCreating) {
      const newAnalysis: BookAnalysis = {
        id: `analysis_${now}_${Math.random().toString(36).substr(2, 9)}`,
        title: formData.title || '',
        author: formData.author || '',
        genre: formData.genre || '玄幻',
        wordCount: formData.wordCount || '',
        summary: formData.summary || '',
        templateType: formData.templateType || 'standard',
        core: formData.core || { theme: '', hook: '', conflict: '', climax: '', ending: '' },
        structure: formData.structure || { act1: '', act2: '', act3: '', act4: '' },
        characters: formData.characters || [],
        techniques: formData.techniques || { pacing: '', suspense: '', dialogue: '', description: '' },
        market: formData.market || { platform: '', rating: 0, heat: 0, tags: [] },
        professional: formData.templateType === 'professional' ? formData.professional : undefined,
        createdAt: now,
        updatedAt: now
      };
      setAnalyses(prev => [newAnalysis, ...prev]);
      setSelectedId(newAnalysis.id);
    } else if (isEditing && selectedId) {
      setAnalyses(prev => prev.map(a => 
        a.id === selectedId 
          ? { ...a, ...formData, updatedAt: now } as BookAnalysis
          : a
      ));
    }

    setIsCreating(false);
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这个拆书分析吗？')) return;
    setAnalyses(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const addCharacter = () => {
    setFormData(prev => ({
      ...prev,
      characters: [...(prev.characters || []), { name: '', role: 'supporting', traits: '', arc: '' }]
    }));
  };

  const removeCharacter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      characters: prev.characters?.filter((_, i) => i !== index) || []
    }));
  };

  const updateCharacter = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      characters: prev.characters?.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ) || []
    }));
  };

  const updateImitationIdea = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      professional: {
        ...prev.professional!,
        imitationIdeas: prev.professional?.imitationIdeas?.map((idea, i) => 
          i === index ? value : idea
        ) || ['', '', '', '', '']
      }
    }));
  };

  // 排行榜数据
  const topRated = [...analyses].sort((a, b) => b.market.rating - a.market.rating).slice(0, 5);
  const hottest = [...analyses].sort((a, b) => b.market.heat - a.market.heat).slice(0, 5);

  // AI自动收集书籍信息
  const handleAICollect = async () => {
    if (!aiSearchQuery.trim()) {
      alert('请输入书名');
      return;
    }

    setIsCollecting(true);
    setCollectProgress('正在搜索书籍信息...');

    try {
      const response = await fetch('/api/book-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: aiSearchQuery,
          author: aiSearchAuthor || undefined,
          templateType: selectedTemplate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '收集失败');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setCollectProgress('正在填充数据...');
        
        // 将AI返回的数据填充到表单
        const aiData = result.data;
        setFormData(prev => ({
          ...prev,
          title: aiData.title || aiSearchQuery,
          author: aiData.author || aiSearchAuthor || '',
          genre: aiData.genre || prev.genre,
          wordCount: aiData.wordCount || '',
          summary: aiData.summary || '',
          core: aiData.core || prev.core,
          structure: aiData.structure || prev.structure,
          characters: aiData.characters || prev.characters,
          techniques: aiData.techniques || prev.techniques,
          market: aiData.market || prev.market,
          professional: selectedTemplate === 'professional' ? (aiData.professional || prev.professional) : undefined
        }));
        
        setCollectProgress('完成！');
        setTimeout(() => {
          setCollectProgress('');
          setIsCollecting(false);
        }, 1000);
      }
    } catch (error) {
      console.error('AI收集失败:', error);
      setCollectProgress('收集失败，请手动填写');
      setTimeout(() => {
        setCollectProgress('');
        setIsCollecting(false);
      }, 2000);
    }
  };

  // 渲染AI搜索界面
  const renderAISearchSection = () => (
    <div className="bg-gradient-to-r from-daiqing/5 to-purple-50 rounded-xl border border-daiqing/20 p-6 mb-6">
      <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
        <Bot className="w-5 h-5 text-daiqing" />
        <Globe className="w-4 h-4 text-daiqing" />
        AI自动收集
        <span className="text-xs text-ink/50 font-normal">让AI帮你上网搜索书籍信息</span>
      </h3>
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={aiSearchQuery}
            onChange={(e) => setAiSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            placeholder="输入书名，如：斗破苍穹"
            disabled={isCollecting}
          />
        </div>
        <div className="w-40">
          <input
            type="text"
            value={aiSearchAuthor}
            onChange={(e) => setAiSearchAuthor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            placeholder="作者（可选）"
            disabled={isCollecting}
          />
        </div>
        <button
          onClick={handleAICollect}
          disabled={isCollecting || !aiSearchQuery.trim()}
          className="px-4 py-2 bg-daiqing text-white rounded-lg hover:bg-daiqing/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
        >
          {isCollecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              收集中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI收集
            </>
          )}
        </button>
      </div>
      {collectProgress && (
        <div className="mt-3 flex items-center gap-2 text-sm text-daiqing">
          <Loader2 className="w-4 h-4 animate-spin" />
          {collectProgress}
        </div>
      )}
    </div>
  );

  // 渲染标准模板表单
  const renderStandardForm = () => (
    <>
      {/* AI搜索 */}
      {renderAISearchSection()}

      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-daiqing" />
          基本信息
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">书名</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="输入书名"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">作者</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="输入作者"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">类型</label>
            <select
              value={formData.genre}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            >
              {genres.filter(g => g !== 'all').map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">字数</label>
            <input
              type="text"
              value={formData.wordCount}
              onChange={(e) => setFormData(prev => ({ ...prev, wordCount: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="如：100万字"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-ink/60 mb-1">简介</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-20 resize-none"
              placeholder="输入书籍简介"
            />
          </div>
        </div>
      </div>

      {/* 核心拆解 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          核心拆解
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">核心主题</label>
            <input
              type="text"
              value={formData.core?.theme}
              onChange={(e) => setFormData(prev => ({ ...prev, core: { ...prev.core!, theme: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="书籍传达的核心思想"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">开篇钩子</label>
            <input
              type="text"
              value={formData.core?.hook}
              onChange={(e) => setFormData(prev => ({ ...prev, core: { ...prev.core!, hook: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="如何吸引读者继续阅读"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">核心冲突</label>
            <input
              type="text"
              value={formData.core?.conflict}
              onChange={(e) => setFormData(prev => ({ ...prev, core: { ...prev.core!, conflict: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="故事的主要矛盾"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">高潮设计</label>
            <input
              type="text"
              value={formData.core?.climax}
              onChange={(e) => setFormData(prev => ({ ...prev, core: { ...prev.core!, climax: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="故事的高潮点"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">结局处理</label>
            <input
              type="text"
              value={formData.core?.ending}
              onChange={(e) => setFormData(prev => ({ ...prev, core: { ...prev.core!, ending: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="结局如何收尾"
            />
          </div>
        </div>
      </div>

      {/* 结构拆解 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          结构拆解（起承转合）
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">起 - 开篇布局</label>
            <textarea
              value={formData.structure?.act1}
              onChange={(e) => setFormData(prev => ({ ...prev, structure: { ...prev.structure!, act1: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="故事如何开始，人物和背景的建立"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">承 - 情节发展</label>
            <textarea
              value={formData.structure?.act2}
              onChange={(e) => setFormData(prev => ({ ...prev, structure: { ...prev.structure!, act2: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="故事如何推进，冲突如何升级"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">转 - 转折高潮</label>
            <textarea
              value={formData.structure?.act3}
              onChange={(e) => setFormData(prev => ({ ...prev, structure: { ...prev.structure!, act3: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="故事的转折点和最高潮"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">合 - 结局收尾</label>
            <textarea
              value={formData.structure?.act4}
              onChange={(e) => setFormData(prev => ({ ...prev, structure: { ...prev.structure!, act4: e.target.value } }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="故事如何结束，人物命运如何"
            />
          </div>
        </div>
      </div>
    </>
  );

  // 渲染专业模板表单
  const renderProfessionalForm = () => (
    <>
      {/* AI搜索 */}
      {renderAISearchSection()}

      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-daiqing" />
          基本信息
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">书名</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="输入书名"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">作者</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="输入作者"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">类型</label>
            <select
              value={formData.genre}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            >
              {genres.filter(g => g !== 'all').map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">字数</label>
            <input
              type="text"
              value={formData.wordCount}
              onChange={(e) => setFormData(prev => ({ ...prev, wordCount: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="如：100万字"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-ink/60 mb-1">简介</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-20 resize-none"
              placeholder="输入书籍简介"
            />
          </div>
        </div>
      </div>

      {/* 核心梗（The Hook） */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-red-500" />
          核心梗（The Hook）
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">一句话总结</label>
            <textarea
              value={formData.professional?.coreHook}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, coreHook: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-20 resize-none"
              placeholder="用一句话概括这本书的核心卖点"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">核心公式</label>
            <input
              type="text"
              value={formData.professional?.coreFormula}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, coreFormula: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="如：痛点 + 金手指 + 外挂"
            />
          </div>
        </div>
      </div>

      {/* 人设拆解 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-purple-500" />
          人设拆解
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">主角标签</label>
            <input
              type="text"
              value={formData.professional?.protagonistTags}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, protagonistTags: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="主角的性格标签，如：护短、脸皮厚、行动力强"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">主角反差点</label>
            <textarea
              value={formData.professional?.protagonistContrast}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, protagonistContrast: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="主角在不同场景下的反差表现"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">反派类型</label>
            <input
              type="text"
              value={formData.professional?.antagonistType}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, antagonistType: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="如：极品邻居/嫌贫爱富型"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">反派功能</label>
            <textarea
              value={formData.professional?.antagonistFunction}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, antagonistFunction: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="反派在故事中的作用"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">羁绊功能</label>
            <textarea
              value={formData.professional?.bondFunction}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, bondFunction: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="家人/朋友等羁绊角色的作用"
            />
          </div>
        </div>
      </div>

      {/* 爽点节奏拆解 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          爽点节奏拆解
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">物资差爽点（小爽）</label>
            <textarea
              value={formData.professional?.materialGap}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, materialGap: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="利用物资差带来的爽点"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">打脸爽点（中爽）</label>
            <textarea
              value={formData.professional?.faceSlap}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, faceSlap: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="打脸情节的设计"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">时间差爽点（暗爽）</label>
            <textarea
              value={formData.professional?.timeGap}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, timeGap: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="时间差带来的隐性优势"
            />
          </div>
        </div>
      </div>

      {/* 悬念与钩子 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-blue-500" />
          悬念与钩子
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">第1章钩子</label>
            <input
              type="text"
              value={formData.professional?.chapter1Hook}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, chapter1Hook: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
              placeholder="开篇如何吸引读者"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">章末钩子</label>
            <textarea
              value={formData.professional?.chapterEndHook}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, chapterEndHook: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="章末如何留住读者"
            />
          </div>
        </div>
      </div>

      {/* 火的原因分析 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          火的原因分析（底层逻辑）
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink/60 mb-1">情绪共鸣点</label>
            <textarea
              value={formData.professional?.emotionalResonance}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, emotionalResonance: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="读者为什么能产生共鸣"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">代入感/怀旧杀</label>
            <textarea
              value={formData.professional?.nostalgia}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, nostalgia: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="如何营造代入感"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/60 mb-1">流量密码</label>
            <textarea
              value={formData.professional?.trafficPassword}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                professional: { ...prev.professional!, trafficPassword: e.target.value } 
              }))}
              className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20 h-16 resize-none"
              placeholder="吸引流量的核心要素"
            />
          </div>
        </div>
      </div>

      {/* 仿写脑洞 */}
      <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
        <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-500" />
          仿写脑洞创作（5个落地版本）
        </h3>
        <div className="space-y-3">
          {formData.professional?.imitationIdeas?.map((idea, index) => (
            <div key={index}>
              <label className="block text-sm text-ink/60 mb-1">脑洞 {index + 1}</label>
              <input
                type="text"
                value={idea}
                onChange={(e) => updateImitationIdea(index, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                placeholder={`仿写方向 ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-ink/10 bg-white/50 flex flex-col">
        <div className="p-4 border-b border-ink/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink/80 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-daiqing" />
              拆书库
            </h2>
            <button
              onClick={handleCreate}
              className="p-2 rounded-lg bg-daiqing text-white hover:opacity-90 transition-colors"
              title="新建拆书"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 搜索 */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索书名或作者..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-ink/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            />
          </div>

          {/* 筛选 */}
          <div className="flex gap-2">
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-ink/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            >
              {genres.map(g => (
                <option key={g} value={g}>{g === 'all' ? '全部类型' : g}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-ink/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
            >
              <option value="newest">最新</option>
              <option value="rating">评分</option>
              <option value="heat">热度</option>
            </select>
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredAnalyses.map(analysis => (
            <div
              key={analysis.id}
              onClick={() => { setSelectedId(analysis.id); setIsCreating(false); setIsEditing(false); }}
              className={`p-4 border-b border-ink/5 cursor-pointer transition-colors ${
                selectedId === analysis.id ? 'bg-daiqing/10 border-l-4 border-l-daiqing' : 'hover:bg-white/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-ink/80 truncate">{analysis.title}</h3>
                    {analysis.templateType === 'professional' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">专业</span>
                    )}
                  </div>
                  <p className="text-xs text-ink/50 mt-1">{analysis.author} · {analysis.genre}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs flex items-center gap-1 text-amber-600">
                      <Star className="w-3 h-3 fill-current" />
                      {analysis.market.rating}
                    </span>
                    <span className="text-xs flex items-center gap-1 text-red-500">
                      <TrendingUp className="w-3 h-3" />
                      {analysis.market.heat}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(analysis.id); }}
                  className="p-1.5 text-ink/30 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 中间内容区 */}
      <div className="flex-1 overflow-y-auto">
        {(isCreating || isEditing) ? (
          /* 创建/编辑表单 */
          <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-ink/80">
                  {isCreating ? '新建拆书分析' : '编辑拆书分析'}
                </h2>
                {/* 模板选择 */}
                {isCreating && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-ink/60">选择模板：</span>
                    <button
                      onClick={() => setSelectedTemplate('standard')}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedTemplate === 'standard' 
                          ? 'bg-daiqing text-white' 
                          : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                      }`}
                    >
                      <LayoutTemplate className="w-3 h-3 inline mr-1" />
                      标准模板
                    </button>
                    <button
                      onClick={() => setSelectedTemplate('professional')}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedTemplate === 'professional' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                      }`}
                    >
                      <FileText className="w-3 h-3 inline mr-1" />
                      专业模板
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsCreating(false); setIsEditing(false); }}
                  className="px-4 py-2 rounded-lg border border-ink/10 text-ink/60 hover:bg-ink/5"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-daiqing text-white hover:opacity-90 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>
            </div>

            {selectedTemplate === 'standard' ? renderStandardForm() : renderProfessionalForm()}

            {/* 人物分析（两种模板共用） */}
            <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ink/80 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" />
                  人物分析
                </h3>
                <button
                  onClick={addCharacter}
                  className="px-3 py-1.5 text-sm rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  添加人物
                </button>
              </div>
              <div className="space-y-4">
                {formData.characters?.map((char, index) => (
                  <div key={index} className="p-4 bg-ink/5 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-ink/60">人物 {index + 1}</span>
                      <button
                        onClick={() => removeCharacter(index)}
                        className="p-1 text-ink/30 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={char.name}
                        onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                        placeholder="姓名"
                      />
                      <select
                        value={char.role}
                        onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                      >
                        <option value="protagonist">主角</option>
                        <option value="antagonist">反派</option>
                        <option value="supporting">配角</option>
                      </select>
                      <input
                        type="text"
                        value={char.traits}
                        onChange={(e) => updateCharacter(index, 'traits', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                        placeholder="性格特点"
                      />
                      <input
                        type="text"
                        value={char.arc}
                        onChange={(e) => updateCharacter(index, 'arc', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                        placeholder="人物弧线"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 市场数据（两种模板共用） */}
            <div className="bg-white rounded-xl border border-ink/10 p-6">
              <h3 className="font-medium text-ink/80 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                市场数据
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-ink/60 mb-1">平台</label>
                  <input
                    type="text"
                    value={formData.market?.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, market: { ...prev.market!, platform: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                    placeholder="首发平台"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink/60 mb-1">标签（逗号分隔）</label>
                  <input
                    type="text"
                    value={formData.market?.tags?.join(', ')}
                    onChange={(e) => setFormData(prev => ({ ...prev, market: { ...prev.market!, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } }))}
                    className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                    placeholder="玄幻, 热血, 逆袭"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink/60 mb-1">评分 (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.market?.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, market: { ...prev.market!, rating: parseFloat(e.target.value) || 0 } }))}
                    className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ink/60 mb-1">热度 (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.market?.heat}
                    onChange={(e) => setFormData(prev => ({ ...prev, market: { ...prev.market!, heat: parseInt(e.target.value) || 0 } }))}
                    className="w-full px-3 py-2 rounded-lg border border-ink/10 focus:outline-none focus:ring-2 focus:ring-daiqing/20"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : selectedAnalysis ? (
          /* 详情展示 */
          <div className="max-w-4xl mx-auto p-6">
            {/* 头部 */}
            <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-ink/80">{selectedAnalysis.title}</h1>
                    {selectedAnalysis.templateType === 'professional' && (
                      <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium">
                        专业拆书
                      </span>
                    )}
                  </div>
                  <p className="text-ink/60 mt-2">{selectedAnalysis.author} · {selectedAnalysis.genre} · {selectedAnalysis.wordCount}</p>
                  <p className="text-ink/50 mt-3 text-sm leading-relaxed">{selectedAnalysis.summary}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="flex items-center gap-1 text-amber-600">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{selectedAnalysis.market.rating}</span>
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">{selectedAnalysis.market.heat}</span>
                    </span>
                    <span className="text-ink/40 text-sm">{selectedAnalysis.market.platform}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {selectedAnalysis.market.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-daiqing/10 text-daiqing text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 rounded-lg border border-ink/10 text-ink/60 hover:bg-ink/5 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  编辑
                </button>
              </div>
            </div>

            {/* 专业模板特有内容 */}
            {selectedAnalysis.templateType === 'professional' && selectedAnalysis.professional && (
              <>
                {/* 核心梗 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('professional-core')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-500" />
                      核心梗（The Hook）
                    </h3>
                    {expandedSections.has('professional-core') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('professional-core') && (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-xs text-red-600 mb-1">一句话总结</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.coreHook}</div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-xs text-red-600 mb-1">核心公式</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.coreFormula}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 人设拆解 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('professional-character')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-purple-500" />
                      人设拆解
                    </h3>
                    {expandedSections.has('professional-character') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('professional-character') && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-xs text-purple-600 mb-1">主角标签</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.protagonistTags}</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-xs text-purple-600 mb-1">主角反差点</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.protagonistContrast}</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-xs text-purple-600 mb-1">反派类型</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.antagonistType}</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-xs text-purple-600 mb-1">反派功能</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.antagonistFunction}</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg md:col-span-2">
                        <div className="text-xs text-purple-600 mb-1">羁绊功能</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.bondFunction}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 爽点节奏 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('professional-satisfaction')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      爽点节奏拆解
                    </h3>
                    {expandedSections.has('professional-satisfaction') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('professional-satisfaction') && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">物资差爽点（小爽）</div>
                        <div className="text-ink/80 text-sm">{selectedAnalysis.professional.materialGap}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">打脸爽点（中爽）</div>
                        <div className="text-ink/80 text-sm">{selectedAnalysis.professional.faceSlap}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">时间差爽点（暗爽）</div>
                        <div className="text-ink/80 text-sm">{selectedAnalysis.professional.timeGap}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 悬念与钩子 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('professional-hook')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-blue-500" />
                      悬念与钩子
                    </h3>
                    {expandedSections.has('professional-hook') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('professional-hook') && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 mb-1">第1章钩子</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.chapter1Hook}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 mb-1">章末钩子</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.chapterEndHook}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 火的原因分析 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('professional-reason')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      火的原因分析（底层逻辑）
                    </h3>
                    {expandedSections.has('professional-reason') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('professional-reason') && (
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">情绪共鸣点</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.emotionalResonance}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">代入感/怀旧杀</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.nostalgia}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">流量密码</div>
                        <div className="text-ink/80">{selectedAnalysis.professional.trafficPassword}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 仿写脑洞 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('professional-imitation')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-pink-500" />
                      仿写脑洞创作（5个落地版本）
                    </h3>
                    {expandedSections.has('professional-imitation') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('professional-imitation') && (
                    <div className="mt-4 space-y-3">
                      {selectedAnalysis.professional.imitationIdeas?.map((idea, index) => (
                        <div key={index} className="p-4 bg-pink-50 rounded-lg">
                          <div className="text-xs text-pink-600 mb-1">脑洞 {index + 1}</div>
                          <div className="text-ink/80">{idea}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 标准模板内容 */}
            {selectedAnalysis.templateType === 'standard' && (
              <>
                {/* 核心拆解 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('core')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      核心拆解
                    </h3>
                    {expandedSections.has('core') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('core') && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">核心主题</div>
                        <div className="text-ink/80">{selectedAnalysis.core.theme}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">开篇钩子</div>
                        <div className="text-ink/80">{selectedAnalysis.core.hook}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">核心冲突</div>
                        <div className="text-ink/80">{selectedAnalysis.core.conflict}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <div className="text-xs text-amber-600 mb-1">高潮设计</div>
                        <div className="text-ink/80">{selectedAnalysis.core.climax}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg md:col-span-2">
                        <div className="text-xs text-amber-600 mb-1">结局处理</div>
                        <div className="text-ink/80">{selectedAnalysis.core.ending}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 结构拆解 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('structure')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      结构拆解（起承转合）
                    </h3>
                    {expandedSections.has('structure') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('structure') && (
                    <div className="mt-4 space-y-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">起</div>
                        <div className="flex-1 p-4 bg-blue-50 rounded-lg">
                          <div className="text-ink/80">{selectedAnalysis.structure.act1}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">承</div>
                        <div className="flex-1 p-4 bg-blue-50 rounded-lg">
                          <div className="text-ink/80">{selectedAnalysis.structure.act2}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">转</div>
                        <div className="flex-1 p-4 bg-blue-50 rounded-lg">
                          <div className="text-ink/80">{selectedAnalysis.structure.act3}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">合</div>
                        <div className="flex-1 p-4 bg-blue-50 rounded-lg">
                          <div className="text-ink/80">{selectedAnalysis.structure.act4}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 写作技巧 */}
                <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
                  <button
                    onClick={() => toggleSection('techniques')}
                    className="w-full flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-green-500" />
                      写作技巧
                    </h3>
                    {expandedSections.has('techniques') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
                  </button>
                  {expandedSections.has('techniques') && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">节奏控制</div>
                        <div className="text-ink/80">{selectedAnalysis.techniques.pacing}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">悬念设置</div>
                        <div className="text-ink/80">{selectedAnalysis.techniques.suspense}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">对话技巧</div>
                        <div className="text-ink/80">{selectedAnalysis.techniques.dialogue}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 mb-1">描写手法</div>
                        <div className="text-ink/80">{selectedAnalysis.techniques.description}</div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 人物分析（两种模板共用） */}
            <div className="bg-white rounded-xl border border-ink/10 p-6 mb-6">
              <button
                onClick={() => toggleSection('characters')}
                className="w-full flex items-center justify-between"
              >
                <h3 className="font-semibold text-ink/80 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-500" />
                  人物分析
                </h3>
                {expandedSections.has('characters') ? <ChevronUp className="w-5 h-5 text-ink/40" /> : <ChevronDown className="w-5 h-5 text-ink/40" />}
              </button>
              {expandedSections.has('characters') && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedAnalysis.characters.map((char, index) => (
                    <div key={index} className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-ink/80">{char.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          char.role === 'protagonist' ? 'bg-daiqing text-white' :
                          char.role === 'antagonist' ? 'bg-red-500 text-white' :
                          'bg-ink/20 text-ink/60'
                        }`}>
                          {char.role === 'protagonist' ? '主角' : char.role === 'antagonist' ? '反派' : '配角'}
                        </span>
                      </div>
                      <div className="text-xs text-ink/60 mb-1">性格：{char.traits}</div>
                      <div className="text-xs text-ink/60">弧线：{char.arc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 空状态 */
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-ink/40">
              <BookOpen className="w-16 h-16 mx-auto mb-4" />
              <p>选择一本书查看拆书分析</p>
              <p className="text-sm mt-2">或点击左上角 + 创建新的拆书</p>
              <div className="flex gap-4 mt-6 justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-lg bg-daiqing/10 flex items-center justify-center mb-2">
                    <LayoutTemplate className="w-8 h-8 text-daiqing" />
                  </div>
                  <div className="text-sm">标准模板</div>
                  <div className="text-xs text-ink/30">基础拆书结构</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
                    <FileText className="w-8 h-8 text-amber-600" />
                  </div>
                  <div className="text-sm">专业模板</div>
                  <div className="text-xs text-ink/30">深度爆款分析</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右侧排行榜 */}
      <div className="w-72 border-l border-ink/10 bg-white/50 p-4 overflow-y-auto">
        <h3 className="font-semibold text-ink/80 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          排行榜
        </h3>

        {/* 评分榜 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-ink/60 mb-3 flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" />
            评分榜
          </h4>
          <div className="space-y-2">
            {topRated.map((book, index) => (
              <div
                key={book.id}
                onClick={() => { setSelectedId(book.id); setIsCreating(false); setIsEditing(false); }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
              >
                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-ink/5 text-ink/40'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink/80 truncate">{book.title}</div>
                  <div className="text-xs text-ink/40">{book.author}</div>
                </div>
                <span className="text-sm font-semibold text-amber-600">{book.market.rating}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 热度榜 */}
        <div>
          <h4 className="text-sm font-medium text-ink/60 mb-3 flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-red-500" />
            热度榜
          </h4>
          <div className="space-y-2">
            {hottest.map((book, index) => (
              <div
                key={book.id}
                onClick={() => { setSelectedId(book.id); setIsCreating(false); setIsEditing(false); }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
              >
                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-red-100 text-red-600' :
                  index === 1 ? 'bg-orange-100 text-orange-600' :
                  index === 2 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-ink/5 text-ink/40'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink/80 truncate">{book.title}</div>
                  <div className="text-xs text-ink/40">{book.author}</div>
                </div>
                <span className="text-sm font-semibold text-red-500">{book.market.heat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
