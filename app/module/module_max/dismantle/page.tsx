'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, BookOpen, Trash2, Copy, Check, Filter, Search, Layers, Database, Sparkles, ShoppingBag, Download, Star, Share2, Zap, Plus, Edit2 } from 'lucide-react';
import { generateAIContentStream, generateEmbeddings } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { APIConfigValidator } from '@/lib/api-validator';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { ModelConfigPanel, ModelConfig } from '@/app/components/ModelConfigPanel';
import { useMaxJob } from '@/contexts/MaxJobContext';
import { MASTER_TAG_LIST_CONFIG, CARD_EXTRACTION_PROMPT } from '@/lib/card-config';
import { FlipCard } from '@/components/FlipCard';

interface Card {
  id: string;
  type: string;
  title: string;
  example: string;
  analysis: string;
  tags: string[];
}

interface MarketCard extends Card {
  uploaderName: string;
  likeCount: number;
  createdAt: string | number;
}

export default function MaxDismantlePage() {
  const pathname = usePathname();
  const { isAiOpen } = useEditorAgent();

  const isMaxHome = pathname === '/module/module_max';
  const isMaxIdea = pathname === '/module/module_max/idea';
  const isMaxDismantle = pathname === '/module/module_max/dismantle';
  const isMaxCreation = pathname === '/module/module_max/creation';
  const isMaxPolish = pathname === '/module/module_max/polish';
  const isMaxOutline = pathname === '/module/module_max/outline';
  const isMaxConsistency = pathname === '/module/module_max/consistency';
  const isMaxHumanizer = pathname === '/module/module_max/humanizer';
  const isMaxGodMode = pathname === '/module/module_max/godmode';

  const [activeTab, setActiveTab] = useState<'vector' | 'card_extract' | 'card_library' | 'market'>('vector');

  // Market State
  const [marketSort, setMarketSort] = useState<'hot' | 'month' | 'latest' | 'liked'>('hot');
  const [marketCategory, setMarketCategory] = useState<string>('all');
  const [marketSearch, setMarketSearch] = useState('');
  const [likedCardIds, setLikedCardIds] = useState<string[]>([]);
  const [marketCards, setMarketCards] = useState<MarketCard[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [marketPage, setMarketPage] = useState(1);
  const CARDS_PER_PAGE = 30;

  const [isDragging, setIsDragging] = useState(false);
  const [maxSourceText, setMaxSourceText] = useState('');
  const maxSourceTextRef = useRef(maxSourceText);
  useEffect(() => { maxSourceTextRef.current = maxSourceText; }, [maxSourceText]);

  // Max Job Context
  const {
    vectorBuildState, startVectorBuild, resetVectorBuild, setVectorBuildStatus,
    cardExtractionState, startCardExtraction
  } = useMaxJob();

  // Vector Analysis States
  const [maxIndex, setMaxIndex] = useState<{ id: string; text: string; embedding: number[]; start: number; end: number; chapterTitle?: string }[]>([]);
  // Use status from context instead of local state where possible, but we'll keep some local UI state
  const [maxChunkSize, setMaxChunkSize] = useState(1200);
  const [maxOverlap, setMaxOverlap] = useState(200);
  const [maxBatchSize, setMaxBatchSize] = useState(12);
  const [maxQuery, setMaxQuery] = useState('');
  const [maxTopK, setMaxTopK] = useState(6);
  const [maxSearchResults, setMaxSearchResults] = useState<{ id: string; text: string; score: number; start: number; end: number; chapterTitle?: string }[]>([]);
  const [maxAnalysis, setMaxAnalysis] = useState('');
  const [maxAnalyzing, setMaxAnalyzing] = useState(false);
  const [maxError, setMaxError] = useState('');
  const [showMaxAdvanced, setShowMaxAdvanced] = useState(false);

  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  const [cardFilterQuery, setCardFilterQuery] = useState('');
  const [activeCardTags, setActiveCardTags] = useState<string[]>([]);
  const [cardLibraryCategory, setCardLibraryCategory] = useState<string>('all');
  const [cardLibraryPage, setCardLibraryPage] = useState(1);
  const [hasLoadedCardLibrary, setHasLoadedCardLibrary] = useState(false);
  const [hasLoadedLikedCards, setHasLoadedLikedCards] = useState(false);

  // Custom Card Creation State
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [newCard, setNewCard] = useState<Partial<Card>>({
    type: '情节',
    title: '',
    tags: [],
    analysis: '',
    example: ''
  });

  // Model Config
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
      provider: 'siliconflow',
      model: 'deepseek-ai/DeepSeek-V3',
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1'
  });

  // useEffect(() => {
  //   // Force enable Max Mode styles globally
  //   document.body.classList.add('max-mode');
  //   return () => {
  //     document.body.classList.remove('max-mode');
  //   };
  // }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedText = await StorageManager.getAsync('novel_writer_module_max_source_text');
      if (!cancelled && typeof savedText === 'string') {
        setMaxSourceText(savedText);
      }

      // Load Vector Data
      const savedIndex = await StorageManager.getJSONAsync('novel_writer_module_max_vector_index');
      if (!cancelled && Array.isArray(savedIndex)) {
        setMaxIndex(savedIndex);
        if (savedIndex.length > 0 && vectorBuildState.status === 'idle') {
          setVectorBuildStatus('ready');
        }
      }

      const savedSettings = await StorageManager.getJSONAsync('novel_writer_module_max_index_settings');
      if (!cancelled && savedSettings) {
        if (typeof savedSettings.chunkSize === 'number') setMaxChunkSize(savedSettings.chunkSize);
        if (typeof savedSettings.overlap === 'number') setMaxOverlap(savedSettings.overlap);
        if (typeof savedSettings.batchSize === 'number') setMaxBatchSize(savedSettings.batchSize);
        if (typeof savedSettings.topK === 'number') setMaxTopK(savedSettings.topK);
      }

      const savedResults = await StorageManager.getJSONAsync('novel_writer_module_max_search_results');
      if (!cancelled && Array.isArray(savedResults)) {
        setMaxSearchResults(savedResults);
      }

      const savedAnalysis = await StorageManager.getAsync('novel_writer_module_max_analysis');
      if (!cancelled && typeof savedAnalysis === 'string') {
        setMaxAnalysis(savedAnalysis);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedCardLibrary && (activeTab === 'card_library' || activeTab === 'card_extract')) {
      StorageManager.getJSONAsync('novel_writer_card_library').then((savedCards) => {
        if (Array.isArray(savedCards)) {
          setCardLibrary(savedCards);
        }
        setHasLoadedCardLibrary(true);
      });
    }
  }, [activeTab, hasLoadedCardLibrary]);

  useEffect(() => {
    if (!hasLoadedLikedCards && activeTab === 'market') {
      StorageManager.getJSONAsync('novel_writer_market_liked_cards').then((savedLiked) => {
        if (Array.isArray(savedLiked)) {
          setLikedCardIds(savedLiked);
        }
        setHasLoadedLikedCards(true);
      });
    }
  }, [activeTab, hasLoadedLikedCards]);

  // Fetch Market Cards
  const fetchMarketCards = async () => {
    setIsLoadingMarket(true);
    try {
      const res = await fetch(`/api/market/cards?search=${encodeURIComponent(marketSearch)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setMarketCards(json.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch market cards', error);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarketCards();
    }
  }, [activeTab, marketSearch]);

  // Sync Context State to Local UI
  useEffect(() => {
    if (vectorBuildState.status === 'ready') {
      StorageManager.getJSONAsync('novel_writer_module_max_vector_index').then(index => {
        if (Array.isArray(index)) setMaxIndex(index);
      });
    }
  }, [vectorBuildState.status]);

  useEffect(() => {
    if (vectorBuildState.error) setMaxError(vectorBuildState.error);
    if (cardExtractionState.error) setMaxError(cardExtractionState.error);
  }, [vectorBuildState.error, cardExtractionState.error]);

  // Reload cards when extraction finishes
  useEffect(() => {
    if (!cardExtractionState.isExtracting && cardExtractionState.statusText.includes('完成')) {
      StorageManager.getJSONAsync('novel_writer_card_library').then(cards => {
        if (Array.isArray(cards)) setCardLibrary(cards);
      });
    }
  }, [cardExtractionState.isExtracting, cardExtractionState.statusText]);

  const { registerEditor, unregisterEditor } = useEditorAgent();

  useEffect(() => {
    registerEditor('module_max_dismantle', {
      getContent: () => maxSourceTextRef.current,
      setContent: (text) => {
        setMaxSourceText(text);
        StorageManager.set('novel_writer_module_max_source_text', text);
      },
      insertText: (text) => {
        const next = maxSourceTextRef.current + text;
        setMaxSourceText(next);
        StorageManager.set('novel_writer_module_max_source_text', next);
      },
      getSelection: () => ({ start: 0, end: 0 }),
      setSelection: () => { },
      focus: () => { }
    });

    return () => {
      unregisterEditor('module_max_dismantle');
    };
  }, [registerEditor, unregisterEditor]);

  // Market Logic
  const handleLikeCard = async (id: string) => {
    let newLikedIds = [...likedCardIds];
    const isLiked = newLikedIds.includes(id);

    if (isLiked) {
      newLikedIds = newLikedIds.filter(lid => lid !== id);
    } else {
      newLikedIds.push(id);
      try {
        await fetch(`/api/market/cards/${id}/like`, { method: 'POST' });
        setMarketCards(prev => prev.map(c => c.id === id ? { ...c, likeCount: c.likeCount + 1 } : c));
      } catch (e) {
        console.error(e);
      }
    }
    setLikedCardIds(newLikedIds);
    StorageManager.setJSON('novel_writer_market_liked_cards', newLikedIds);
  };

  const handleShareCard = async (card: Card) => {
    if (!confirm(`确定要将卡牌“${card.title}”分享到市场吗？`)) return;
    try {
      const res = await fetch('/api/market/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });

      if (res.ok) {
        alert('分享成功！可在【卡牌市场】中搜索标题查看。');
        if (activeTab === 'market') fetchMarketCards();
      } else {
        if (res.status === 401) {
          alert('分享失败：请先登录后再分享。');
          return;
        }
        const json = await res.json().catch(() => ({}));
        alert(`分享失败: ${json?.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Share error', error);
      alert('分享失败，请检查网络');
    }
  };

  const handleImportFromMarket = (card: Card) => {
    const newCardInstance = { ...card, id: crypto.randomUUID() };
    const updatedLibrary = [newCardInstance, ...cardLibrary];
    setCardLibrary(updatedLibrary);
    StorageManager.setJSON('novel_writer_card_library', updatedLibrary);
    alert('已导入到我的卡牌库');
  };

  // Card Logic
  const handleSaveCard = () => {
    if (!newCard.title || !newCard.analysis) {
      alert('请填写标题和解析内容');
      return;
    }

    if (isEditingCard && newCard.id) {
        const updatedLibrary = cardLibrary.map(c => c.id === newCard.id ? { ...c, ...newCard } as Card : c);
        setCardLibrary(updatedLibrary);
        StorageManager.setJSON('novel_writer_card_library', updatedLibrary);
        alert('卡牌更新成功！');
    } else {
        const card: Card = {
          id: crypto.randomUUID(),
          type: newCard.type || '情节',
          title: newCard.title || '未命名卡牌',
          example: newCard.example || '',
          analysis: newCard.analysis || '',
          tags: newCard.tags || []
        };
        
        const updatedLibrary = [card, ...cardLibrary];
        setCardLibrary(updatedLibrary);
        StorageManager.setJSON('novel_writer_card_library', updatedLibrary);
        alert('卡牌创建成功！');
    }
    
    setShowCreateCardModal(false);
    setIsEditingCard(false);
    setNewCard({ type: '情节', title: '', tags: [], analysis: '', example: '' });
  };

  const handleDeleteCard = (id: string) => {
    if (!confirm('确定要删除这张卡牌吗？')) return;
    const updated = cardLibrary.filter(c => c.id !== id);
    setCardLibrary(updated);
    StorageManager.setJSON('novel_writer_card_library', updated);
  };

  const handleExtractCards = async () => {
    setMaxError('');
    if (!modelConfig.model) {
      setMaxError('请先配置模型');
      return;
    }
    await startCardExtraction(maxSourceText, vectorBuildState.status === 'ready', modelConfig);
  };

  const filteredMarketCards = marketCards.filter(card => {
    if (marketCategory !== 'all' && card.type !== marketCategory) return false;
    if (marketSort === 'liked' && !likedCardIds.includes(card.id)) return false;
    return true;
  }).sort((a, b) => {
    if (marketSort === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (marketSort === 'hot' || marketSort === 'month') {
      return (b.likeCount || 0) - (a.likeCount || 0);
    }
    return 0;
  });

  const handleBuildMaxIndex = async () => {
    setMaxError('');
    if (!maxSourceText.trim()) {
      setMaxError('请先导入小说文本');
      return;
    }
    await startVectorBuild(maxSourceText, {
      chunkSize: maxChunkSize,
      overlap: maxOverlap,
      batchSize: maxBatchSize
    });
  };

  const handleMaxSearchAction = async () => {
    setMaxError('');
    if (!maxQuery.trim()) {
      setMaxError('请输入检索问题');
      return;
    }
    if (maxIndex.length === 0) {
      setMaxError('请先准备素材库');
      return;
    }

    const { apiKey, baseUrl, model, validation } = getEmbeddingConfig();
    if (!validation.valid) {
      setMaxError(`向量模型配置错误：${validation.errors.join('，')}`);
      return;
    }

    try {
      const [queryEmbedding] = await generateEmbeddings(apiKey, [maxQuery], baseUrl, model);
      const scored = maxIndex.map((item) => ({
        ...item,
        score: cosineSimilarity(queryEmbedding, item.embedding)
      }));
      const top = scored.sort((a, b) => b.score - a.score).slice(0, maxTopK);
      setMaxSearchResults(top);
      StorageManager.setJSON('novel_writer_module_max_search_results', top);
    } catch (error: any) {
      setMaxError(error?.message || '检索失败');
    }
  };

  const handleMaxAnalyze = async () => {
    setMaxError('');
    if (!maxQuery.trim()) {
      setMaxError('请输入检索问题');
      return;
    }
    if (maxSearchResults.length === 0) {
      setMaxError('请先完成检索');
      return;
    }

    const { apiKey, baseUrl, model } = modelConfig;
    if (!model) {
      setMaxError('请先配置模型');
      return;
    }

    const context = maxSearchResults
      .map((item, idx) => {
        const chapterLabel = item.chapterTitle ? `｜${item.chapterTitle}` : '';
        return `片段 ${idx + 1}${chapterLabel}（${item.start}-${item.end}）\n${item.text}`;
      })
      .join('\n\n');

    const systemPrompt = '你是资深拆书分析师，擅长从长篇网文中提取结构、角色、节奏与爽点策略。';
    const userPrompt = `任务目标：结合检索片段完成拆书分析。
检索问题：${maxQuery}
检索片段：
${context}
输出要求：
1. 先给出结构/节奏结论。
2. 提取关键人物与关系推进。
3. 列出可复用的写作技巧清单。
4. 用要点列表输出。`;

    setMaxAnalyzing(true);
    setMaxAnalysis('');
    try {
      const fullText = await generateAIContentStream(
        apiKey,
        systemPrompt,
        userPrompt,
        baseUrl,
        model,
        (content) => {
          setMaxAnalysis(content);
        }
      );
      setMaxAnalysis(fullText);
      StorageManager.set('novel_writer_module_max_analysis', fullText);
    } catch (error: any) {
      setMaxError(error?.message || '拆书分析失败');
    } finally {
      setMaxAnalyzing(false);
    }
  };

  const handleMaxSourceChange = (text: string) => {
    setMaxSourceText(text);
    StorageManager.set('novel_writer_module_max_source_text', text);
  };

  const handleClearMaxIndex = () => {
    setMaxIndex([]);
    resetVectorBuild();
    setMaxSearchResults([]);
    setMaxAnalysis('');
    setMaxError('');
    StorageManager.setJSON('novel_writer_module_max_vector_index', []);
    StorageManager.setJSON('novel_writer_module_max_search_results', []);
    StorageManager.set('novel_writer_module_max_analysis', '');
  };

  const updateMaxSettings = (updates: Partial<{ chunkSize: number; overlap: number; batchSize: number; topK: number }>) => {
    const nextChunkSize = Math.max(300, updates.chunkSize ?? maxChunkSize);
    const nextOverlap = Math.max(0, Math.min(updates.overlap ?? maxOverlap, nextChunkSize - 100));
    const nextBatchSize = Math.max(1, updates.batchSize ?? maxBatchSize);
    const nextTopK = Math.max(1, updates.topK ?? maxTopK);

    setMaxChunkSize(nextChunkSize);
    setMaxOverlap(nextOverlap);
    setMaxBatchSize(nextBatchSize);
    setMaxTopK(nextTopK);

    StorageManager.setJSON('novel_writer_module_max_index_settings', {
      chunkSize: nextChunkSize,
      overlap: nextOverlap,
      batchSize: nextBatchSize,
      topK: nextTopK
    });
  };

  const getEmbeddingConfig = () => {
    const apiKey = StorageManager.get(STORAGE_KEYS.VECTOR_API_KEY) || StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
    const baseUrl = StorageManager.get(STORAGE_KEYS.VECTOR_BASE_URL) || StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
    let model = StorageManager.get(STORAGE_KEYS.VECTOR_MODEL);
    if (!model || model === 'text-embedding-3-large') {
      model = 'BAAI/bge-m3';
    }
    const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
    return { apiKey, baseUrl, model, validation };
  };

  const cosineSimilarity = (a: number[], b: number[]) => {
    const size = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < size; i++) {
      const av = a[i];
      const bv = b[i];
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  };

  const handleMaxSearch = async () => {
    setMaxError('');
    if (!maxQuery.trim()) {
      setMaxError('请输入检索问题');
      return;
    }
    if (maxIndex.length === 0) {
      setMaxError('请先准备素材库');
      return;
    }

    const { apiKey, baseUrl, model, validation } = getEmbeddingConfig();
    if (!validation.valid) {
      setMaxError(`向量模型配置错误：${validation.errors.join('，')}`);
      return;
    }

    try {
      const [queryEmbedding] = await generateEmbeddings(apiKey, [maxQuery], baseUrl, model);
      const scored = maxIndex.map((item) => ({
        ...item,
        score: cosineSimilarity(queryEmbedding, item.embedding)
      }));
      const top = scored.sort((a, b) => b.score - a.score).slice(0, maxTopK);
      setMaxSearchResults(top);
      StorageManager.setJSON('novel_writer_module_max_search_results', top);
    } catch (error: any) {
      setMaxError(error?.message || '检索失败');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  }

  const processFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    const txtFiles = fileArray.filter((f) => f.type === 'text/plain' || f.name.endsWith('.txt'));
    if (txtFiles.length === 0) {
      alert('请选择 .txt 格式的文件');
      return;
    }

    if (txtFiles.length < fileArray.length) {
      alert(`已过滤 ${fileArray.length - txtFiles.length} 个非 txt 文件`);
    }

    txtFiles.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));

    try {
      const texts = await Promise.all(
        txtFiles.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const buffer = e.target?.result as ArrayBuffer;
              let content = '';
              try {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                content = decoder.decode(buffer);
              } catch {
                try {
                  const decoder = new TextDecoder('gbk');
                  content = decoder.decode(buffer);
                } catch {
                  const decoder = new TextDecoder('utf-8');
                  content = decoder.decode(buffer);
                }
              }
              const separator = txtFiles.length > 1 ? `\n\n### ${file.name.replace('.txt', '')}\n\n` : '';
              resolve(separator + content);
            };
            reader.readAsArrayBuffer(file);
          });
        })
      );

      const combinedText = texts.join('\n');
      const newContent = maxSourceText ? maxSourceText + '\n' + combinedText : combinedText.trim();
      handleMaxSourceChange(newContent);
    } catch (error) {
      console.error('File read error:', error);
      alert('读取文件时出错');
    }
  };

  const handleNovelContentImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    event.target.value = '';
  }

  return (
    <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-max-bg-alt text-max-text font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>
      <header className="h-14 border-b border-max-border flex items-center justify-between px-4 bg-max-bg shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex bg-max-surface rounded-lg p-1 border border-max-border overflow-x-auto no-scrollbar max-w-[60vw]">
            <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHome ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>MAX 主页</Link>
            <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxIdea ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>脑洞风暴</Link>
            <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxDismantle ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>拆书</Link>
            <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxOutline ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>大纲生成</Link>
            <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxCreation ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>万字冲刺</Link>
            <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxPolish ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>自循环</Link>
            <Link href="/module/module_max/consistency" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxConsistency ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>一致性</Link>
            <Link href="/module/module_max/humanizer" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxHumanizer ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>AI去味</Link>
            <Link href="/module/module_max/godmode" className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${isMaxGodMode ? 'bg-max-accent/20 text-max-accent' : 'text-max-text-muted hover:text-max-text'}`}>上帝模式</Link>
          </div>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <h1 className="text-sm font-bold text-max-text flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            拆书中心
          </h1>
          <div className="ml-4">
              <ModelConfigPanel moduleKey="dismantle" onConfigChange={setModelConfig} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-max-surface-alt p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between bg-max-bg border border-max-border rounded-xl p-6 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-max-text mb-2">MAX 创作中心 · 拆书中心</h1>
              <p className="text-max-text-muted">三步上手：导入正文 → 一键准备素材 → 提问生成拆书总结。</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex max-panel rounded-xl p-1 shadow-sm w-fit bg-[#27272a] border border-white/5">
              <button
                onClick={() => setActiveTab('vector')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'vector' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Layers className="w-3.5 h-3.5" />向量拆解
              </button>
              <button
                onClick={() => setActiveTab('card_extract')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'card_extract' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Sparkles className="w-3.5 h-3.5" />智能提炼
              </button>
              <button
                onClick={() => setActiveTab('card_library')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'card_library' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Database className="w-3.5 h-3.5" />卡牌库
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'market' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />卡牌市场
              </button>
            </div>
          </div>

          {maxError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
              {maxError}
            </div>
          )}

          {/* Tab Content: Vector Analysis */}
          {activeTab === 'vector' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-max-bg border border-max-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-max-text">第1步：导入正文</h2>
                  <span className="text-xs text-max-text-muted">{maxSourceText.length.toLocaleString()} 字</span>
                </div>
                <div
                  className={`relative ${isDragging ? 'ring-2 ring-max-accent ring-offset-2 ring-offset-max-bg' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                    <TextArea
                      label="正文内容"
                      value={maxSourceText}
                      onChange={handleMaxSourceChange}
                      rows={10}
                      placeholder="粘贴整本或部分章节都可以，也可拖入 TXT 文件"
                    />
                  {isDragging && (
                    <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 z-10 pointer-events-none backdrop-blur-sm">
                      <div className="text-blue-500 font-medium flex flex-col items-center gap-2 font-serif">
                        <Upload className="w-8 h-8" />
                        <span>松开上传</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-0 right-0">
                    <div className="relative inline-block">
                      <input
                        type="file"
                        accept=".txt"
                        multiple
                        onChange={handleNovelContentImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        导入文件
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-max-bg border border-max-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-max-text">第2步：准备素材</h2>
                  <div className="flex items-center gap-2">
                    {vectorBuildState.status === 'ready' && (
                      <button
                        onClick={handleClearMaxIndex}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        清空索引
                      </button>
                    )}
                    <button
                      onClick={() => setShowMaxAdvanced(!showMaxAdvanced)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      {showMaxAdvanced ? '隐藏设置' : '高级设置'}
                    </button>
                  </div>
                </div>

                {showMaxAdvanced && (
                  <div className="p-4 bg-max-surface-alt border border-max-border rounded-lg grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-max-text-muted font-bold">切片大小 (字)</label>
                      <input
                        type="number"
                        value={maxChunkSize}
                        onChange={(e) => updateMaxSettings({ chunkSize: parseInt(e.target.value) })}
                        className="w-full bg-max-bg border border-max-border rounded-md px-2 py-1 text-xs text-max-text"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-max-text-muted font-bold">重叠度 (字)</label>
                      <input
                        type="number"
                        value={maxOverlap}
                        onChange={(e) => updateMaxSettings({ overlap: parseInt(e.target.value) })}
                        className="w-full bg-max-bg border border-max-border rounded-md px-2 py-1 text-xs text-max-text"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBuildMaxIndex}
                  disabled={vectorBuildState.status === 'building' || !maxSourceText}
                  className={`w-full py-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2
                    ${vectorBuildState.status === 'ready'
                      ? 'border-green-500/50 bg-green-500/5 text-green-400'
                      : 'border-blue-500/50 bg-blue-500/5 text-blue-400 hover:border-blue-500 hover:bg-blue-500/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {vectorBuildState.status === 'building' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-bold">正在构建索引 ({vectorBuildState.progress.processed}/{vectorBuildState.progress.total})</span>
                    </>
                  ) : vectorBuildState.status === 'ready' ? (
                    <>
                      <Check className="w-6 h-6" />
                      <span className="text-sm font-bold">素材库已就绪 ({maxIndex.length} 个片段)</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      <span className="text-sm font-bold">一键准备素材库</span>
                      <span className="text-[10px] opacity-60">AI 将对全文进行向量化索引，以便精准检索</span>
                    </>
                  )}
                </button>
              </div>

              <div className="lg:col-span-2 bg-max-bg border border-max-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-max-text">第3步：提问分析</h2>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={maxQuery}
                      onChange={(e) => setMaxQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMaxSearchAction()}
                      placeholder="例如：分析本文的节奏、主角的金手指是什么、有哪些反转..."
                      className="w-full pl-12 pr-4 py-4 bg-max-surface border border-max-border rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={handleMaxSearchAction}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors"
                    >
                      检索
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">检索到的相关片段</h3>
                        <span className="text-[10px] text-gray-600">{maxSearchResults.length} 个</span>
                      </div>
                      <div className="h-[400px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {maxSearchResults.map((res, idx) => (
                          <div key={idx} className="p-3 bg-max-surface-alt border border-max-border rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <span>匹配度: {(res.score * 100).toFixed(1)}%</span>
                              <span>#{idx + 1}</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed italic line-clamp-4">“{res.text}”</p>
                          </div>
                        ))}
                        {maxSearchResults.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                            <Filter className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">检索结果将显示在这里</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">AI 分析总结</h3>
                        {maxSearchResults.length > 0 && (
                          <button
                            onClick={handleMaxAnalyze}
                            disabled={maxAnalyzing}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/10 text-blue-400 text-[10px] font-bold rounded-full hover:bg-blue-600/20 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            {maxAnalyzing ? '分析中...' : '生成分析'}
                          </button>
                        )}
                      </div>
                      <div className="h-[400px] bg-max-surface border border-max-border rounded-xl p-4 overflow-y-auto custom-scrollbar prose prose-invert prose-sm max-w-none">
                        {maxAnalysis ? (
                          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed font-sans">
                            {maxAnalysis}
                            {maxAnalyzing && <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">点击“生成分析”开始深度拆书</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Card Extraction */}
          {activeTab === 'card_extract' && (
            <div className="space-y-6">
              <div className="bg-max-bg border border-max-border rounded-xl p-8 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-max-text">智能技巧提炼</h2>
                <p className="text-max-text-muted max-w-md mx-auto text-sm">
                  AI 将深度扫描全文，自动识别并提炼出本文在世界观、情节、人物、场景、修辞、节奏、金手指等维度的核心写作技巧，并以卡牌形式保存到库。
                </p>
                <div className="pt-4">
                  <button
                    onClick={handleExtractCards}
                    disabled={cardExtractionState.isExtracting || !maxSourceText}
                    className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto
                      ${cardExtractionState.isExtracting
                        ? 'bg-purple-600/20 text-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/20'
                      }`}
                  >
                    {cardExtractionState.isExtracting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>提炼中...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>开始智能提炼</span>
                      </>
                    )}
                  </button>
                  {cardExtractionState.statusText && (
                    <p className="mt-4 text-xs text-purple-400 animate-pulse">{cardExtractionState.statusText}</p>
                  )}
                </div>
              </div>

              {cardExtractionState.isExtracting && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-64 bg-max-bg border border-max-border rounded-xl p-4 space-y-4">
                      <div className="h-4 w-1/3 bg-white/5 rounded" />
                      <div className="h-6 w-2/3 bg-white/5 rounded" />
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-white/5 rounded" />
                        <div className="h-3 w-full bg-white/5 rounded" />
                        <div className="h-3 w-4/5 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Card Library */}
          {activeTab === 'card_library' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCardLibraryCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${cardLibraryCategory === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'}`}
                  >
                    全部
                  </button>
                  {['情节', '人物', '场景', '修辞', '节奏', '金手指', '世界观'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCardLibraryCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${cardLibraryCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="text"
                      value={cardFilterQuery}
                      onChange={(e) => setCardFilterQuery(e.target.value)}
                      placeholder="搜索我的卡牌..."
                      className="w-64 pl-9 pr-4 py-2 bg-[#18181b] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-blue-500/50 text-gray-300 placeholder:text-gray-600"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingCard(false);
                      setNewCard({ type: '情节', title: '', tags: [], analysis: '', example: '' });
                      setShowCreateCardModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                  >
                    <Plus className="w-4 h-4" />
                    手动创建
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
                {cardLibrary
                  .filter(c => {
                    if (cardLibraryCategory !== 'all' && c.type !== cardLibraryCategory) return false;
                    if (cardFilterQuery && !c.title.includes(cardFilterQuery) && !c.analysis.includes(cardFilterQuery)) return false;
                    return true;
                  })
                  .map(card => (
                    <FlipCard
                      key={card.id}
                      badge={card.type}
                      title={card.title}
                      cardNo={card.id}
                      subtitle="点击或悬停翻转"
                      tags={card.tags}
                      backTitle={card.title}
                      backBody={card.example || ''}
                      frontTitle={card.title}
                      frontBody={card.analysis || ''}
                      onEdit={() => {
                        setIsEditingCard(true);
                        setNewCard(card);
                        setShowCreateCardModal(true);
                      }}
                      onDelete={() => handleDeleteCard(card.id)}
                      onShare={() => handleShareCard(card)}
                    />
                  ))}
                {cardLibrary.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-600">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm">卡牌库空空如也，快去“智能提炼”试试吧</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Market */}
          {activeTab === 'market' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMarketSort('hot')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'hot' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'}`}
                >
                  热榜
                </button>
                <button
                  onClick={() => setMarketSort('month')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'month' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'}`}
                >
                  月榜
                </button>
                <button
                  onClick={() => setMarketSort('latest')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'latest' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'}`}
                >
                  最新
                </button>
                <button
                  onClick={() => setMarketSort('liked')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'liked' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'}`}
                >
                  已收藏
                </button>
              </div>

              <div className="bg-[#18181b] border border-white/5 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMarketCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-[10px] border transition-colors ${marketCategory === 'all' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#27272a] border-white/5 text-gray-500 hover:text-gray-300'}`}
                  >
                    全部
                  </button>
                  {['世界观', '情节', '场景', '人物', '修辞', '节奏', '金手指'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setMarketCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] border transition-colors ${marketCategory === cat ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#27272a] border-white/5 text-gray-500 hover:text-gray-300'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder="搜索市场卡牌..."
                  className="w-full pl-9 pr-4 py-2 bg-[#18181b] border border-white/5 rounded-lg text-xs focus:outline-none focus:border-purple-500/50 text-gray-300 placeholder:text-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
                {isLoadingMarket ? (
                  <div className="col-span-full py-20 text-center text-gray-600">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs">正在加载市场数据...</p>
                  </div>
                ) : filteredMarketCards.length > 0 ? (
                  filteredMarketCards
                    .slice((marketPage - 1) * CARDS_PER_PAGE, marketPage * CARDS_PER_PAGE)
                    .map(card => (
                      <FlipCard
                        key={card.id}
                        badge={card.type}
                        title={card.title}
                        cardNo={card.id}
                        subtitle="悬停翻转查看细节"
                        tags={card.tags}
                        backTitle={card.title}
                        backBody={card.example || ''}
                        frontTitle={card.title}
                        frontMeta={`@${card.uploaderName || '匿名'} · ${card.likeCount || 0} 赞`}
                        frontBody={card.analysis || ''}
                        isLiked={likedCardIds.includes(card.id)}
                        onLike={() => handleLikeCard(card.id)}
                        action={{
                          title: '导入到我的卡牌库',
                          icon: <Download className="w-4 h-4" />,
                          onClick: () => handleImportFromMarket(card)
                        }}
                      />
                    ))
                ) : (
                  <div className="col-span-full py-20 text-center text-gray-600">
                    <p className="text-xs">没有找到相关卡牌</p>
                  </div>
                )}
              </div>

              {filteredMarketCards.length > CARDS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => setMarketPage(p => Math.max(1, p - 1))}
                    disabled={marketPage === 1}
                    className="px-4 py-2 text-xs rounded-lg bg-[#27272a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-gray-500">
                    第 {marketPage} / {Math.ceil(filteredMarketCards.length / CARDS_PER_PAGE)} 页
                  </span>
                  <button
                    onClick={() => setMarketPage(p => Math.min(Math.ceil(filteredMarketCards.length / CARDS_PER_PAGE), p + 1))}
                    disabled={marketPage >= Math.ceil(filteredMarketCards.length / CARDS_PER_PAGE)}
                    className="px-4 py-2 text-xs rounded-lg bg-[#27272a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Card Modal */}
      {showCreateCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-sm font-bold text-max-text">{isEditingCard ? '编辑卡牌' : '自制卡牌'}</h2>
              <button onClick={() => setShowCreateCardModal(false)} className="text-max-text-muted hover:text-max-text">
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-max-text-muted mb-1">卡牌类型</label>
                  <select
                    value={newCard.type}
                    onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                    className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg outline-none text-xs text-max-text focus:border-blue-500/50"
                  >
                    {['情节', '人物', '场景', '修辞', '节奏', '金手指', '世界观'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="卡牌标题"
                  value={newCard.title}
                  onChange={(v) => setNewCard({ ...newCard, title: v })}
                  placeholder="例如：黄金三章"
                />
              </div>
              <Input
                label="标签 (逗号分隔)"
                value={newCard.tags?.join('，')}
                onChange={(v) => setNewCard({ ...newCard, tags: v.split(/[,，]/).map(s => s.trim()).filter(Boolean) })}
                placeholder="例如：爽文, 开篇, 冲突"
              />
              <TextArea
                label="技巧解析 (正面)"
                value={newCard.analysis}
                onChange={(v) => setNewCard({ ...newCard, analysis: v })}
                rows={5}
                placeholder="在此输入技巧的详细解析、原理或使用方法..."
              />
              <TextArea
                label="原文示例 (背面)"
                value={newCard.example}
                onChange={(v) => setNewCard({ ...newCard, example: v })}
                rows={5}
                placeholder="在此粘贴优秀的原文示例..."
              />
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateCardModal(false)}
                className="px-4 py-2 text-xs font-bold text-max-text-muted hover:text-max-text transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCard}
                className="px-6 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
              >
                {isEditingCard ? '保存修改' : '创建卡牌'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-max-text-muted mb-1 font-serif">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg focus:ring-2 focus:ring-max-accent/20 focus:border-max-accent outline-none text-sm text-max-text placeholder:text-max-text-muted/60 transition-all"
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label?: string; value?: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-max-text-muted mb-1 font-serif">{label}</label>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 bg-max-surface-alt border border-max-border rounded-lg focus:ring-2 focus:ring-max-accent/20 focus:border-max-accent outline-none text-sm text-max-text placeholder:text-max-text-muted/60 transition-all resize-y"
        placeholder={placeholder}
      />
    </div>
  );
}
