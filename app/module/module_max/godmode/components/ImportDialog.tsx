'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Book, CheckCircle2, Loader2, Upload, Wand2, X } from 'lucide-react';
import { ModelConfig } from '@/app/components/ModelConfigPanel';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { Edge, Node } from 'reactflow';
import { GodNodeData, WorldLayer } from '../types';
import { useGodMode } from '../store/GodModeContext';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  modelConfig?: ModelConfig;
}

interface NovelFile {
  id: string;
  title: string;
  content?: string;
  type: 'book' | 'volume' | 'chapter' | 'doc';
  docType?: string;
  children?: NovelFile[];
  summary?: string;
}

type ChapterSummaryResult = {
    summary: string;
    dimensions?: { layer: WorldLayer | string; content: string; entity: string }[];
  };

  export function ImportDialog({ isOpen, onClose, modelConfig }: ImportDialogProps) {
    const { state, dispatch } = useGodMode();
    const [loading, setLoading] = useState(false);
    const [books, setBooks] = useState<NovelFile[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState<{ current: number; total: number; title: string }>({ current: 0, total: 0, title: '' });
    const [autoEnterWorld, setAutoEnterWorld] = useState(true);
    const [includeEntities, setIncludeEntities] = useState(true); // Now controls "Dimensional Nodes"
    const [includeEvents, setIncludeEvents] = useState(true); // Add back includeEvents

    useEffect(() => {
      if (!isOpen) return;
      void loadBooks();
      setStatus('idle');
      setErrorMsg('');
      setProgress({ current: 0, total: 0, title: '' });
    }, [isOpen]);

    const loadBooks = async () => {
      setLoading(true);
      try {
        const data = await StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS);
        if (Array.isArray(data)) {
          setBooks(data);
          if (!selectedBookId && data[0]?.id) setSelectedBookId(data[0].id);
        } else {
          setBooks([]);
        }
      } finally {
        setLoading(false);
      }
    };

    const selectedBook = useMemo(() => books.find((b) => b.id === selectedBookId), [books, selectedBookId]);

    const collectChapters = (book: NovelFile): NovelFile[] => {
      const result: NovelFile[] = [];
      const walk = (n: NovelFile) => {
        if (n.type === 'chapter') result.push(n);
        if (n.children && n.children.length > 0) n.children.forEach(walk);
      };
      if (book.children && book.children.length > 0) book.children.forEach(walk);
      return result;
    };

    const chapters = useMemo(() => (selectedBook ? collectChapters(selectedBook) : []), [selectedBook]);

    const ensureModelConfig = () => {
      if (!modelConfig?.model) throw new Error('请先在顶部配置模型（建议选择 siliconflow 的 Qwen/Qwen3-8B）');
      return modelConfig;
    };

    const summarizeChapter = async (bookTitle: string, chapterNo: number, chapterTitle: string, chapterContent: string) => {
      const cfg = ensureModelConfig();
      const res = await fetch('/api/godmode/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summarize_chapter',
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
          bookTitle,
          chapterNo,
          chapterTitle,
          chapterContent
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || 'AI 生成失败');
      }
      const { data, usage } = payload || {};
      if (usage) {
        await StorageManager.addTokenUsage(cfg.provider, cfg.model, usage.prompt_tokens, usage.completion_tokens);
      }
      return data as ChapterSummaryResult;
    };

    const handleImport = async () => {
      setStatus('loading');
      setErrorMsg('');
      try {
        if (!selectedBook) throw new Error('请选择一本书');
        if (chapters.length === 0) throw new Error('这本书没有章节，无法生成概要');

        // Add delay to show loading state
        await new Promise(r => setTimeout(r, 100));

        const bookWorldNodeId = crypto.randomUUID();
        const bookWorldNode: Node<GodNodeData> = {
          id: bookWorldNodeId,
          type: 'godNode',
          position: { x: 0, y: 0 },
          data: {
            name: selectedBook.title,
            layer: 'geo',
            desc: `《${selectedBook.title}》世界`,
            hasChildWorld: true,
            props: { sourceBookId: selectedBook.id, sourceType: 'book' },
            worldPosition: {
              x: 0,
              y: 0,
              z: state.currentLevel,
              parentId: state.currentParentId
            }
          }
        };
        dispatch({ type: 'ADD_NODE', payload: bookWorldNode });

        const newEdges: Edge[] = [];
        let lastPlotNodeId: string | null = null;
        
        // Track the last node for each dimension to create parallel lines
        const lastDimNodeByLayer: Record<string, string> = {};

        // Y-Axis Offsets for different layers to create parallel tracks
        const LAYER_OFFSETS: Record<string, number> = {
            'relation': -550, // Relationships
            'race': -400,    // Characters/Race (Top)
            'faction': -250, // Factions
            'power': -100,   // Power System
            // Plot (0)
            'geo': 150,      // Geography (Bottom)
            'artifact': 300, // Artifacts
            'culture': 450,  // Culture/Economy
            'secret': 600,   // Secrets/Foreshadowing
            'other': 750
        };

        setProgress({ current: 0, total: chapters.length, title: '' });

        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];
          setProgress({ current: i + 1, total: chapters.length, title: chapter.title });

          // Priority 1: Content from JSON (Inline)
          let chapterContent = chapter.content || '';

          // Priority 2: Content from Storage (External Key)
          if (!chapterContent) {
             const rawContent = await StorageManager.getAsync(`novel_writer_chapter_${chapter.id}`);
             if (typeof rawContent === 'string') chapterContent = rawContent;
          }
          
          // Priority 3: Fallback legacy key
          if (!chapterContent) {
             const rawContentLegacy = await StorageManager.getAsync(`chapter_content_${chapter.id}`);
             if (typeof rawContentLegacy === 'string') chapterContent = rawContentLegacy;
          }

          const plotNodeId = crypto.randomUUID();
          const plotNodePosition = { x: i * 400, y: 0 }; // Spacing

          if (!chapterContent.trim()) {
             // ... Empty Chapter Handling ...
             continue; 
          }

          const result = await summarizeChapter(selectedBook.title, i + 1, chapter.title, chapterContent);

          // 1. Create Plot Node (Center Timeline)
          if (includeEvents) {
            const plotNode: Node<GodNodeData> = {
              id: plotNodeId,
              type: 'godNode',
              position: plotNodePosition,
              data: {
                name: chapter.title,
                layer: 'plot',
                desc: result.summary || '无概要',
                hasChildWorld: false,
                startChapter: i + 1,
                endChapter: i + 1,
                props: { sourceChapterId: chapter.id, sourceType: 'chapter' },
                worldPosition: { x: 0, y: 0, z: state.currentLevel + 1, parentId: bookWorldNodeId }
              }
            };
            dispatch({ type: 'ADD_NODE', payload: plotNode });

            // Link Plot Nodes (Main Timeline)
            if (lastPlotNodeId) {
              newEdges.push({
                  id: crypto.randomUUID(),
                  source: lastPlotNodeId,
                  target: plotNodeId,
                  type: 'smoothstep',
                  animated: true,
                  style: { stroke: '#f97316', strokeWidth: 3 },
                  label: '续'
              });
            }
            lastPlotNodeId = plotNodeId;
          }

          // 2. Create Dimensional Nodes (Parallel Tracks)
          if (includeEntities && Array.isArray(result.dimensions)) {
              result.dimensions.forEach((dim) => {
                  // Normalize Layer
                  let layerKey = (dim.layer || 'other').toLowerCase();
                  if (layerKey === 'character' || layerKey === 'role') layerKey = 'race';
                  if (layerKey === 'relationship') layerKey = 'relation';
                  
                  const yOffset = LAYER_OFFSETS[layerKey] || 750;
                  
                  const dimNodeId = crypto.randomUUID();
                  const dimNode: Node<GodNodeData> = {
                      id: dimNodeId,
                      type: 'godNode',
                      position: { x: i * 400, y: yOffset },
                      data: {
                          name: dim.entity || `${dim.layer}变更`, // Entity Name
                          layer: layerKey as WorldLayer,
                          desc: dim.content, // What happened
                          hasChildWorld: false,
                          startChapter: i + 1,
                          endChapter: i + 1,
                          props: { sourceType: 'chapter_dimension' },
                          worldPosition: { x: 0, y: 0, z: state.currentLevel + 1, parentId: bookWorldNodeId }
                      }
                  };
                  dispatch({ type: 'ADD_NODE', payload: dimNode });

                  // Connection 1: Plot -> Dimension (Vertical Intersection)
                  if (includeEvents) {
                    newEdges.push({
                        id: crypto.randomUUID(),
                        source: plotNodeId,
                        target: dimNodeId,
                        type: 'default',
                        style: { stroke: '#94a3b8', opacity: 0.5, strokeWidth: 1.5 }
                    });
                  }

                  // Connection 2: Dimension Timeline (Horizontal Flow)
                  // Connect to previous node of SAME LAYER
                  const lastDimNodeId = lastDimNodeByLayer[layerKey];
                  if (lastDimNodeId) {
                      newEdges.push({
                          id: crypto.randomUUID(),
                          source: lastDimNodeId,
                          target: dimNodeId,
                          type: 'smoothstep',
                          animated: false,
                          style: { stroke: '#cbd5e1', strokeDasharray: '5,5', opacity: 0.8, strokeWidth: 2 },
                          label: '发展'
                      });
                  }
                  
                  // Update last node for this layer
                  lastDimNodeByLayer[layerKey] = dimNodeId;
              });
          }
        }

        if (newEdges.length > 0) {
          dispatch({ type: 'SET_EDGES', payload: state.edges.concat(newEdges) });
        }

        // Small delay to ensure state update before navigation
        await new Promise(r => setTimeout(r, 200));

        if (autoEnterWorld) {
          dispatch({ type: 'NAVIGATE_DOWN', payload: { id: bookWorldNodeId, name: selectedBook.title } });
        }

        setStatus('success');
      } catch (e: any) {
        console.error('Import Error:', e);
        setStatus('error');
        setErrorMsg(e?.message || '导入失败');
      }
    };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-max-bg border border-max-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Wand2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">章节概要导入到上帝模式</h2>
              <p className="text-xs text-gray-500">一本书 = 上帝模式的一个世界（子世界）</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4">
            <div className="bg-max-surface border border-max-border rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-2">选择书籍</div>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  读取书架中...
                </div>
              ) : books.length === 0 ? (
                <div className="text-sm text-gray-500">没有找到任何书籍项目</div>
              ) : (
                <div className="space-y-2">
                  {books.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer">
                      <input
                        type="radio"
                        name="book"
                        value={b.id}
                        checked={selectedBookId === b.id}
                        onChange={() => setSelectedBookId(b.id)}
                        className="accent-purple-500"
                      />
                      <Book className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-200">{b.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-max-surface border border-max-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">当前模型</div>
                  <div className="text-sm text-gray-200 mt-1">
                    {modelConfig?.provider ? `${modelConfig.provider} / ${modelConfig.model || ''}` : '未配置'}
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300 select-none">
                <input type="checkbox" checked={autoEnterWorld} onChange={(e) => setAutoEnterWorld(e.target.checked)} className="accent-purple-500" />
                导入完成后自动进入该世界
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={includeEntities}
                  onChange={(e) => setIncludeEntities(e.target.checked)}
                  className="accent-purple-500"
                />
                生成并导入实体节点（人物/势力/地点/体系等）
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 select-none">
                <input type="checkbox" checked={includeEvents} onChange={(e) => setIncludeEvents(e.target.checked)} className="accent-purple-500" />
                同时生成时间线节点（可选）
              </label>
            </div>

            {status === 'loading' && (
              <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  正在生成：{progress.title || '...'}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {progress.current}/{progress.total}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="text-sm text-red-300">{errorMsg}</div>
              </div>
            )}

            {status === 'success' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">导入成功！</span>
                </div>
                <div className="text-sm opacity-80 mb-3">
                  已为您生成了世界结构。如果是第一次导入，系统会自动进入该世界。
                  <br />
                  如果您还停留在当前视图，请点击下方按钮。
                </div>
                <button 
                  onClick={() => {
                     // Need to find the book ID again if lost, but here we can just close
                     onClose();
                  }}
                  className="px-4 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-xs transition-colors"
                >
                  关闭并查看
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-max-surface">
          <div className="text-xs text-gray-500">章节数：{chapters.length}</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedBookId || status === 'loading'}
              className={`px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg transition-all font-bold text-sm flex items-center gap-2
                ${!selectedBookId || status === 'loading' ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
              `}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  生成概要并导入
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
