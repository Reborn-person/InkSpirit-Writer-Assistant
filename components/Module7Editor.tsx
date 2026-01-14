'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateAIContent } from '@/lib/ai';
import { Wand2, Settings, Book, User, Edit, Loader2, Save, List, ChevronRight, ChevronDown, FolderPlus, FilePlus, Folder, FileText, Trash2, MoreHorizontal, Plus, Sparkles, History, PenTool } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

// Types for our context
interface EditorContext {
  outline: string;
  detailedOutline: string;
  style: string;
  characters: string;
}

interface ChapterNode {
    title: string;
    index: number; // Character index in content
    children?: ChapterNode[];
    type: 'volume' | 'chapter';
}

interface NovelFile {
    id: string;
    title: string;
    content?: string; // Only for chapters
    type: 'book' | 'volume' | 'chapter';
    children?: NovelFile[];
    isOpen?: boolean; // For UI expansion
}

export default function Module7Editor() {
  const [content, setContent] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictionLength, setPredictionLength] = useState(50);
  
  // Chapter Navigation State (Auto-Regex)
  const [chapters, setChapters] = useState<ChapterNode[]>([]);
  const [isNavOpen, setIsNavOpen] = useState(true);
  
  // Bookshelf State (Manual Tree)
  const [books, setBooks] = useState<NovelFile[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'outline'>('books');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      type: 'input' | 'confirm';
      title: string;
      message?: string;
      defaultValue?: string;
      onConfirm: (value?: string) => void;
  }>({
      isOpen: false,
      type: 'input',
      title: '',
      onConfirm: () => {}
  });

  // Context State
  const [context, setContext] = useState<EditorContext>({
    outline: '',
    detailedOutline: '',
    style: '',
    characters: ''
  });
  
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true); // Default open for 3-column layout
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const prevLenRef = useRef<number>(0);
  const typedSinceRef = useRef<number>(0);
  const isComposingRef = useRef(false);

  // Load context from previous modules on mount
  useEffect(() => {
    const savedOutline = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2')) || '';
    const savedDetailed = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2_5')) || '';
    const savedModule1 = StorageManager.getJSON(STORAGE_KEYS.MODULE_INPUT('module1')) || {};
    
    // Try to extract characters/style if possible, or just use raw text
    setContext({
      outline: savedOutline,
      detailedOutline: savedDetailed,
      style: savedModule1.style || '',
      characters: savedModule1.elements || '' // Simple fallback
    });
    
    // Load saved content if any
    const savedDraft = StorageManager.get(STORAGE_KEYS.MODULE7_CONTENT);
    if (savedDraft) setContent(savedDraft);
    prevLenRef.current = savedDraft ? savedDraft.length : 0;

    // Load Bookshelf
    const savedBooks = StorageManager.getJSON(STORAGE_KEYS.NOVEL_PROJECTS);
    if (savedBooks && Array.isArray(savedBooks)) {
        setBooks(savedBooks);
    }
  }, []);

  // Save content on change (to current active file OR generic draft)
  useEffect(() => {
    // If we have an active file, save to it
    if (activeFileId) {
        setBooks(prevBooks => {
            const newBooks = [...prevBooks];
            // Recursive update function
            const updateContent = (nodes: NovelFile[]): boolean => {
                for (const node of nodes) {
                    if (node.id === activeFileId) {
                        node.content = content;
                        return true;
                    }
                    if (node.children) {
                        if (updateContent(node.children)) return true;
                    }
                }
                return false;
            };
            updateContent(newBooks);
            StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
            return newBooks;
        });
    } else {
        // Fallback: Save to generic draft if no file is selected (e.g. initial state)
        StorageManager.set(STORAGE_KEYS.MODULE7_CONTENT, content);
    }
  }, [content, activeFileId]); // Note: dependency on activeFileId might cause issues if not careful, but here we just want to sync content

  // Parse Chapters and Volumes (Auto-Regex)
  useEffect(() => {
    // Only parse if in Outline tab OR if we want to show structure of current chapter
    if (activeTab === 'outline' || true) { // Always parse for now to support jumping within a long chapter
        const lines = content.split('\n');
        // ... (rest of regex logic)
        const nodes: ChapterNode[] = [];
        // ... (rest of parsing logic)
    }
  }, [content, activeTab]);

  // --- Bookshelf Logic ---

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleAddBook = () => {
      setModalConfig({
          isOpen: true,
          type: 'input',
          title: '新建书辑',
          message: '请输入书名：',
          onConfirm: (title) => {
              if (!title) return;
              const newBook: NovelFile = {
                  id: generateId(),
                  title,
                  type: 'book',
                  children: [],
                  isOpen: true
              };
              setBooks(prev => {
                  const newBooks = [...prev, newBook];
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });
          }
      });
  };

  const handleAddVolume = (bookId: string) => {
      setModalConfig({
          isOpen: true,
          type: 'input',
          title: '新建分卷',
          message: '请输入卷名：',
          onConfirm: (title) => {
              if (!title) return;
              setBooks(prev => {
                  const newBooks = prev.map(book => {
                      if (book.id === bookId) {
                          return {
                              ...book,
                              children: [
                                  ...(book.children || []),
                                  {
                                      id: generateId(),
                                      title,
                                      type: 'volume' as const,
                                      children: [],
                                      isOpen: true
                                  }
                              ]
                          };
                      }
                      return book;
                  });
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });
          }
      });
  };

  const handleAddChapter = (bookId: string, volumeId: string) => {
      setModalConfig({
          isOpen: true,
          type: 'input',
          title: '新建章节',
          message: '请输入章节名（无需输入序号）：',
          onConfirm: (title) => {
              if (!title) return;
              let newChapterId = '';
              
              setBooks(prev => {
                  const newBooks = prev.map(book => {
                      if (book.id === bookId && book.children) {
                          return {
                              ...book,
                              children: book.children.map(volume => {
                                  if (volume.id === volumeId) {
                                      // Get current chapter count in this volume
                                      const chapterCount = (volume.children || []).filter(c => c.type === 'chapter').length;
                                      const nextIndex = chapterCount + 1;
                                      
                                      const chapter: NovelFile = {
                                          id: generateId(),
                                          title: title, // Store raw title
                                          type: 'chapter' as const,
                                          content: ''
                                      };
                                      newChapterId = chapter.id;
                                      return {
                                          ...volume,
                                          isOpen: true,
                                          children: [
                                              ...(volume.children || []),
                                              chapter
                                          ]
                                      };
                                  }
                                  return volume;
                              })
                          };
                      }
                      return book;
                  });
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });

              setTimeout(() => {
                  if (newChapterId) {
                      setActiveFileId(newChapterId);
                      setContent('');
                  }
              }, 0);
          }
      });
  };
  
  const handleRenameNode = (id: string, currentTitle: string) => {
      setModalConfig({
          isOpen: true,
          type: 'input',
          title: '重命名',
          message: '请输入新名称：',
          defaultValue: currentTitle,
          onConfirm: (newTitle) => {
              if (!newTitle) return;
              setBooks(prev => {
                  const updateRecursive = (nodes: NovelFile[]): NovelFile[] => {
                      return nodes.map(node => {
                          if (node.id === id) {
                              return { ...node, title: newTitle };
                          }
                          if (node.children) {
                              return { ...node, children: updateRecursive(node.children) };
                          }
                          return node;
                      });
                  };
                  const newBooks = updateRecursive(prev);
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });
          }
      });
  };

  const handleSelectFile = (file: NovelFile) => {
      if (file.type === 'chapter') {
          setActiveFileId(file.id);
          setContent(file.content || '');
      } else {
          // Toggle expand/collapse
          const toggleOpen = (nodes: NovelFile[]): NovelFile[] => {
              return nodes.map(node => {
                  if (node.id === file.id) {
                      return { ...node, isOpen: !node.isOpen };
                  }
                  if (node.children) {
                      return { ...node, children: toggleOpen(node.children) };
                  }
                  return node;
              });
          };
          const newBooks = toggleOpen(books);
          setBooks(newBooks);
          StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
      }
  };

  const handleDeleteNode = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setModalConfig({
          isOpen: true,
          type: 'confirm',
          title: '确认删除',
          message: '确定要删除吗？删除后无法恢复。',
          onConfirm: () => {
              const deleteRecursive = (nodes: NovelFile[]): NovelFile[] => {
                  return nodes.filter(node => {
                      if (node.id === id) return false;
                      if (node.children) {
                          node.children = deleteRecursive(node.children);
                      }
                      return true;
                  });
              };
              
              setBooks(prev => {
                  const newBooks = deleteRecursive([...prev]);
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });
              
              if (activeFileId === id) {
                  setActiveFileId(null);
                  setContent('');
              }
          }
      });
  };

  // --- End Bookshelf Logic ---

  // Parse Chapters and Volumes
  useEffect(() => {
    const lines = content.split('\n');
    const nodes: ChapterNode[] = [];
    let currentVolume: ChapterNode | null = null;
    
    // Regex
    const volumeRegex = /^\s*(?:第[0-9零一二三四五六七八九十百千万]+[卷部]|Volume\s*\d+).*/;
    const chapterRegex = /^\s*(?:第[0-9零一二三四五六七八九十百千万]+[章回]|Chapter\s*\d+|[0-9]+\.|序章|楔子|尾声).*/;
    
    let charCount = 0;
    
    // We need exact character indices for scrolling, so we must iterate carefully
    // Using regex.exec on full content is better for indices, but splitting by line is easier for structure.
    // Let's use regex.exec on full content is better.
    
    const fullRegex = /(?:^\s*|\n\s*)((?:第[0-9零一二三四五六七八九十百千万]+[卷部]|Volume\s*\d+).*)|(?:^\s*|\n\s*)((?:第[0-9零一二三四五六七八九十百千万]+[章回]|Chapter\s*\d+|[0-9]+\.|序章|楔子|尾声).*)/g;
    
    let match;
    // Reset regex lastIndex just in case
    fullRegex.lastIndex = 0;
    
    // Clear previous structure
    const newNodes: ChapterNode[] = [];
    let lastVolumeNode: ChapterNode | null = null;

    while ((match = fullRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const volumeTitle = match[1]; // Capture group 1 is volume
        const chapterTitle = match[2]; // Capture group 2 is chapter
        const index = match.index + (fullMatch.startsWith('\n') ? 1 : 0); // Adjust for newline if present
        
        if (volumeTitle) {
            // It's a volume
            const node: ChapterNode = {
                title: volumeTitle.trim(),
                index: index,
                type: 'volume',
                children: []
            };
            newNodes.push(node);
            lastVolumeNode = node;
        } else if (chapterTitle) {
            // It's a chapter
            const node: ChapterNode = {
                title: chapterTitle.trim(),
                index: index,
                type: 'chapter'
            };
            
            if (lastVolumeNode) {
                lastVolumeNode.children?.push(node);
            } else {
                newNodes.push(node);
            }
        }
    }
    
    setChapters(newNodes);
  }, [content]);

  const scrollToChapter = (index: number) => {
      if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(index, index);
          // Scroll to the position
          // Calculating scroll position for textarea is tricky.
          // A simple hack is blur and focus, or using scrollHeight estimation.
          // Or just let setSelectionRange handle it (some browsers do).
          
          // Better approach: Calculate line number
          const textBefore = content.substring(0, index);
          const lineNum = textBefore.split('\n').length;
          const lineHeight = 32; // Approximate line height in px (text-lg leading-relaxed)
          const scrollTop = (lineNum - 1) * lineHeight;
          
          textareaRef.current.scrollTop = scrollTop;
      }
  };

  const overlapRatio = (a: string, b: string) => {
    const A = a.slice(-20);
    const B = b.slice(0, 20);
    const maxK = Math.min(A.length, B.length);
    let best = 0;
    for (let k = maxK; k >= 1; k--) {
      if (A.slice(-k) === B.slice(0, k)) {
        best = k;
        break;
      }
    }
    return best / Math.max(1, Math.min(20, B.length));
  };

  const maybePredictAfterThreshold = (text: string) => {
    if (typedSinceRef.current >= 15) {
      const similar = suggestion ? overlapRatio(text, suggestion) >= 0.6 : false;
      if (!similar) {
        fetchPrediction(text);
      }
      typedSinceRef.current = 0;
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    // Trigger content change logic manually to ensure prediction checks run if needed
    handleContentChange(e as any);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    
    // Don't run prediction logic while composing (e.g. typing Pinyin)
    if (isComposingRef.current) return;

    const delta = Math.max(0, newText.length - prevLenRef.current);
    typedSinceRef.current += delta;
    prevLenRef.current = newText.length;
    maybePredictAfterThreshold(newText);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (newText.length > 10) {
        debounceTimer.current = setTimeout(() => {
            const similar = suggestion ? overlapRatio(newText, suggestion) >= 0.6 : false;
            if (!similar) fetchPrediction(newText);
        }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        const merged = content + suggestion;
        setContent(merged);
        setSuggestion('');
        prevLenRef.current = merged.length;
        typedSinceRef.current = 0;
    }
  };

  const fetchPrediction = async (currentText: string) => {
    setLoading(true);
    try {
        const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
        const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
        const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3'; // Use writing model for prediction

        // Construct the prompt using RAG context + Current Text
        // We act as the "RAG" part here by assembling the prompt manually
        const systemPrompt = `你是一个智能网文写作助手（Copilot）。
你的任务是根据上下文续写小说内容。
续写要求：
1. 风格基调：${context.style}
2. 严格贴合大纲：${context.outline.substring(0, 500)}...
3. 续写长度：约 ${predictionLength} 字
4. 仅输出续写的内容，不要包含任何解释或重复前文。`;

        const userPrompt = `前文内容：
${currentText.slice(-1000)}

请续写：`;

        const pred = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
        if (pred) {
            setSuggestion(pred);
        }
    } catch (error) {
        console.error("Prediction failed:", error);
    } finally {
        setLoading(false);
    }
  };

  const manualTrigger = () => {
      fetchPrediction(content);
      typedSinceRef.current = 0;
  };

  return (
    <div className="flex h-screen bg-rice-paper overflow-hidden font-serif text-ink">
       {/* Chapter Navigation Sidebar (Left Column) */}
       <div className={`bg-[#F5F2EC] border-r border-ink/10 h-full flex flex-col transition-all duration-300 ${isNavOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
          
          {/* Sidebar Header / Tab Switcher */}
          <div className="border-b border-ink/10 bg-rice-texture flex">
             <button
                 onClick={() => setActiveTab('books')}
                 className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                     activeTab === 'books' 
                        ? 'bg-[#F5F2EC] text-daiqing border-t-2 border-daiqing' 
                        : 'text-gray-500 hover:bg-black/5'
                 }`}
             >
                 <Book className="w-4 h-4" /> 书架
             </button>
             <button
                 onClick={() => setActiveTab('outline')}
                 className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                     activeTab === 'outline' 
                        ? 'bg-[#F5F2EC] text-daiqing border-t-2 border-daiqing' 
                        : 'text-gray-500 hover:bg-black/5'
                 }`}
             >
                 <List className="w-4 h-4" /> 大纲
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
             {/* Tab Content: Bookshelf */}
             {activeTab === 'books' && (
                 <div className="space-y-3 p-1">
                     <button 
                        onClick={handleAddBook}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-ink/20 rounded-lg text-gray-500 hover:border-daiqing hover:text-daiqing hover:bg-daiqing/5 transition-all text-sm font-medium"
                     >
                         <FolderPlus className="w-4 h-4" /> 新建书辑
                     </button>
                     
                     {books.map((book) => (
                         <div key={book.id} className="space-y-1">
                             {/* Book Item */}
                             <div className="group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors">
                                <button 
                                    onClick={() => handleSelectFile(book)}
                                    className="flex-1 text-left flex items-center gap-2 font-bold text-ink text-sm truncate"
                                >
                                    {book.isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    <Book className="w-4 h-4 text-daiqing" />
                                    {book.title}
                                </button>
                                <div className="hidden group-hover:flex items-center gap-1">
                                    <button onClick={() => handleAddVolume(book.id)} title="添加卷" className="p-1 hover:bg-black/10 rounded text-gray-500"><FolderPlus className="w-3 h-3" /></button>
                                    <button onClick={(e) => handleDeleteNode(e, book.id)} title="删除" className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                                </div>
                             </div>

                             {/* Volumes */}
                             {book.isOpen && book.children?.map((volume) => (
                                 <div key={volume.id} className="ml-3 space-y-1 border-l border-ink/10 pl-3">
                                     <div className="group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors">
                                        <button 
                                            onClick={() => handleSelectFile(volume)}
                                            className="flex-1 text-left flex items-center gap-2 font-medium text-gray-700 text-sm truncate"
                                        >
                                            {volume.isOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                            <Folder className="w-4 h-4 text-amber-600/70" />
                                            {volume.title}
                                        </button>
                                        <div className="hidden group-hover:flex items-center gap-1">
                                            <button onClick={() => handleAddChapter(book.id, volume.id)} title="添加文章" className="p-1 hover:bg-black/10 rounded text-gray-500"><FilePlus className="w-3 h-3" /></button>
                                            <button onClick={(e) => handleDeleteNode(e, volume.id)} title="删除" className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                     </div>

                                     {/* Chapters */}
                                     {volume.isOpen && volume.children?.map((chapter, index) => (
                                         <div key={chapter.id} className="ml-3 border-l border-ink/10 pl-3">
                                             <div className={`group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors ${activeFileId === chapter.id ? 'bg-daiqing/10 text-daiqing selection-cinnabar' : 'text-gray-600'}`}>
                                                <button 
                                                    onClick={() => handleSelectFile(chapter)}
                                                    className="flex-1 text-left flex items-center gap-2 text-xs truncate"
                                                    title={chapter.title}
                                                >
                                                    <FileText className="w-3 h-3 flex-shrink-0 opacity-70" />
                                                    <span>
                                                        <span className="text-gray-400 mr-1">第{index + 1}章</span>
                                                        {chapter.title}
                                                    </span>
                                                </button>
                                                <div className="hidden group-hover:flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRenameNode(chapter.id, chapter.title); }} className="p-1 hover:bg-black/10 rounded text-daiqing" title="重命名"><Edit className="w-3 h-3" /></button>
                                                    <button onClick={(e) => handleDeleteNode(e, chapter.id)} className="p-1 hover:bg-red-50 rounded text-red-400" title="删除"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                             </div>
                                         </div>
                                     ))}
                                     
                                     {(!volume.children || volume.children.length === 0) && (
                                         <div className="ml-6 text-xs text-gray-400 py-1 italic">暂无文章</div>
                                     )}
                                 </div>
                             ))}
                             
                             {(!book.children || book.children.length === 0) && (
                                 <div className="ml-6 text-xs text-gray-400 py-1 italic">暂无分卷</div>
                             )}
                         </div>
                     ))}
                 </div>
             )}

             {/* Tab Content: Outline (Regex) */}
             {activeTab === 'outline' && (
                 <div>
                    {chapters.length === 0 && (
                        <div className="text-center text-xs text-gray-400 py-8 flex flex-col items-center gap-2">
                            <List className="w-8 h-8 opacity-20" />
                            <span>未检测到章节</span>
                            <span className="text-[10px] opacity-60">(支持: 第X章/卷/Chapter)</span>
                        </div>
                    )}
                    {chapters.map((node, i) => (
                        <div key={i}>
                            {/* Volume or Top-level Chapter */}
                            <button 
                                onClick={() => scrollToChapter(node.index)}
                                className={`w-full text-left px-2 py-2 rounded text-sm truncate hover:bg-black/5 transition-colors ${
                                    node.type === 'volume' ? 'font-bold text-ink mt-3 border-b border-ink/5 pb-1 mb-1' : 'text-gray-600'
                                }`}
                                title={node.title}
                            >
                                {node.title}
                            </button>
                            
                            {/* Children Chapters (if volume) */}
                            {node.children && node.children.length > 0 && (
                                <div className="ml-2 border-l-2 border-ink/10 pl-2 mt-1 space-y-0.5">
                                    {node.children.map((child, j) => (
                                        <button 
                                            key={`${i}-${j}`}
                                            onClick={() => scrollToChapter(child.index)}
                                            className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-500 truncate hover:bg-black/5 hover:text-daiqing transition-colors"
                                            title={child.title}
                                        >
                                            {child.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                 </div>
             )}
          </div>
       </div>

      {/* Main Editor Area (Center Column) */}
      <div className="flex-1 flex flex-col p-6 h-full relative z-0">
         {/* Toggle Nav Button (when closed) */}
         {!isNavOpen && (
             <button 
                onClick={() => setIsNavOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 p-2 rounded-r-lg shadow-sm z-10 hover:bg-gray-50 text-gray-500"
                title="展开目录"
             >
                <ChevronRight className="w-4 h-4" />
             </button>
         )}

        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-2xl font-bold text-ink flex items-center gap-3">
                    <PenTool className="w-6 h-6 text-daiqing" />
                    <span>AI 辅助写作</span>
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-daiqing/10 text-daiqing border border-daiqing/20">Module 7</span>
                </h1>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all shadow-sm ${
                        isContextPanelOpen 
                            ? 'bg-daiqing text-white border-daiqing' 
                            : 'bg-white border-ink/10 text-gray-600 hover:bg-gray-50'
                    }`}
                    title={isContextPanelOpen ? "隐藏右侧栏" : "显示右侧栏"}
                >
                    <Settings className="w-4 h-4" />
                    {isContextPanelOpen ? '隐藏助手' : 'AI 助手'}
                </button>
                <button 
                    onClick={manualTrigger}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-cinnabar text-white rounded-lg hover:bg-red-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                    <span>立即续写</span>
                </button>
            </div>
        </div>

        <div className="flex-1 relative bg-rice-texture rounded-xl shadow-sm border border-ink/10 overflow-hidden relative group">
            {/* Editor Inner Border (Ink Line) */}
            <div className="absolute inset-2 border border-ink/5 pointer-events-none rounded-lg z-10"></div>
            
            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="w-full h-full p-8 pb-32 text-lg leading-relaxed resize-none outline-none font-serif text-ink bg-transparent relative z-0 custom-scrollbar"
                placeholder="在此挥毫泼墨..."
                spellCheck={false}
                style={{ lineHeight: '2' }}
            />
            
            {/* Suggestion Overlay - Ink Note Style */}
            {suggestion && (
                <div className="absolute bottom-8 right-8 max-w-lg p-6 bg-[#FFFEFA] border border-ink/10 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-4 z-20"
                     style={{
                         backgroundImage: 'radial-gradient(#607476 0.5px, transparent 0.5px)',
                         backgroundSize: '10px 10px'
                     }}>
                    <div className="text-xs text-daiqing font-bold mb-3 flex justify-between items-center border-b border-ink/5 pb-2">
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            AI 续写建议 (按 Tab 采纳)
                        </span>
                        <button onClick={() => setSuggestion('')} className="hover:text-cinnabar transition-colors p-1">✕</button>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed font-serif">{suggestion}</p>
                </div>
            )}
        </div>
        
        {/* Status Bar */}
        <div className="mt-2 flex justify-between items-center text-xs text-gray-400 px-2">
             <span>字数: {content.length}</span>
             <span>{loading ? '正在思考...' : '准备就绪'}</span>
        </div>
      </div>

      {/* Context Panel (Right Column) */}
      {isContextPanelOpen && (
        <div className="w-80 bg-[#F5F2EC] border-l border-ink/10 h-full overflow-y-auto p-5 shadow-xl transition-all duration-300 custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-ink/10 pb-4">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <Settings className="w-4 h-4 text-daiqing" />
                    灵感与设置
                </h2>
                <button onClick={() => setIsContextPanelOpen(false)} className="text-gray-400 hover:text-daiqing transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Prediction Settings */}
                <div className="p-4 bg-white rounded-xl border border-ink/5 shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex justify-between">
                        <span>续写长度</span>
                        <span className="text-daiqing font-bold">{predictionLength} 字</span>
                    </label>
                    <input 
                        type="range" 
                        min="20" 
                        max="200" 
                        step="10" 
                        value={predictionLength}
                        onChange={(e) => setPredictionLength(parseInt(e.target.value))}
                        className="w-full accent-daiqing h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>短</span>
                        <span>长</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-ink mb-2 flex items-center gap-2">
                        <Book className="w-4 h-4 text-daiqing" /> 全书大纲
                    </label>
                    <textarea 
                        value={context.outline}
                        onChange={(e) => setContext({...context, outline: e.target.value})}
                        className="w-full h-32 p-3 text-sm bg-white border border-ink/10 rounded-xl focus:ring-1 focus:ring-daiqing outline-none resize-none shadow-sm"
                        placeholder="在此粘贴全书大纲..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-ink mb-2 flex items-center gap-2">
                        <List className="w-4 h-4 text-daiqing" /> 详细细纲
                    </label>
                    <textarea 
                        value={context.detailedOutline}
                        onChange={(e) => setContext({...context, detailedOutline: e.target.value})}
                        className="w-full h-32 p-3 text-sm bg-white border border-ink/10 rounded-xl focus:ring-1 focus:ring-daiqing outline-none resize-none shadow-sm"
                        placeholder="在此粘贴当前章节细纲..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-ink mb-2 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-daiqing" /> 风格基调
                    </label>
                    <input 
                        type="text"
                        value={context.style}
                        onChange={(e) => setContext({...context, style: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-ink/10 rounded-xl focus:ring-1 focus:ring-daiqing outline-none text-sm shadow-sm"
                        placeholder="例如：仙侠、克苏鲁..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-ink mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-daiqing" /> 人物/核心元素
                    </label>
                    <textarea 
                        value={context.characters}
                        onChange={(e) => setContext({...context, characters: e.target.value})}
                        className="w-full h-24 p-3 text-sm bg-white border border-ink/10 rounded-xl focus:ring-1 focus:ring-daiqing outline-none resize-none shadow-sm"
                        placeholder="关键人物性格、伏笔..."
                    />
                </div>

                <div className="pt-4 border-t border-ink/5">
                    <p className="text-xs text-gray-500 leading-relaxed">
                        <span className="font-bold text-daiqing">提示：</span> 
                        右侧配置仅作为当前 AI 续写的参考上下文，不会修改您在其他模块中生成的内容。
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* Custom UI Modal (InputDialog / ConfirmDialog) */}
      {modalConfig.isOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-ink/10">
                  <div className="p-6 bg-rice-texture">
                      <h3 className="text-xl font-bold text-ink mb-2">{modalConfig.title}</h3>
                      {modalConfig.message && <p className="text-gray-600 mb-4">{modalConfig.message}</p>}
                      
                      {modalConfig.type === 'input' && (
                          <input 
                              type="text"
                              autoFocus
                              className="w-full px-4 py-3 bg-white border border-ink/20 rounded-xl focus:ring-2 focus:ring-daiqing outline-none transition-all text-ink"
                              placeholder="请输入..."
                              onKeyDown={(e) => {
                                  if (e.nativeEvent.isComposing) return;
                                  if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      modalConfig.onConfirm(e.currentTarget.value);
                                      setModalConfig(prev => ({ ...prev, isOpen: false }));
                                  } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setModalConfig(prev => ({ ...prev, isOpen: false }));
                                  }
                              }}
                          />
                      )}
                  </div>
                  
                  <div className="bg-[#F5F2EC] px-6 py-4 flex justify-end gap-3 border-t border-ink/5">
                      <button 
                          onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                          className="px-4 py-2 text-gray-600 hover:text-ink font-medium transition-colors"
                      >
                          取消
                      </button>
                      <button 
                          onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (modalConfig.type === 'input') {
                                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                                  modalConfig.onConfirm(input?.value);
                              } else {
                                  modalConfig.onConfirm();
                              }
                              setModalConfig(prev => ({ ...prev, isOpen: false }));
                          }}
                          className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all ${
                              modalConfig.type === 'confirm' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-daiqing hover:bg-[#4a5a5c] shadow-blue-200'
                          }`}
                      >
                          确定
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
