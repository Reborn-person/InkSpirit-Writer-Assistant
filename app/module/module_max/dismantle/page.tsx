'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Trash2, Copy, Check, Filter, Search, Layers, Database, Sparkles, ShoppingBag, Download, Star, Share2, Zap, Plus, Edit2 } from 'lucide-react';
import { generateAIContentStream, generateEmbeddings } from '@/lib/ai';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { APIConfigValidator } from '@/lib/api-validator';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
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
  const isMaxHome = pathname === '/module/module_max';
  const isMaxIdea = pathname === '/module/module_max/idea';
  const isMaxDismantle = pathname === '/module/module_max/dismantle';
  const isMaxPolish = pathname === '/module/module_max/polish';
  const isMaxCreation = pathname === '/module/module_max/creation';
  const isMaxOutline = pathname === '/module/module_max/outline';

  const [activeTab, setActiveTab] = useState<'vector' | 'card_extract' | 'card_library' | 'market'>('vector');

  // Market State
  const [marketSort, setMarketSort] = useState<'hot' | 'month' | 'latest' | 'liked'>('hot');
  const [marketCategory, setMarketCategory] = useState<string>('all');
  const [marketSearch, setMarketSearch] = useState('');
  const [likedCardIds, setLikedCardIds] = useState<string[]>([]);
  const [marketCards, setMarketCards] = useState<MarketCard[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [marketPage, setMarketPage] = useState(1);
  const CARDS_PER_PAGE = 30; // 6 rows x 5 columns

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

  // Reset page when filters change
  useEffect(() => {
    setMarketPage(1);
  }, [marketSort, marketCategory, marketSearch]);

  // Filtered Market Cards
  const filteredMarketCards = marketCards.filter(card => {
    // Category Filter
    if (marketCategory !== 'all' && card.type !== marketCategory) return false;

    // Search Filter is handled by API mostly, but local filtering for category/sort is needed if API returns all
    // API currently handles simple search.

    // Sort/Filter by Liked
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

  const handleLikeCard = async (id: string) => {
    // Optimistic Update Local State
    let newLikedIds = [...likedCardIds];
    const isLiked = newLikedIds.includes(id);

    if (isLiked) {
      // Unlike locally (API doesn't support unlike yet, but let's just support like accumulation or toggle locally)
      // Actually prompt market only supports "Like" (add), not toggle unlike on API usually unless specified.
      // The API I wrote only has increment. So "Unlike" only affects local state visually.
      newLikedIds = newLikedIds.filter(lid => lid !== id);
    } else {
      newLikedIds.push(id);
      // Call API
      try {
        await fetch(`/api/market/cards/${id}/like`, { method: 'POST' });
        // Update market card list to reflect new count
        setMarketCards(prev => prev.map(c => c.id === id ? { ...c, likeCount: c.likeCount + 1 } : c));
      } catch (e) {
        console.error(e);
      }
    }
    setLikedCardIds(newLikedIds);
    StorageManager.setJSON('novel_writer_market_liked_cards', newLikedIds);
  };


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
  // const [maxIndexStatus, setMaxIndexStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  // const [maxIndexProgress, setMaxIndexProgress] = useState({ processed: 0, total: 0 });
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

  // Card Extraction States
  const [cardLibrary, setCardLibrary] = useState<Card[]>([]);
  // const [isExtractingCards, setIsExtractingCards] = useState(false);
  // const [cardExtractionStatus, setCardExtractionStatus] = useState('');
  const [cardFilterQuery, setCardFilterQuery] = useState('');
  const [activeCardTags, setActiveCardTags] = useState<string[]>([]);
  const [cardLibraryCategory, setCardLibraryCategory] = useState<string>('all');
  const [cardLibraryPage, setCardLibraryPage] = useState(1);

  // Custom Card Creation State
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false); // Add missing state
  const [newCard, setNewCard] = useState<Partial<Card>>({
    type: '情节',
    title: '',
    tags: [],
    analysis: '',
    example: ''
  });

  const handleSaveCard = () => {
    if (!newCard.title || !newCard.analysis) {
      alert('请填写标题和解析内容');
      return;
    }

    if (isEditingCard && newCard.id) {
        // Update existing card
        const updatedLibrary = cardLibrary.map(c => c.id === newCard.id ? { ...c, ...newCard } as Card : c);
        setCardLibrary(updatedLibrary);
        StorageManager.setJSON('novel_writer_card_library', updatedLibrary);
        alert('卡牌更新成功！');
    } else {
        // Create new card
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

  // Sync Context State to Local UI
  useEffect(() => {
    if (vectorBuildState.status === 'ready') {
      // Reload index when ready
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

  const { registerEditor, unregisterEditor, isAiOpen, registerPageSkill, unregisterPageSkill } = useEditorAgent();



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

      // Load Card Library
      const savedCards = await StorageManager.getJSONAsync('novel_writer_card_library');
      if (!cancelled && Array.isArray(savedCards)) {
        setCardLibrary(savedCards);
      }

      // Load Liked Cards
      const savedLiked = await StorageManager.getJSONAsync('novel_writer_market_liked_cards');
      if (!cancelled && Array.isArray(savedLiked)) {
        setLikedCardIds(savedLiked);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMaxSourceChange = (value: string) => {
    setMaxSourceText(value);
    StorageManager.set('novel_writer_module_max_source_text', value);
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

    // Fix: Default to BAAI/bge-m3 for SiliconFlow compatibility
    // Also override 'text-embedding-3-large' if it was saved in storage, as it's not supported by SiliconFlow
    let model = StorageManager.get(STORAGE_KEYS.VECTOR_MODEL);
    if (!model || model === 'text-embedding-3-large') {
      model = 'BAAI/bge-m3';
    }

    const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
    return { apiKey, baseUrl, model, validation };
  };

  const getBigModelConfig = () => {
    const apiKey = StorageManager.get(STORAGE_KEYS.BIG_MODEL_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
    const baseUrl = StorageManager.get(STORAGE_KEYS.BIG_MODEL_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
    const model = StorageManager.get(STORAGE_KEYS.BIG_MODEL_MODEL) || 'deepseek-ai/DeepSeek-V3';
    const validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
    return { apiKey, baseUrl, model, validation };
  };

  const splitTextIntoChunks = (text: string, chunkSize: number, overlap: number) => {
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\u0000/g, '');
    const safeChunkSize = Math.max(300, chunkSize);
    const safeOverlap = Math.max(0, Math.min(overlap, safeChunkSize - 100));
    const chunks: { text: string; start: number; end: number }[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = Math.min(start + safeChunkSize, cleaned.length);
      if (end < cleaned.length) {
        const lastBreak = cleaned.lastIndexOf('\n', end);
        if (lastBreak > start + 100) end = lastBreak;
      }
      const slice = cleaned.slice(start, end).trim();
      if (slice) {
        chunks.push({ text: slice, start, end });
      }
      if (end >= cleaned.length) break;
      start = Math.max(0, end - safeOverlap);
      if (start >= cleaned.length) break;
    }

    return chunks;
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

  const handleBuildMaxIndex = async () => {
    setMaxError('');
    await startVectorBuild(maxSourceText, {
      chunkSize: maxChunkSize,
      overlap: maxOverlap,
      batchSize: maxBatchSize
    });
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

    const { apiKey, baseUrl, model, validation } = getBigModelConfig();
    if (!validation.valid) {
      setMaxError(`大文本模型配置错误：${validation.errors.join('，')}`);
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

  // --- Card Logic ---

  const handleExtractCards = async () => {
    setMaxError('');
    await startCardExtraction(maxSourceText, vectorBuildState.status === 'ready');
  };

  const handleDeleteCard = (id: string) => {
    if (!confirm('确定要删除这张卡牌吗？')) return;
    const updated = cardLibrary.filter(c => c.id !== id);
    setCardLibrary(updated);
    StorageManager.setJSON('novel_writer_card_library', updated);
  };

  const handleImportFromMarket = (card: Card) => {
    const newCard = { ...card, id: crypto.randomUUID() }; // Generate new ID for user library
    const updatedLibrary = [newCard, ...cardLibrary];
    setCardLibrary(updatedLibrary);
    StorageManager.setJSON('novel_writer_card_library', updatedLibrary);
    alert(`成功导入卡牌：${card.title}`);
  };

  const handleEditCard = (card: Card) => {
      setNewCard({
          id: card.id,
          type: card.type,
          title: card.title,
          tags: card.tags,
          analysis: card.analysis,
          example: card.example
      });
      setIsEditingCard(true);
      setShowCreateCardModal(true);
  };

  const handleLikeLocalCard = (id: string) => {
    let newLikedIds = [...likedCardIds];
    if (newLikedIds.includes(id)) {
      newLikedIds = newLikedIds.filter(lid => lid !== id);
    } else {
      newLikedIds.push(id);
    }
    setLikedCardIds(newLikedIds);
    StorageManager.setJSON('novel_writer_market_liked_cards', newLikedIds);
  };

  // Filter Cards for Card Library
  const filteredCards = cardLibrary.filter(card => {
    const searchContent = `${card.title} ${card.example} ${card.analysis} ${(card.tags || []).join(' ')}`.toLowerCase();
    const matchesKeyword = !cardFilterQuery || searchContent.includes(cardFilterQuery.toLowerCase());

    // Category filter
    if (cardLibraryCategory !== 'all' && card.type !== cardLibraryCategory) return false;

    if (activeCardTags.length === 0) return matchesKeyword;
    const cardAllTags = new Set([card.type, ...(card.tags || [])]);
    const matchesTags = activeCardTags.every(activeTag => cardAllTags.has(activeTag));
    return matchesKeyword && matchesTags;
  });

  // Reset card library page when filters change
  useEffect(() => {
    setCardLibraryPage(1);
  }, [cardFilterQuery, cardLibraryCategory, activeCardTags]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
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

  async function handleNovelContentImport(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    event.target.value = '';
  }

  useEffect(() => {
    const handlePageSkill = async (payload: { action: string; value?: any }) => {
      const { action, value } = payload;
      if (action === 'set_source_text') handleMaxSourceChange(String(value));
      if (action === 'append_source_text') handleMaxSourceChange(maxSourceTextRef.current + String(value));
      if (action === 'build_index') handleBuildMaxIndex();
      if (action === 'set_query') setMaxQuery(String(value));
      if (action === 'search') handleMaxSearch();
      if (action === 'analyze') handleMaxAnalyze();
    };

    registerPageSkill('page_control', handlePageSkill);
    return () => unregisterPageSkill('page_control');
  }, [registerPageSkill, unregisterPageSkill, handleBuildMaxIndex, handleMaxSearch, handleMaxAnalyze]);

  return (
    <div className={`transition-all duration-500 ease-in-out h-screen flex flex-col bg-[#18181b] text-gray-300 font-serif overflow-hidden ${isAiOpen ? 'pr-[360px]' : ''}`}>

      {/* Top Bar */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#18181b] shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex bg-[#27272a] rounded-lg p-1">
            <Link href="/module/module_max" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxHome ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>MAX 主页</Link>
            <Link href="/module/module_max/idea" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxIdea ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>脑洞风暴</Link>
            <Link href="/module/module_max/dismantle" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxDismantle ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>拆书</Link>
            <Link href="/module/module_max/outline" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxOutline ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>大纲生成</Link>
            <Link href="/module/module_max/creation" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxCreation ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>万字冲刺</Link>
            <Link href="/module/module_max/polish" className={`px-3 py-1.5 text-xs rounded-md transition-colors ${isMaxPolish ? 'bg-[#3f3f46] text-white' : 'hover:text-white'}`}>自循环</Link>
          </div>
          <div className="h-4 w-[1px] bg-white/10"></div>
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            拆书中心
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
        <div className="max-w-7xl mx-auto space-y-6">

          {maxError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
              {maxError}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex max-panel rounded-xl p-1 shadow-sm w-fit bg-[#27272a] border border-white/5">
            <button onClick={() => setActiveTab('vector')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'vector' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <Layers className="w-3 h-3 inline-block mr-1.5 mb-0.5" />向量拆解
            </button>
            <button onClick={() => setActiveTab('card_extract')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'card_extract' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <Sparkles className="w-3 h-3 inline-block mr-1.5 mb-0.5" />智能提炼
            </button>
            <button onClick={() => setActiveTab('card_library')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'card_library' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <Database className="w-3 h-3 inline-block mr-1.5 mb-0.5" />卡牌库
            </button>
            <button onClick={() => setActiveTab('market')} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'market' ? 'bg-[#3f3f46] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <ShoppingBag className="w-3 h-3 inline-block mr-1.5 mb-0.5" />卡牌市场
            </button>
          </div>

          {/* Shared Step 1: Import Text (Only show for Vector and Card Extract tabs) */}
          {activeTab !== 'card_library' && activeTab !== 'market' && (
            <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200">第一步：导入原文</h2>
                <span className="text-xs text-gray-500">{maxSourceText.length.toLocaleString()} 字</span>
              </div>
              <div
                className={`relative ${isDragging ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#18181b]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <TextArea
                  label=""
                  value={maxSourceText}
                  onChange={handleMaxSourceChange}
                  rows={10}
                  placeholder="在此粘贴优秀的网文片段、章节或整本书。支持直接拖入 TXT 文件。"
                />
                {isDragging && (
                  <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center rounded-lg border-2 border-dashed border-purple-500 z-10 pointer-events-none backdrop-blur-sm">
                    <div className="text-purple-400 font-medium flex flex-col items-center gap-2 font-serif">
                      <Upload className="w-8 h-8" />
                      <span>松开上传</span>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <div className="relative inline-block">
                    <input
                      type="file"
                      accept=".txt"
                      multiple
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleNovelContentImport}
                    />
                    <button className="px-3 py-1.5 text-xs font-medium bg-[#27272a] border border-white/5 text-gray-400 rounded-md hover:bg-[#3f3f46] hover:text-white transition-all shadow-sm flex items-center gap-1">
                      <Upload className="w-3 h-3" /> 上传 TXT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Vector Analysis */}
          {activeTab === 'vector' && (
            <>
              <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-200">第二步：准备向量索引</h2>
                  <span className="text-xs text-gray-500">素材 {maxIndex.length.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 bg-[#27272a] border border-white/5 rounded-lg px-3 py-2">
                  系统会将长文本切分为小片段并进行向量化，以便精准检索。
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowMaxAdvanced((prev) => !prev)} className="text-xs text-gray-500 hover:text-white bg-[#27272a] px-2 py-1 rounded transition-colors">
                    {showMaxAdvanced ? '收起高级设置' : '展开高级设置'}
                  </button>
                  {!showMaxAdvanced && <span className="text-xs text-gray-600">默认：每段 {maxChunkSize} 字｜返回 {maxTopK} 条</span>}
                </div>
                {showMaxAdvanced && (
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                    <div><label className="block text-xs text-gray-500 mb-1">每段字数</label><input type="number" value={maxChunkSize} onChange={(e) => updateMaxSettings({ chunkSize: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none focus:border-purple-500/50" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">重复字数</label><input type="number" value={maxOverlap} onChange={(e) => updateMaxSettings({ overlap: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none focus:border-purple-500/50" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">每次处理</label><input type="number" value={maxBatchSize} onChange={(e) => updateMaxSettings({ batchSize: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none focus:border-purple-500/50" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">返回条数</label><input type="number" value={maxTopK} onChange={(e) => updateMaxSettings({ topK: Number(e.target.value) })} className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none focus:border-purple-500/50" /></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button onClick={handleBuildMaxIndex} disabled={vectorBuildState.status === 'building'} className="flex-1 px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20">
                    {vectorBuildState.status === 'building' ? `准备中 ${vectorBuildState.progress.processed}/${vectorBuildState.progress.total}` : '一键准备素材'}
                  </button>
                  <button onClick={handleClearMaxIndex} className="px-4 py-2 text-xs font-bold bg-[#27272a] text-gray-400 rounded-lg hover:bg-[#3f3f46] hover:text-white transition-colors border border-white/5">清空</button>
                </div>
              </div>

              <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-gray-200">第三步：提问与分析</h2>
                <Input label="你想分析什么？" value={maxQuery} onChange={setMaxQuery} placeholder="例如：主角成长线怎么铺？爽点节奏如何安排？" />
                <button onClick={handleMaxSearch} className="w-full px-4 py-2 text-xs font-bold bg-[#27272a] text-white rounded-lg hover:bg-[#3f3f46] transition-colors border border-white/5">开始寻找答案</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-gray-200">素材片段</h2><span className="text-xs text-gray-500">{maxSearchResults.length} 条</span></div>
                  {maxSearchResults.length === 0 ? <div className="text-xs text-gray-600 text-center py-10">还没有素材片段</div> : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-2">
                      {maxSearchResults.map((item, idx) => (
                        <div key={item.id} className="bg-[#27272a] border border-white/5 rounded-lg p-3 text-xs text-gray-300 space-y-2 hover:border-white/10 transition-colors">
                          <div className="flex items-center justify-between text-[10px] text-gray-500"><span>素材 {idx + 1}{item.chapterTitle ? `｜${item.chapterTitle}` : ''}</span><span>相关度 {(item.score * 100).toFixed(1)}%</span></div>
                          <div className="text-[10px] text-gray-600">范围 {item.start}-{item.end}</div>
                          <div className="whitespace-pre-wrap leading-relaxed opacity-80">{item.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-200">拆书总结</h2>
                    <button onClick={handleMaxAnalyze} disabled={maxAnalyzing || maxSearchResults.length === 0} className="px-3 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-60 shadow-lg shadow-purple-900/20">{maxAnalyzing ? '生成中' : '生成总结'}</button>
                  </div>
                  <textarea value={maxAnalysis} onChange={(e) => { setMaxAnalysis(e.target.value); StorageManager.set('novel_writer_module_max_analysis', e.target.value); }} rows={16} className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 placeholder:text-gray-600 transition-all resize-y focus:border-purple-500/50 custom-scrollbar" placeholder="总结结果会显示在这里，可直接修改" />
                </div>
              </div>
            </>
          )}

          {/* Tab Content: Card Extraction */}
          {activeTab === 'card_extract' && (
            <div className="bg-[#18181b] border border-white/5 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-200 mb-2">第二步：智能提炼</h2>
                <p className="text-xs text-gray-500">AI 将像地质勘探专家一样，对原文进行地毯式扫描，自动提取出修辞、描写、情节等写作技巧卡牌。</p>
              </div>

              <div className="flex flex-col gap-4 items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-xl bg-[#27272a]/50">
                {cardExtractionState.isExtracting ? (
                  <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-300 font-medium">{cardExtractionState.statusText || '正在分析...'}</p>
                    <p className="text-xs text-gray-500">这可能需要几分钟，请耐心等待...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto text-purple-500 border border-purple-500/20">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-gray-300 font-medium">准备好开始了吗？</p>
                      <p className="text-xs text-gray-500 mt-1">确保原文已导入（建议 500-5000 字）</p>
                    </div>
                    <button
                      onClick={handleExtractCards}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-900/30 hover:opacity-90 hover:scale-105 transition-all font-bold flex items-center gap-2 mx-auto text-sm"
                    >
                      <Sparkles className="w-4 h-4" /> 开始智能提炼
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Card Library */}
          {activeTab === 'card_library' && (
            <div className="space-y-6">
              <div className="bg-[#18181b] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="搜索卡牌标题、示例或分析..."
                    value={cardFilterQuery}
                    onChange={(e) => setCardFilterQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-xs outline-none bg-[#09090b] border border-white/10 text-gray-300 focus:border-purple-500/50 placeholder:text-gray-600"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  共 {cardLibrary.length} 张卡牌
                </div>
                <button
                  onClick={() => setShowCreateCardModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  自制卡牌
                </button>
              </div>

              {/* Category Filter for Card Library */}
              <div className="bg-[#18181b] border border-white/5 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCardLibraryCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-[10px] border transition-colors ${cardLibraryCategory === 'all' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#27272a] border-white/5 text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    全部
                  </button>
                  {['世界观', '情节', '场景', '人物', '修辞', '节奏', '金手指'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCardLibraryCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] border transition-colors ${cardLibraryCategory === cat ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#27272a] border-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
                {filteredCards.length > 0 ? (
                  filteredCards
                    .slice((cardLibraryPage - 1) * CARDS_PER_PAGE, cardLibraryPage * CARDS_PER_PAGE)
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
                        frontMeta={card.tags?.length ? `${card.tags.length} 标签` : undefined}
                        frontBody={card.analysis || ''}
                        action={{
                          title: '删除',
                          icon: <Trash2 className="w-4 h-4" />,
                          onClick: () => handleDeleteCard(card.id)
                        }}
                        secondaryAction={{
                          title: '编辑',
                          icon: <Edit2 className="w-4 h-4" />,
                          onClick: () => handleEditCard(card)
                        }}
                        extraAction={{
                          title: '分享到市场',
                          icon: <Share2 className="w-4 h-4" />,
                          onClick: () => handleShareCard(card)
                        }}
                      />
                    ))
                ) : (
                  <div className="col-span-full py-12 text-center text-gray-600 bg-[#18181b]/50 border border-dashed border-white/5 rounded-xl">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-xs">没有找到符合条件的卡牌</p>
                  </div>
                )}
              </div>

              {/* Pagination for Card Library */}
              {filteredCards.length > CARDS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => setCardLibraryPage(p => Math.max(1, p - 1))}
                    disabled={cardLibraryPage === 1}
                    className="px-4 py-2 text-xs rounded-lg bg-[#27272a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-gray-500">
                    第 {cardLibraryPage} / {Math.ceil(filteredCards.length / CARDS_PER_PAGE)} 页
                  </span>
                  <button
                    onClick={() => setCardLibraryPage(p => Math.min(Math.ceil(filteredCards.length / CARDS_PER_PAGE), p + 1))}
                    disabled={cardLibraryPage >= Math.ceil(filteredCards.length / CARDS_PER_PAGE)}
                    className="px-4 py-2 text-xs rounded-lg bg-[#27272a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Market */}
          {activeTab === 'market' && (
            <div className="space-y-4">
              {/* Sorting Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMarketSort('hot')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'hot' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  热榜
                </button>
                <button
                  onClick={() => setMarketSort('month')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'month' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  月榜
                </button>
                <button
                  onClick={() => setMarketSort('latest')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'latest' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  最新
                </button>
                <button
                  onClick={() => setMarketSort('liked')}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${marketSort === 'liked' ? 'bg-purple-600 text-white border-purple-600' : 'bg-[#27272a] border-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  已收藏
                </button>
              </div>

              {/* Category Filter */}
              <div className="bg-[#18181b] border border-white/5 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMarketCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-[10px] border transition-colors ${marketCategory === 'all' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#27272a] border-white/5 text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    全部
                  </button>
                  {['世界观', '情节', '场景', '人物', '修辞', '节奏', '金手指'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMarketCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10px] border transition-colors ${marketCategory === cat ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[#27272a] border-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
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

              {/* Grid Content */}
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

              {/* Pagination */}
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
              <h2 className="text-sm font-bold text-white">自制卡牌</h2>
              <button onClick={() => setShowCreateCardModal(false)} className="text-gray-500 hover:text-white">
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">卡牌类型</label>
                  <select
                    value={newCard.type}
                    onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg outline-none text-xs text-gray-300 focus:border-purple-500/50"
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
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCard}
                className="px-6 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20"
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
      <label className="block text-xs font-bold text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg focus:border-purple-500/50 outline-none text-xs text-gray-300 placeholder:text-gray-600 transition-all"
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label: string; value?: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-bold text-gray-400 mb-1">{label}</label>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-lg focus:border-purple-500/50 outline-none text-xs text-gray-300 placeholder:text-gray-600 transition-all resize-y custom-scrollbar"
        placeholder={placeholder}
      />
    </div>
  );
}
