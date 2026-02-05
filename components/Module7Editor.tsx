'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditorAgent } from '@/contexts/EditorAgentContext';
import { generateAIContent } from '@/lib/ai';
import { ChevronRight, ChevronDown, Plus, FolderPlus, FileText, Trash2, Edit, Book, ChevronLeft, Save, Sparkles, Image as ImageIcon, MessageSquare, Menu, User, Wand2, List, Settings, Loader2, Folder, PenTool, FilePlus, Users, RefreshCw, Type, Minus, AlignLeft, Copy, Check, MoreHorizontal, Cloud, Upload, Undo, Redo, StickyNote, Zap, Smile, Globe, Search } from 'lucide-react';
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
    content?: string; // Only for chapters/docs
    summary?: string; // For auto-generated chapter summary
    type: 'book' | 'volume' | 'chapter' | 'doc';
    docType?: 'character' | 'world' | 'style' | 'goldfinger' | 'requirement' | 'summary' | 'force' | 'setting' | 'system_panel' | 'vocabulary' | 'meme' | 'sample' | 'story' | 'cool_point' | 'writing_skill' | 'ai_reference' | 'other';
    children?: NovelFile[];
    isOpen?: boolean; // For UI expansion
}

export default function Module7Editor() {
  const [content, setContent] = useState('');
  
  // Use useLayoutEffect to restore cursor position after render to prevent flicker
  const cursorRestoreRef = useRef<{ start: number, end: number } | null>(null);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
      if (cursorRestoreRef.current && textareaRef.current) {
          const { start, end } = cursorRestoreRef.current;
          textareaRef.current.setSelectionRange(start, end);
          // textareaRef.current.blur(); // Force re-layout/scroll - Removed to prevent infinite loop/unwanted saves
          // textareaRef.current.focus();
          cursorRestoreRef.current = null;
      }
  }, [content]);

  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoAction = useRef(false);

  // History Helpers
  const pushHistory = useCallback((newContent: string) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newContent);
           if (newHistory.length > 15) newHistory.shift(); // 优化：从50减少到15，节省内存
          return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const addToHistory = (newContent: string) => {
      setHistory(prev => {
          const current = prev.slice(0, historyIndex + 1);
          current.push(newContent);
           if (current.length > 15) current.shift(); // 优化：从50减少到15
          return current;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          isUndoRedoAction.current = true;
          const prevIndex = historyIndex - 1;
          const prevContent = history[prevIndex];
          setHistoryIndex(prevIndex);
          setContent(prevContent);
          prevLenRef.current = prevContent.length;
          // Reset flag after render
          setTimeout(() => { isUndoRedoAction.current = false; }, 0);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          isUndoRedoAction.current = true;
          const nextIndex = historyIndex + 1;
          const nextContent = history[nextIndex];
          setHistoryIndex(nextIndex);
          setContent(nextContent);
          prevLenRef.current = nextContent.length;
          setTimeout(() => { isUndoRedoAction.current = false; }, 0);
      }
  };
  
  // Chapter Navigation State (Auto-Regex)
  const [chapters, setChapters] = useState<ChapterNode[]>([]);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(288); // Default 72 * 4 = 288px
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Resizer Logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        // Limit min and max width
        const newWidth = Math.max(200, Math.min(600, mouseMoveEvent.clientX));
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);
  
  // Bookshelf State (Manual Tree)
  const [books, setBooks] = useState<NovelFile[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'outline' | 'memo'>('books');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openAddMenuId, setOpenAddMenuId] = useState<string | null>(null);
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedBookSettings, setCollapsedBookSettings] = useState<Record<string, boolean>>({});

  const [bookSearchQueries, setBookSearchQueries] = useState<Record<string, string>>({});

  const getBookSearchQuery = (bookId: string) => bookSearchQueries[bookId] || '';
  const setBookSearchQuery = (bookId: string, query: string) => {
      setBookSearchQueries(prev => ({ ...prev, [bookId]: query }));
  };

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      type: 'input' | 'confirm' | 'textarea';
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

  // Editor Configuration
  const [editorConfig, setEditorConfig] = useState({
      fontSize: 18,
      lineHeight: 1.8,
      predictEnabled: false,
      predictLength: 50,
      predictThreshold: 2000, // Debounce ms
  });
  
  const [prediction, setPrediction] = useState<{ text: string; start: number } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const predictTimerRef = useRef<NodeJS.Timeout | null>(null);
  const predictAbortControllerRef = useRef<AbortController | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastPredictContentRef = useRef('');

  const [cursorStats, setCursorStats] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Load editor config
  useEffect(() => {
      // Async load for better performance on large data
      const loadConfig = async () => {
          const savedConfig = await StorageManager.getJSONAsync('editor_config');
          if (savedConfig) {
              setEditorConfig(prev => ({ ...prev, ...savedConfig }));
          }
      };
      loadConfig();
  }, []);

  // Save editor config
  const updateEditorConfig = (updates: Partial<typeof editorConfig>) => {
      setEditorConfig(prev => {
          const newConfig = { ...prev, ...updates };
          StorageManager.setJSON('editor_config', newConfig);
          return newConfig;
      });
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleAutoFormat = () => {
      // 1. Split content by lines
      const lines = content.split('\n');
      
      // 2. Process each line
      const formattedLines = lines.map(line => {
          // Remove existing indentation (spaces/tabs at start) and trailing spaces
          let cleanLine = line.trim();
          
          // If line is empty, return empty string (we'll handle empty lines later)
          if (!cleanLine) return '';
          
          // Add standard indentation (2 full-width spaces)
          return '　　' + cleanLine;
      });
      
      // 3. Join lines, removing excessive empty lines (max 1 empty line between paragraphs)
      // Filter out empty lines first to normalize, then join with single newline? 
      // Standard novel format usually has no empty lines between paragraphs if indented, 
      // or 1 empty line if not indented. With indentation, we usually just use \n.
      // Let's stick to: No empty lines between paragraphs for compact view, or preserve user intent?
      // "One-click format" usually implies standardizing. Let's remove all empty lines to make it compact.
      
      const nonEmptyLines = formattedLines.filter(line => line.length > 0);
      const formatted = nonEmptyLines.join('\n');
      
      if (formatted !== content) {
          setContent(formatted);
          prevLenRef.current = formatted.length;
          
          // Flash success feedback (optional)
      }
  };

  const handleCopyContent = () => {
      navigator.clipboard.writeText(content);
  };
  
  // Helper to save current content immediately
  // Optimized: Only save the specific chapter content to separate storage key
  // to avoid serializing the entire bookshelf tree on every keystroke.
  const saveCurrentContent = async (targetId: string | null, targetContent: string) => {
      if (targetId) {
          // 1. Update React State (Memory) - SKIP for frequent updates to avoid re-render lag
          // The 'content' state is the source of truth for the editor.
          // 'books' state structure is used for sidebar.
          // Syncing content to 'books' on every keystroke causes massive re-renders.
          /*
          setBooks(prevBooks => {
              const newBooks = [...prevBooks];
              const updateContent = (nodes: NovelFile[]): boolean => {
                  for (const node of nodes) {
                      if (node.id === targetId) {
                          node.content = targetContent; // Keep in memory for now
                          return true;
                      }
                      if (node.children) {
                          if (updateContent(node.children)) return true;
                      }
                  }
                  return false;
              };
              updateContent(newBooks);
              return newBooks;
          });
          */

          // 2. Persist ONLY this chapter content asynchronously
          // Using a specific prefix for chapter content
          try {
              await StorageManager.set(`chapter_content_${targetId}`, targetContent);
          } catch (e) {
              console.error('Failed to save chapter content', e);
          }
      } else {
          StorageManager.set(STORAGE_KEYS.MODULE7_CONTENT, targetContent);
      }
  };

  // Function to save the full bookshelf structure (titles, hierarchy)
  // Should be called on Add/Delete/Rename/Move, but NOT on typing content.
  const saveBookshelfStructure = (booksToSave: NovelFile[]) => {
      // Create a lightweight version without content for storage? 
      // For now, let's just save as is, assuming content in memory matches.
      // Ideally, we should strip 'content' from this object before saving to keep it light,
      // but that requires migration logic. 
      // Let's stick to saving full object for safety but ONLY call this on structure changes.
      StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, booksToSave);
  };

  const updateCursorStats = (e: any) => {
      const textarea = e.target;
      const selStart = textarea.selectionStart;
      const value = textarea.value;
      
      const lines = value.substr(0, selStart).split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      
      setCursorStats({ line, col });
  };
  
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const prevLenRef = useRef<number>(0);
  const isComposingRef = useRef(false);
  
  // Agent Integration
  const { registerEditor, unregisterEditor, agentState, isAiOpen, setPendingPrompt } = useEditorAgent();
  const contentRef = useRef(content);
  
  // Floating Toolbar State
  const [toolbarState, setToolbarState] = useState<{
      show: boolean;
      x: number;
      y: number;
      selectedText: string;
  }>({ show: false, x: 0, y: 0, selectedText: '' });
  const [contextMenuState, setContextMenuState] = useState({
      visible: false,
      x: 0,
      y: 0
  });
  const [clipboardBoard, setClipboardBoard] = useState<string[]>([]);

  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      // Standardize behavior: if selecting, show toolbar near mouse
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start !== end) {
          const selected = textarea.value.substring(start, end);
          // Only show if selection is meaningful
          if (selected.trim().length > 0) {
              setToolbarState({
                  show: true,
                  x: e.clientX,
                  y: e.clientY - 50, // Position above cursor
                  selectedText: selected
              });
          }
      } else {
          setToolbarState(prev => ({ ...prev, show: false }));
      }
      
      // Update stats as well
      updateCursorStats(e);
  };

  useEffect(() => {
      const loadClipboardBoard = async () => {
          const saved = await StorageManager.getJSONAsync('module7_clipboard_board');
          if (Array.isArray(saved)) {
              setClipboardBoard(saved);
          }
      };
      loadClipboardBoard();
  }, []);

  useEffect(() => {
      if (!contextMenuState.visible) return;
      const handleClose = () => setContextMenuState(prev => ({ ...prev, visible: false }));
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
      return () => {
          window.removeEventListener('click', handleClose);
          window.removeEventListener('scroll', handleClose, true);
      };
  }, [contextMenuState.visible]);

  const handleEditorContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setToolbarState(prev => ({ ...prev, show: false }));
      const menuWidth = 140;
      const menuHeight = 320;
      const x = Math.min(e.clientX, window.innerWidth - menuWidth);
      const y = Math.min(e.clientY, window.innerHeight - menuHeight);
      setContextMenuState({
          visible: true,
          x,
          y
      });
  };

  const applyContentUpdate = (nextContent: string, cursorPos: number) => {
      if (prediction) setPrediction(null);
      if (predictionError) setPredictionError(null);
      if (predictAbortControllerRef.current) {
          predictAbortControllerRef.current.abort();
          predictAbortControllerRef.current = null;
      }
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
      setContent(nextContent);
      prevLenRef.current = nextContent.length;
      historyTimeoutRef.current = setTimeout(() => {
          addToHistory(nextContent);
      }, 0);
      cursorRestoreRef.current = { start: cursorPos, end: cursorPos };
  };

  const replaceSelection = (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextContent = content.substring(0, start) + text + content.substring(end);
      applyContentUpdate(nextContent, start + text.length);
  };

  const updateClipboardBoard = (next: string[]) => {
      setClipboardBoard(next);
      StorageManager.setJSON('module7_clipboard_board', next);
  };

  const handleContextCopy = async () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      const text = textarea.value.substring(start, end);
      if (!text) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      try {
          await navigator.clipboard.writeText(text);
      } catch {
          alert('复制失败');
      } finally {
          setContextMenuState(prev => ({ ...prev, visible: false }));
      }
  };

  const handleContextCopyAll = async () => {
      if (!content) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      try {
          await navigator.clipboard.writeText(content);
      } catch {
          alert('复制失败');
      } finally {
          setContextMenuState(prev => ({ ...prev, visible: false }));
      }
  };

  const handleContextCut = async () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      const text = textarea.value.substring(start, end);
      try {
          await navigator.clipboard.writeText(text);
          replaceSelection('');
      } catch {
          alert('剪切失败');
      } finally {
          setContextMenuState(prev => ({ ...prev, visible: false }));
      }
  };

  const handleAddToClipboardBoard = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      const text = textarea.value.substring(start, end).trim();
      if (!text) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      const next = [text, ...clipboardBoard.filter(item => item !== text)].slice(0, 8);
      updateClipboardBoard(next);
      setContextMenuState(prev => ({ ...prev, visible: false }));
  };

  const handleContextPaste = async () => {
      let text = '';
      try {
          text = await navigator.clipboard.readText();
      } catch {
          alert('无法读取剪贴板');
          return;
      }
      if (!text) {
          setContextMenuState(prev => ({ ...prev, visible: false }));
          return;
      }
      replaceSelection(text);
      setContextMenuState(prev => ({ ...prev, visible: false }));
  };

  const handleToolbarAction = (action: string) => {
      if (!toolbarState.selectedText) return;
      
      let prompt = '';
      let autoSend = true;

      switch (action) {
          case 'polish':
              prompt = `请润色以下内容，使其更加生动流畅：\n\n"${toolbarState.selectedText}"`;
              break;
          case 'summarize':
              prompt = `请总结以下内容的核心要点：\n\n"${toolbarState.selectedText}"`;
              break;
          case 'continue':
              prompt = `请根据以下内容进行续写：\n\n"${toolbarState.selectedText}"`;
              break;
          case 'proofread':
              prompt = `请校对以下内容，指出错别字和语病并修改：\n\n"${toolbarState.selectedText}"`;
              break;
          case 'ask':
              prompt = `关于这段内容：\n\n"${toolbarState.selectedText}"\n\n`;
              autoSend = false;
              break;
      }
      
      setPendingPrompt(prompt, autoSend);
      setToolbarState(prev => ({ ...prev, show: false }));
  };

  useEffect(() => { contentRef.current = content; }, [content]);

  useEffect(() => {
      registerEditor('module7', {
          getContent: () => contentRef.current,
          setContent: (newContent) => {
              setContent(newContent);
              prevLenRef.current = newContent.length;
          },
          insertText: (text) => {
              const currentContent = contentRef.current;
              let newContent = currentContent;
              let newCursorPos = currentContent.length + text.length;

              if (textareaRef.current) {
                  const start = textareaRef.current.selectionStart;
                  const end = textareaRef.current.selectionEnd;
                  newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
                  newCursorPos = start + text.length;
              } else {
                  newContent = currentContent + text;
              }

              setContent(newContent);
              prevLenRef.current = newContent.length;
              
              setTimeout(() => {
                  if (textareaRef.current) {
                      textareaRef.current.focus();
                      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                  }
              }, 0);
          },
          getSelection: () => {
              if (textareaRef.current) return { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd };
              return { start: 0, end: 0 };
          },
          setSelection: (start, end) => {
              textareaRef.current?.setSelectionRange(start, end);
              textareaRef.current?.focus();
          },
          focus: () => textareaRef.current?.focus()
      });
      return () => unregisterEditor('module7');
  }, [registerEditor, unregisterEditor]);


  // Load context from previous modules on mount
  useEffect(() => {
    const loadData = async () => {
        const savedOutline = await StorageManager.getAsync(STORAGE_KEYS.MODULE_OUTPUT('module2')) || '';
        const savedDetailed = await StorageManager.getAsync(STORAGE_KEYS.MODULE_OUTPUT('module2_5')) || '';
        const savedModule1 = await StorageManager.getJSONAsync(STORAGE_KEYS.MODULE_INPUT('module1')) || {};
        
        // Try to extract characters/style if possible, or just use raw text
        setContext({
            outline: savedOutline,
            detailedOutline: savedDetailed,
            style: savedModule1.style || '',
            characters: savedModule1.elements || '' // Simple fallback
        });
        
        // Load saved content if any
        const savedDraft = await StorageManager.getAsync(STORAGE_KEYS.MODULE7_CONTENT);
        if (savedDraft) setContent(savedDraft);
        prevLenRef.current = savedDraft ? savedDraft.length : 0;

        // Load Bookshelf
        const savedBooks = await StorageManager.getJSONAsync(STORAGE_KEYS.NOVEL_PROJECTS);
        if (savedBooks && Array.isArray(savedBooks)) {
            setBooks(savedBooks);
        }
    };
    loadData();
  }, []);

  // Sync detailed outline changes back to the active chapter
  useEffect(() => {
      if (!activeFileId) return;

      const timer = setTimeout(() => {
          setBooks(prevBooks => {
              // Deep clone or just map? Map is cleaner for React.
              // But recursive map is complex.
              // Let's use recursive update.
              let changed = false;
              
              const updateRecursive = (nodes: NovelFile[]): NovelFile[] => {
                  return nodes.map(node => {
                      if (node.id === activeFileId) {
                          if (node.type === 'chapter' && node.summary !== context.detailedOutline) {
                              changed = true;
                              return { ...node, summary: context.detailedOutline };
                          }
                      }
                      if (node.children) {
                          const newChildren = updateRecursive(node.children);
                          if (newChildren !== node.children) {
                              return { ...node, children: newChildren };
                          }
                      }
                      return node;
                  });
              };

              const newBooks = updateRecursive(prevBooks);
              
              if (changed) {
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              }
              return prevBooks;
          });
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
  }, [context.detailedOutline, activeFileId]);

  const [isAutoUpdatingCharacters, setIsAutoUpdatingCharacters] = useState(false);

  // Auto-Update Characters Logic
  const handleAutoUpdateCharacters = async (chapterId: string, chapterContent: string, apiKey: string, baseUrl: string, model: string, isManual = false) => {
      if (isAutoUpdatingCharacters) {
          if (isManual) alert('正在后台处理中，请稍后...');
          return;
      }
      setIsAutoUpdatingCharacters(true);
      if (isManual) {
          // Visual feedback for manual trigger
          const toast = document.createElement('div');
          toast.id = 'ai-toast';
          toast.className = 'fixed top-4 right-4 bg-daiqing text-white px-4 py-2 rounded shadow-lg z-[9999] animate-pulse';
          toast.innerText = '正在提取角色信息，请稍候...';
          document.body.appendChild(toast);
      }
      
      try {
          // 1. Find the book this chapter belongs to
          let targetBookId: string | null = null;
          let chapterTitle = '';
          
          // Helper to find book and title
          // Use a ref-like approach or just trust current state. 
          // For safety, let's look at the books state available in scope.
          for (const book of books) {
              const findNode = (nodes: NovelFile[]): boolean => {
                  for (const node of nodes) {
                      if (node.id === chapterId) {
                          chapterTitle = node.title;
                          return true;
                      }
                      if (node.children && findNode(node.children)) return true;
                  }
                  return false;
              };
              
              if (findNode(book.children || [])) {
                  targetBookId = book.id;
                  break;
              }
          }

          if (!targetBookId) {
              console.warn("Could not find book for chapter", chapterId);
              if (isManual) alert('未找到当前章节所属的书籍');
              return;
          }

          // 2. Extract Characters
          const extractSystem = `你是一个严格的 JSON 数据提取工具。
请阅读小说章节，提取登场的主要角色及其最新剧情信息。
【严格约束】
1. 必须且只能输出一个合法的 JSON 数组。
2. 严禁输出 Markdown 标记（如 \`\`\`）、思考过程（<thinking>...</thinking>）或任何解释性文字。
3. 格式：[{"name": "角色名", "info": "最新状态或经历简述"}]
4. 若无重要角色更新，输出 []。`;
          const extractUser = `章节标题：${chapterTitle}
正文内容：
${chapterContent.slice(0, 4000)}`; // Slightly reduced context to speed up

          // Add a timeout race to prevent infinite hanging
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 60000));
          
          const extractResult = await Promise.race([
              generateAIContent(apiKey, extractSystem, extractUser, baseUrl, model),
              timeoutPromise
          ]) as string;
          
          let characters: { name: string; info: string }[] = [];
          try {
              // Enhanced Cleanup: Handle DeepSeek R1 <thinking> tags and markdown
              let jsonStr = extractResult.trim();
              
              // Remove <thinking> blocks if present
              jsonStr = jsonStr.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
              
              // Remove markdown code blocks
              jsonStr = jsonStr.replace(/```(?:json)?|```/g, '').trim();
              
              // Find the first '[' and last ']'
              const firstBracket = jsonStr.indexOf('[');
              const lastBracket = jsonStr.lastIndexOf(']');
              
              if (firstBracket !== -1 && lastBracket !== -1) {
                  jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
                  characters = JSON.parse(jsonStr);
              } else {
                  // Fallback: try to parse the whole string
                  if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
                       characters = JSON.parse(jsonStr);
                  }
              }
          } catch (e) {
              console.error("Failed to parse extracted characters", extractResult, e);
              if (isManual) alert('AI返回内容解析失败，可能是因为包含了非JSON内容。');
              return;
          }

          if (!Array.isArray(characters)) {
              if (isManual) alert('AI返回数据格式错误（非数组）');
              return;
          }
          
          if (characters.length === 0) {
              if (isManual) alert('未提取到需要更新的角色信息');
              return;
          }

          // 3. Prepare Updates (Batch)
          const updates: { name: string; content: string; isNew: boolean; docId?: string }[] = [];
          
          // Note: 'books' here is from the render scope. 
          const currentBook = books.find(b => b.id === targetBookId);
          if (!currentBook) {
              if (isManual) alert('书籍结构异常');
              return;
          }

          for (const charInfo of characters) {
              const existingDoc = (currentBook.children || []).find(c => c.type === 'doc' && c.docType === 'character' && c.title === charInfo.name);
              
              let existingContent = '';
              let isNew = true;
              let docId = '';

              if (existingDoc) {
                  isNew = false;
                  docId = existingDoc.id;
                  existingContent = existingDoc.content || '';
                  if (!existingContent) {
                      existingContent = await StorageManager.getAsync(`chapter_content_${docId}`) || '';
                  }
              }

              const updateSystem = `你是一个角色设定整理助手。请根据【旧设定】和【新剧情信息】，整合并重写角色设定。
要求：
1. 保留原有关键设定（外貌、性格、背景）。
2. 融入新剧情带来的变化（能力提升、关系变化、重要经历）。
3. 去除过时或矛盾的信息。
4. 保持条理清晰，分点描述。
直接输出整理后的设定内容。`;
              const updateUser = `角色名：${charInfo.name}
旧设定：
${existingContent || '（新建角色）'}

新剧情信息（来自${chapterTitle}）：
${charInfo.info}`;

              const updatedProfile = await generateAIContent(apiKey, updateSystem, updateUser, baseUrl, model);
              if (updatedProfile) {
                  updates.push({
                      name: charInfo.name,
                      content: updatedProfile,
                      isNew,
                      docId
                  });
              }
          }

          // 4. Apply Updates in One Go
          if (updates.length > 0) {
              setBooks(prevBooks => {
                  const newBooks = [...prevBooks];
                  const bIdx = newBooks.findIndex(b => b.id === targetBookId);
                  if (bIdx === -1) return prevBooks;

                  let book = newBooks[bIdx];
                  let newChildren = [...(book.children || [])];

                  for (const update of updates) {
                      if (update.isNew) {
                          const newDocId = generateId();
                          const newDoc: NovelFile = {
                              id: newDocId,
                              title: update.name,
                              type: 'doc',
                              docType: 'character',
                              content: update.content,
                              isOpen: true
                          };
                          StorageManager.set(`chapter_content_${newDocId}`, update.content);
                          newChildren = [newDoc, ...newChildren];
                      } else {
                          newChildren = newChildren.map(c => {
                              if (c.id === update.docId) {
                                  return { ...c, content: update.content };
                              }
                              return c;
                          });
                          if (update.docId) {
                              StorageManager.set(`chapter_content_${update.docId}`, update.content);
                          }
                      }
                  }
                  
                  newBooks[bIdx] = { ...book, children: newChildren };
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });

              // Force expand the settings folder for this book
              setCollapsedBookSettings(prev => ({ ...prev, [targetBookId!]: false }));
              
              if (isManual) {
                  alert(`成功更新了 ${updates.length} 个角色：\n${updates.map(u => u.name).join(', ')}`);
              }
          } else {
              if (isManual) alert('未能生成有效的人设内容');
          }

      } catch (e: any) {
          const errorMessage = e.message || String(e);
          if (e.name === 'AbortError' || errorMessage.includes('BodyStreamBuffer was aborted') || errorMessage.includes('The user aborted a request')) {
              return;
          }
          console.error("Auto-update characters failed", e);
          if (isManual) alert('执行出错: ' + errorMessage);
      } finally {
          setIsAutoUpdatingCharacters(false);
          if (isManual) {
              const toast = document.getElementById('ai-toast');
              if (toast) toast.remove();
          }
      }
  };

  useEffect(() => {
      const timer = setTimeout(async () => {
          if (!activeFileId || !content || content.length < 100) return;

          // Find the chapter and book
          let targetChapter: NovelFile | null = null;
          let targetBook: NovelFile | null = null;
          
          const findRecursive = (nodes: NovelFile[], parentBook: NovelFile | null = null): boolean => {
              for (const node of nodes) {
                  if (node.type === 'book') {
                      if (findRecursive(node.children || [], node)) return true;
                  } else if (node.id === activeFileId) {
                      if (node.type === 'chapter') {
                          targetChapter = node;
                          targetBook = parentBook;
                      }
                      return true;
                  } else if (node.children) {
                      if (findRecursive(node.children, parentBook)) return true;
                  }
              }
              return false;
          };
          
          findRecursive(books);

          if (!targetChapter || !targetBook) return;

          // Config check
          const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || 'https://api.siliconflow.cn/v1';
          const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
          
          if (!apiKey) return;

          // Call the extraction
          await handleAutoUpdateCharacters(activeFileId, content, apiKey, baseUrl, model);

      }, 8000); // 8 seconds debounce

      return () => clearTimeout(timer);
  }, [content, activeFileId]);

  useEffect(() => {
      const timer = setTimeout(async () => {
          if (!activeFileId || !content || content.length < 100) return;

          // Find the chapter and book
          let targetChapter: NovelFile | null = null;
          let targetBook: NovelFile | null = null;
          
          const findRecursive = (nodes: NovelFile[], parentBook: NovelFile | null = null): boolean => {
              for (const node of nodes) {
                  if (node.type === 'book') {
                      if (findRecursive(node.children || [], node)) return true;
                  } else if (node.id === activeFileId) {
                      if (node.type === 'chapter') {
                          targetChapter = node;
                          targetBook = parentBook;
                      }
                      return true;
                  } else if (node.children) {
                      if (findRecursive(node.children, parentBook)) return true;
                  }
              }
              return false;
          };
          
          findRecursive(books);

          if (!targetChapter || !targetBook) return;

          // Check if there is a "next chapter" to decide if we should summarize
          let isLatest = true;
          let foundCurrent = false;
          
          const checkRecursive = (nodes: NovelFile[]): boolean => {
              for (const node of nodes) {
                  if (node.type === 'chapter') {
                      if (foundCurrent) {
                          isLatest = false;
                          return true; // Found next chapter, stop
                      }
                      if (node.id === activeFileId) {
                          foundCurrent = true;
                      }
                  }
                  if (node.children) {
                      if (checkRecursive(node.children)) return true;
                  }
              }
              return false;
          };
          
          checkRecursive(targetBook.children || []);

          if (!isLatest) return; // Skip if not the latest chapter

          // Perform Summarization
          try {
              const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
              const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || 'https://api.siliconflow.cn/v1';
              const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
              
              if (!apiKey) return;

              const systemPrompt = `你是一个网文细纲助手。请根据用户提供的章节正文，总结出一份约 200 字的【章节细纲】。
包含：核心冲突、剧情推进、伏笔（如有）。直接输出细纲内容，不要废话。`;
              const userPrompt = `章节标题：${targetChapter.title}
正文内容：
${content.slice(0, 3000)}...`;

              const summary = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
              
              if (summary) {
                  setBooks(prevBooks => {
                      const newBooks = [...prevBooks];
                      const updateSummary = (nodes: NovelFile[]): boolean => {
                          for (const node of nodes) {
                              if (node.id === activeFileId) {
                                  node.summary = summary;
                                  return true;
                              }
                              if (node.children && updateSummary(node.children)) return true;
                          }
                          return false;
                      };
                      updateSummary(newBooks);
                      StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                      return newBooks;
                  });

                  // --- Auto-Update Characters Logic ---
                  // Trigger character update after successful summary (implies stable content)
                  // Moved to independent useEffect
              }
          } catch (e) {
              console.error("Auto-summarize failed", e);
          }

      }, 5000); // 5 seconds debounce

      return () => clearTimeout(timer);
  }, [content, activeFileId]);

  // Save content on change (Auto-save with debounce)
  useEffect(() => {
    // If content changes, mark as unsaved
    if (content) {
        setSaveStatus('unsaved');
    }

    const timer = setTimeout(() => {
        setSaveStatus('saving');
        // Use async save but don't await here to avoid blocking
        saveCurrentContent(activeFileId, content);
        
        // Artificial delay for better UX (to see "Saving...")
        setTimeout(() => {
            setSaveStatus('saved');
        }, 500);
    }, 200); // 0.2 second debounce for instant response

    return () => clearTimeout(timer);
  }, [content, activeFileId]);
  
  // Save immediately on blur (optional, good for safety)
  const handleBlur = () => {
      if (saveStatus === 'unsaved') {
          setSaveStatus('saving');
          saveCurrentContent(activeFileId, content);
          setTimeout(() => setSaveStatus('saved'), 500);
      }
  };

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

  const parseTextToStructure = (text: string) => {
      // Improved regex to better capture Chinese number formats and edge cases
      const fullRegex = /(?:^\s*|\n\s*)((?:第[0-9零一二三四五六七八九十百千万]+[卷部]|Volume\s*\d+|[Vv]ol\.\d+).*)|(?:^\s*|\n\s*)((?:第[0-9零一二三四五六七八九十百千万]+[章回]|Chapter\s*\d+|[0-9]+\.|序章|楔子|尾声|番外).*)/g;
      
      const nodes: { type: 'volume' | 'chapter'; title: string; index: number }[] = [];
      fullRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      
      // First pass: identify all volume and chapter headers
      while ((match = fullRegex.exec(text)) !== null) {
          const fullMatch = match[0];
          const volumeTitle = match[1];
          const chapterTitle = match[2];
          // Determine the actual start index of the title content (skipping leading newlines/spaces if needed)
          // But match.index is the start of the match (which includes leading whitespace).
          // We want to slice from here.
          const index = match.index; 
          
          if (volumeTitle) {
              nodes.push({ type: 'volume', title: volumeTitle.trim(), index });
          } else if (chapterTitle) {
              nodes.push({ type: 'chapter', title: chapterTitle.trim(), index });
          }
      }
      
      const volumes: NovelFile[] = [];
      const chaptersWithoutVolume: NovelFile[] = [];
      let currentVolume: NovelFile | null = null;
      
      // If no nodes found, return the whole text as one chapter
      if (nodes.length === 0) {
          chaptersWithoutVolume.push({
              id: generateId(),
              title: '正文',
              type: 'chapter',
              content: text
          });
          return { volumes, chaptersWithoutVolume };
      }
      
      // Second pass: slice content based on indices
      for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const nextIndex = i + 1 < nodes.length ? nodes[i + 1].index : text.length;
          
          // The content is from the end of current title line to the start of next node?
          // Or includes the title line? Usually, the node content should be the body text.
          // But our 'content' field for chapters usually includes the body. 
          // However, for display, we might want to strip the title if it's redundant.
          // Let's keep it simple: Content = Everything from this header start to next header start.
          // Wait, 'content' in our data model usually implies the *text body*. 
          // But if we store the full slice, it includes the title line.
          // Let's try to strip the title line from the content for cleaner editing.
          
          const rawSlice = text.slice(node.index, nextIndex);
          // Remove the first line (title) from content
          const firstLineEnd = rawSlice.indexOf('\n');
          let contentBody = '';
          if (firstLineEnd !== -1) {
              contentBody = rawSlice.slice(firstLineEnd + 1).trim(); // Remove title line
          } else {
              contentBody = ''; // Only title exists
          }
          
          // If it's a volume, we don't store content, just structure.
          if (node.type === 'volume') {
              currentVolume = {
                  id: generateId(),
                  title: node.title,
                  type: 'volume',
                  children: [],
                  isOpen: true
              };
              volumes.push(currentVolume);
          } else {
              const chapter: NovelFile = {
                  id: generateId(),
                  title: node.title,
                  type: 'chapter',
                  content: contentBody || rawSlice // Fallback to raw if strip failed
              };
              
              if (currentVolume) {
                  currentVolume.children = currentVolume.children || [];
                  currentVolume.children.push(chapter);
              } else {
                  chaptersWithoutVolume.push(chapter);
              }
          }
      }
      
      // Handle "Preamble" text (text before the first node)
      if (nodes.length > 0 && nodes[0].index > 0) {
          const preambleText = text.slice(0, nodes[0].index).trim();
          if (preambleText) {
              const preambleChapter: NovelFile = {
                  id: generateId(),
                  title: '序言/前文',
                  type: 'chapter',
                  content: preambleText
              };
              chaptersWithoutVolume.unshift(preambleChapter);
          }
      }

      return { volumes, chaptersWithoutVolume };
  };

  const handleImportChapters = (bookId: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.text';
      input.multiple = true;
      input.onchange = async () => {
          const files = Array.from(input.files || []);
          if (files.length === 0) return;
          const readFile = (file: File) =>
              new Promise<{ name: string; text: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({ name: file.name.replace(/\.[^.]+$/, ''), text: String(reader.result || '') });
                  reader.onerror = reject;
                  reader.readAsText(file, 'utf-8');
              });
          const results: { name: string; text: string }[] = [];
          for (const f of files) {
              try {
                  results.push(await readFile(f));
              } catch {}
          }
          if (results.length === 0) return;
          let firstChapterId: string | null = null;
          let firstChapterContent: string | null = null;
          setBooks(prev => {
              const newBooks = prev.map(book => {
                  if (book.id !== bookId) return book;
                  let newChildren = [...(book.children || [])];
                  for (const res of results) {
                      const { volumes, chaptersWithoutVolume } = parseTextToStructure(res.text);
                      if (volumes.length > 0) {
                          if (chaptersWithoutVolume.length > 0) {
                              const preVolume: NovelFile = {
                                  id: generateId(),
                                  title: '序章/前言',
                                  type: 'volume',
                                  children: chaptersWithoutVolume,
                                  isOpen: true
                              };
                              newChildren = [...newChildren, preVolume, ...volumes];
                              if (!firstChapterId && chaptersWithoutVolume[0]) {
                                  firstChapterId = chaptersWithoutVolume[0].id;
                                  if (typeof chaptersWithoutVolume[0].content === 'string') firstChapterContent = chaptersWithoutVolume[0].content;
                              }
                          } else {
                              newChildren = [...newChildren, ...volumes];
                          }
                          
                          if (!firstChapterId) {
                              const firstVol = volumes[0];
                              const firstChap = (firstVol.children || [])[0];
                              if (firstChap) firstChapterId = firstChap.id;
                              if (firstChap && typeof firstChap.content === 'string') firstChapterContent = firstChap.content;
                          }
                      } else {
                          const vol: NovelFile = {
                              id: generateId(),
                              title: `${res.name}`,
                              type: 'volume',
                              children: chaptersWithoutVolume,
                              isOpen: true
                          };
                          newChildren.push(vol);
                          if (!firstChapterId && chaptersWithoutVolume[0]) {
                              firstChapterId = chaptersWithoutVolume[0].id;
                              if (chaptersWithoutVolume[0] && typeof chaptersWithoutVolume[0].content === 'string') firstChapterContent = chaptersWithoutVolume[0].content || '';
                          }
                      }
                  }
                  return { ...book, isOpen: true, children: newChildren };
              });
              StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
              return newBooks;
          });
          setTimeout(() => {
              if (firstChapterId) {
                  setActiveFileId(firstChapterId);
                  setContent(firstChapterContent || '');
              }
          }, 0);
      };
      input.click();
  };

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

  const handleAddDoc = (bookId: string, docType: NovelFile['docType'], defaultTitle: string) => {
      setModalConfig({
          isOpen: true,
          type: 'input',
          title: `新建${defaultTitle}`,
          message: `请输入${defaultTitle}名称：`,
          defaultValue: defaultTitle,
          onConfirm: (title) => {
              if (!title) title = defaultTitle;
              let newDocId = '';
              
              setBooks(prev => {
                  const newBooks = prev.map(book => {
                      if (book.id === bookId) {
                          const doc: NovelFile = {
                              id: generateId(),
                              title: title || defaultTitle,
                              type: 'doc' as const,
                              docType: docType,
                              content: ''
                          };
                          newDocId = doc.id;
                          return {
                              ...book,
                              isOpen: true,
                              children: [
                                  doc,
                                  ...(book.children || [])
                              ]
                          };
                      }
                      return book;
                  });
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });

              setTimeout(() => {
                  if (newDocId) {
                      setActiveFileId(newDocId);
                      setContent('');
                  }
              }, 0);
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
                                      const chapterCount = (volume.children || []).filter(c => c.type === 'chapter').length;
                                      const chapter: NovelFile = {
                                          id: generateId(),
                                          title: title,
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

  const handleSelectFile = async (file: NovelFile) => {
      if (saveStatus === 'unsaved') {
          await saveCurrentContent(activeFileId, content);
          setSaveStatus('saved');
      }

      if (file.type === 'chapter' || file.type === 'doc') {
          setActiveFileId(file.id);
          
          const individualContent = await StorageManager.getAsync(`chapter_content_${file.id}`);
          const finalContent = individualContent !== null ? individualContent : (file.content || '');
          
          setContent(finalContent);
          
          if (file.type === 'chapter' && file.summary) {
              setContext(prev => ({
                  ...prev,
                  detailedOutline: file.summary || ''
              }));
          } else if (file.type === 'chapter') {
              setContext(prev => ({
                  ...prev,
                  detailedOutline: ''
              }));
          }
      } else {
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
          setBooks(prev => {
              const newBooks = toggleOpen(prev);
              saveBookshelfStructure(newBooks);
              return newBooks;
          });
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

  useEffect(() => {
    const timer = setTimeout(() => {
        const fullRegex = /(?:^\s*|\n\s*)((?:第[0-9零一二三四五六七八九十百千万]+[卷部]|Volume\s*\d+).*)|(?:^\s*|\n\s*)((?:第[0-9零一二三四五六七八九十百千万]+[章回]|Chapter\s*\d+|[0-9]+\.|序章|楔子|尾声).*)/g;
        
        let match;
        fullRegex.lastIndex = 0;
        
        const newNodes: ChapterNode[] = [];
        let lastVolumeNode: ChapterNode | null = null;

        while ((match = fullRegex.exec(content)) !== null) {
            const fullMatch = match[0];
            const volumeTitle = match[1];
            const chapterTitle = match[2];
            const index = match.index + (fullMatch.startsWith('\n') ? 1 : 0);
            
            if (volumeTitle) {
                const node: ChapterNode = {
                    title: volumeTitle.trim(),
                    index: index,
                    type: 'volume',
                    children: []
                };
                newNodes.push(node);
                lastVolumeNode = node;
            } else if (chapterTitle) {
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
    }, 500);

    return () => clearTimeout(timer);
  }, [content]);

  const scrollToChapter = (index: number) => {
      if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(index, index);
          
          const textBefore = content.substring(0, index);
          const lineNum = textBefore.split('\n').length;
          const lineHeight = 32;
          const scrollTop = (lineNum - 1) * lineHeight;
          
          textareaRef.current.scrollTop = scrollTop;
      }
  };

  const maybePredict = useCallback(async (currentContent: string) => {
      if (!editorConfig.predictEnabled || isPredicting || currentContent.length < 10) return;
      
      if (textareaRef.current) {
          const { selectionStart, value } = textareaRef.current;
          if (selectionStart < value.trimEnd().length) return;
      }

      if (currentContent === lastPredictContentRef.current) return;
      
      if (predictAbortControllerRef.current) {
          predictAbortControllerRef.current.abort();
      }
      
      setIsPredicting(true);
      setPredictionError(null);
      
      predictAbortControllerRef.current = new AbortController();
      const signal = predictAbortControllerRef.current.signal;
      
      try {
          const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || 'https://api.siliconflow.cn/v1';
          const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
          
          if (!apiKey) {
              setPredictionError('未配置 API Key');
              return;
          }

          const context = currentContent.slice(-1000);
          
          const systemPrompt = `你是一个网文写作助手。请根据用户输入的上文，续写接下来的内容。
要求：
1. 风格与上文保持一致。
2. 续写内容必须严格控制在 ${editorConfig.predictLength} 字以内，绝对不能超标。
3. 直接输出续写内容，不要包含任何解释或对话。`;

          const maxTokens = Math.ceil(editorConfig.predictLength * 2.5); 

          const predictionText = await generateAIContent(apiKey, systemPrompt, context, baseUrl, model, maxTokens, signal);
          
          if (contentRef.current !== currentContent) {
              return;
          }

          if (predictionText && textareaRef.current) {
              setPrediction({
                  text: predictionText,
                  start: textareaRef.current.selectionStart
              });
              lastPredictContentRef.current = currentContent;
          }
      } catch (e: any) {
          const errorMessage = e.message || String(e);
          if (e.name === 'AbortError' || errorMessage.includes('BodyStreamBuffer was aborted') || errorMessage.includes('The user aborted a request')) {
              setIsPredicting(false);
              return;
          }
          console.error('Prediction failed', e);
          setPredictionError(errorMessage || '预测失败');
      } finally {
          setIsPredicting(false);
          predictAbortControllerRef.current = null;
      }
  }, [editorConfig, isPredicting]);

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    handleContentChange(e as any);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    
    if (isComposingRef.current) {
        setContent(newText);
        return;
    }

    if (prediction) setPrediction(null);
    if (predictionError) setPredictionError(null);
    
    if (predictAbortControllerRef.current) {
        predictAbortControllerRef.current.abort();
        predictAbortControllerRef.current = null;
    }

    prevLenRef.current = newText.length;
    setContent(newText);
    
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
        addToHistory(newText);
    }, 800);

    if (editorConfig.predictEnabled) {
        if (predictTimerRef.current) clearTimeout(predictTimerRef.current);
        predictTimerRef.current = setTimeout(() => {
            maybePredict(newText);
        }, editorConfig.predictThreshold);
    }
  };

  const handleGenerateSummary = async (e: React.MouseEvent, chapter: NovelFile) => {
      e.stopPropagation();
      
      if (chapter.type === 'book') {
          setGeneratingSummaryId(chapter.id);
          const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || 'https://api.siliconflow.cn/v1';
          const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
          
          if (!apiKey) {
              setGeneratingSummaryId(null);
              return alert('请先配置 API Key');
          }
          
          let contentToScan = content;
          let chapterIdToScan = activeFileId || '';
          
          let isActiveInBook = false;
          const checkInBook = (nodes: NovelFile[]): boolean => {
              for (const n of nodes) {
                  if (n.id === activeFileId) return true;
                  if (n.children && checkInBook(n.children)) return true;
              }
              return false;
          };
          isActiveInBook = checkInBook(chapter.children || []);
          
          if (!isActiveInBook || !contentToScan || contentToScan.length < 50) {
              const findFirstChapter = (nodes: NovelFile[]): NovelFile | null => {
                  for (const n of nodes) {
                      if (n.type === 'chapter') return n;
                      if (n.children) {
                          const res = findFirstChapter(n.children);
                          if (res) return res;
                      }
                  }
                  return null;
              };
              const firstChap = findFirstChapter(chapter.children || []);
              if (firstChap) {
                  chapterIdToScan = firstChap.id;
                  const saved = await StorageManager.getAsync(`chapter_content_${firstChap.id}`);
                  contentToScan = saved || firstChap.content || '';
              }
          }

          if (chapterIdToScan && contentToScan && contentToScan.length > 50) {
               await handleAutoUpdateCharacters(chapterIdToScan, contentToScan, apiKey, baseUrl, model, true);
          } else {
               alert('未找到有效的章节内容进行扫描（请先撰写章节正文）');
          }
          setGeneratingSummaryId(null);
          return;
      }

      if (!chapter.content || chapter.content.length < 50) {
          setModalConfig({
              isOpen: true,
              type: 'confirm',
              title: '无法生成',
              message: '章节内容过少，无法生成细纲。请先撰写正文。',
              onConfirm: () => {}
          });
          return;
      }

      setGeneratingSummaryId(chapter.id);
      
      try {
          const apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          const baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || 'https://api.siliconflow.cn/v1';
          const model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-V3';
          
          if (!apiKey) {
               setModalConfig({
                  isOpen: true,
                  type: 'confirm',
                  title: '缺少配置',
                  message: '请先在设置中配置 API Key。',
                  onConfirm: () => {}
              });
              return;
          }

          const systemPrompt = `你是一个网文细纲助手。请根据用户提供的章节正文，总结出一份约 200 字的【章节细纲】。
包含：核心冲突、剧情推进、伏笔（如有）。直接输出细纲内容，不要废话。`;
          const userPrompt = `章节标题：${chapter.title}
正文内容：
${chapter.content.slice(0, 3000)}...`;

          const summary = await generateAIContent(apiKey, systemPrompt, userPrompt, baseUrl, model);
          
          if (summary) {
              setBooks(prevBooks => {
                  const newBooks = [...prevBooks];
                  const updateSummary = (nodes: NovelFile[]): boolean => {
                      for (const node of nodes) {
                          if (node.id === chapter.id) {
                              node.summary = summary;
                              if (activeFileId === chapter.id) {
                                  setContext(prev => ({ ...prev, detailedOutline: summary }));
                              }
                              return true;
                          }
                          if (node.children && updateSummary(node.children)) return true;
                      }
                      return false;
                  };
                  updateSummary(newBooks);
                  StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                  return newBooks;
              });
          }
      } catch (e) {
          console.error("Manual summarize failed", e);
      } finally {
          setGeneratingSummaryId(null);
      }
  };

  return (
    <div className="flex h-screen bg-rice-paper overflow-hidden font-serif text-ink relative">
       <div 
         ref={sidebarRef}
         className={`bg-rice-paper sidebar-shell text-ink border-r border-ink/10 h-full flex flex-col relative transition-[width] duration-0 ease-linear ${!isResizing && 'transition-all duration-300'}
            absolute z-20 md:relative md:z-auto shadow-2xl md:shadow-none
         `}
         style={{ width: isNavOpen ? sidebarWidth : 0, overflow: isNavOpen ? 'visible' : 'hidden' }}
       >
          
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-daiqing/20 active:bg-daiqing/50 z-50 transition-colors"
            onMouseDown={startResizing}
          />
          
          <div className="border-b border-ink/10 bg-rice-texture sidebar-header flex items-stretch">
             <div className="flex-1 flex">
                 <button
                     onClick={() => setActiveTab('books')}
                     className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                         activeTab === 'books' 
                           ? 'bg-rice-paper sidebar-active text-daiqing border-t-2 border-daiqing' 
                           : 'text-gray-500 hover:bg-black/5'
                     }`}
                 >
                     <Book className="w-4 h-4" /> 书架
                 </button>
                 <button
                     onClick={() => setActiveTab('outline')}
                     className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                         activeTab === 'outline' 
                           ? 'bg-rice-paper sidebar-active text-daiqing border-t-2 border-daiqing' 
                           : 'text-gray-500 hover:bg-black/5'
                     }`}
                 >
                     <List className="w-4 h-4" /> 大纲
                 </button>
             </div>
             <button
                onClick={() => setIsNavOpen(false)}
                className="px-3 border-l border-ink/10 flex items-center justify-center text-gray-400 hover:text-daiqing hover:bg-daiqing/5 transition-colors"
                title="收起侧边栏"
             >
                <ChevronLeft className="w-4 h-4" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
             {activeTab === 'books' && (
                 <div className="space-y-3 p-1">
                     <div className="flex gap-2">
                        <button 
                           onClick={handleAddBook}
                           className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-dashed border-ink/20 rounded-lg text-gray-500 hover:border-daiqing hover:text-daiqing hover:bg-daiqing/5 transition-all text-sm font-medium"
                        >
                            <FolderPlus className="w-4 h-4" /> 新建书辑
                        </button>
                        <button 
                           onClick={handleImportBook}
                           className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-dashed border-ink/20 rounded-lg text-gray-500 hover:border-daiqing hover:text-daiqing hover:bg-daiqing/5 transition-all text-sm font-medium"
                        >
                            <Upload className="w-4 h-4" /> 导入书籍
                        </button>
                     </div>
                     
                     {books.map((book) => (
                         <div key={book.id} className="space-y-1">
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
                                    <div className="relative">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenAddMenuId(openAddMenuId === book.id ? null : book.id);
                                            }}
                                            className={`p-1 rounded transition-colors ${openAddMenuId === book.id ? 'bg-black/10 text-daiqing' : 'text-gray-500 hover:bg-black/10'}`}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        
                                        {openAddMenuId === book.id && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); }} />
                                                <div className="absolute right-0 top-full mt-1 w-28 bg-rice-paper border border-ink/10 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddVolume(book.id); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <FolderPlus className="w-3 h-3" /> 分卷
                                                    </button>
                                                    <div className="border-t border-ink/5 my-1"></div>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddDoc(book.id, 'summary', '概要'); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <FileText className="w-3 h-3" /> 概要
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddDoc(book.id, 'character', '人设'); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <User className="w-3 h-3" /> 人设
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddDoc(book.id, 'world', '世界观'); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <Book className="w-3 h-3" /> 世界观
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddDoc(book.id, 'force', '势力'); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <Users className="w-3 h-3" /> 势力
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddDoc(book.id, 'style', '文风'); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <Wand2 className="w-3 h-3" /> 文风
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleAddDoc(book.id, 'goldfinger', '金手指'); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <Sparkles className="w-3 h-3" /> 金手指
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleGenerateSummary(e, book as any); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <RefreshCw className="w-3 h-3" /> 刷新全书人设
                                                    </button>
                                                    <div className="border-t border-ink/5 my-1"></div>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleImportChapters(book.id); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <Upload className="w-3 h-3" /> 导入章节
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenAddMenuId(null); handleImportDocs(book.id); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper flex items-center gap-2">
                                                        <FilePlus className="w-3 h-3" /> 导入设定
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleRenameNode(book.id, book.title); }} className="p-1 hover:bg-black/10 rounded text-daiqing" title="重命名"><Edit className="w-3 h-3" /></button>
                                    <button onClick={(e) => handleDeleteNode(e, book.id)} title="删除" className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                                </div>
                             </div>

                             {(() => {
                                const docs = book.children?.filter(c => c.type === 'doc') || [];
                                const characterDocs = docs.filter(doc => doc.docType === 'character');
                                const otherDocs = docs.filter(doc => doc.docType !== 'character' && doc.docType !== 'requirement');
                                 if (docs.length === 0 || !book.isOpen) return null;
                                 const isCollapsed = collapsedBookSettings[book.id];

                                 return (
                                     <div className="ml-3 space-y-1 border-l border-ink/10 pl-3">
                                         <div 
                                             className="group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors cursor-pointer"
                                             onClick={() => setCollapsedBookSettings(prev => ({...prev, [book.id]: !prev[book.id]}))}
                                         >
                                             <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                 {isCollapsed ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                                                 <Folder className="w-4 h-4 text-indigo-400" />
                                                <span>设定集</span>
                                             </div>
                                         </div>

                                        {!isCollapsed && (
                                            <>
                                                {characterDocs.length > 0 && (
                                                    <div className="ml-3 space-y-1 border-l border-ink/10 pl-3">
                                                        <div 
                                                            className="group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCollapsedCategories(prev => ({...prev, [`${book.id}_chars`]: !prev[`${book.id}_chars`]}));
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                                                {collapsedCategories[`${book.id}_chars`] ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                                                                <Folder className="w-3 h-3 text-indigo-400" />
                                                                <span>人设 ({characterDocs.length})</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {!collapsedCategories[`${book.id}_chars`] && (
                                                            <>
                                                                <div className="px-2 pb-1" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="relative flex items-center">
                                                                        <Search className="absolute left-2 w-3 h-3 text-gray-400" />
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="搜索角色..." 
                                                                            value={getBookSearchQuery(book.id)}
                                                                            onChange={(e) => setBookSearchQuery(book.id, e.target.value)}
                                                                            className="w-full pl-6 pr-2 py-1 text-xs border border-ink/10 rounded bg-white/50 focus:bg-white focus:outline-none focus:border-daiqing/30 transition-all"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {characterDocs
                                                                    .filter(doc => !getBookSearchQuery(book.id) || doc.title.toLowerCase().includes(getBookSearchQuery(book.id).toLowerCase()))
                                                                    .map((doc) => (
                                                                    <div key={doc.id} className="ml-3 space-y-1 border-l border-ink/10 pl-3">
                                                                        <div className={`group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors ${activeFileId === doc.id ? 'bg-daiqing/10 text-daiqing' : 'text-gray-600'}`}>
                                                                            <button 
                                                                                onClick={() => handleSelectFile(doc)}
                                                                                className="flex-1 text-left flex items-center gap-2 text-xs truncate"
                                                                            >
                                                                                <User className="w-3 h-3 opacity-70" />
                                                                                {doc.title}
                                                                            </button>
                                                                            <div className="hidden group-hover:flex items-center gap-1">
                                                                                <button onClick={(e) => { e.stopPropagation(); handleRenameNode(doc.id, doc.title); }} className="p-1 hover:bg-black/10 rounded text-daiqing"><Edit className="w-3 h-3" /></button>
                                                                                <button onClick={(e) => handleDeleteNode(e, doc.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {characterDocs.filter(doc => !getBookSearchQuery(book.id) || doc.title.toLowerCase().includes(getBookSearchQuery(book.id).toLowerCase())).length === 0 && getBookSearchQuery(book.id) && (
                                                                    <div className="text-xs text-gray-400 px-2 py-1 ml-3">无匹配角色</div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {otherDocs.map((doc) => (
                                                    <div key={doc.id} className="ml-3 space-y-1 border-l border-ink/10 pl-3">
                                                        <div className={`group flex items-center justify-between hover:bg-black/5 rounded px-2 py-1.5 transition-colors ${activeFileId === doc.id ? 'bg-daiqing/10 text-daiqing' : 'text-gray-600'}`}>
                                                           <button 
                                                               onClick={() => handleSelectFile(doc)}
                                                               className="flex-1 text-left flex items-center gap-2 text-xs truncate"
                                                           >
                                                               {doc.docType === 'world' && <Book className="w-3 h-3 opacity-70" />}
                                                               {doc.docType === 'force' && <Users className="w-3 h-3 opacity-70" />}
                                                               {doc.docType === 'style' && <Wand2 className="w-3 h-3 opacity-70" />}
                                                               {doc.docType === 'goldfinger' && <Sparkles className="w-3 h-3 opacity-70" />}
                                                               {doc.docType === 'summary' && <FileText className="w-3 h-3 opacity-70" />}
                                                               {!doc.docType && <FileText className="w-3 h-3 opacity-70" />}
                                                               {doc.title}
                                                           </button>
                                                           <div className="hidden group-hover:flex items-center gap-1">
                                                               <button onClick={(e) => { e.stopPropagation(); handleRenameNode(doc.id, doc.title); }} className="p-1 hover:bg-black/10 rounded text-daiqing"><Edit className="w-3 h-3" /></button>
                                                               <button onClick={(e) => handleDeleteNode(e, doc.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                                                           </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                     </div>
                                 );
                             })()}

                             {book.isOpen && book.children?.filter(c => c.type === 'volume').map((volume) => (
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

             {activeTab === 'outline' && (
                 <div className="space-y-3 p-1">
                    {books.map((book) => (
                         <div key={book.id} className="space-y-1">
                             <button 
                                onClick={() => handleSelectFile(book)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 font-bold text-ink text-sm hover:bg-black/5 rounded transition-colors text-left"
                             >
                                {book.isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                <Book className="w-4 h-4 text-daiqing" />
                                {book.title}
                             </button>

                             {book.isOpen && book.children?.filter(c => c.type === 'volume').map((volume) => (
                                 <div key={volume.id} className="ml-3 space-y-1 border-l border-ink/10 pl-3">
                                     <button 
                                        onClick={() => handleSelectFile(volume)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 font-medium text-gray-700 text-sm hover:bg-black/5 rounded transition-colors text-left"
                                     >
                                         {volume.isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                         <Folder className="w-4 h-4 text-amber-600/70" />
                                         {volume.title}
                                     </button>

                                     {volume.isOpen && volume.children?.filter(c => c.type === 'chapter').map((chapter, index) => (
                                         <div key={chapter.id} className="ml-3 border-l border-ink/10 pl-3">
                                             <div className="flex items-center gap-1 group/item w-full hover:bg-black/5 rounded px-2 py-1.5 transition-colors">
                                                <button 
                                                     onClick={() => {
                                                         setModalConfig({
                                                             isOpen: true,
                                                             type: 'textarea',
                                                             title: `${chapter.title} - 细纲`,
                                                             message: '您可以在下方编辑本章细纲：',
                                                             defaultValue: chapter.summary || '', 
                                                             onConfirm: (newSummary) => {
                                                                 if (newSummary === undefined) return;
                                                                 setBooks(prevBooks => {
                                                                      const newBooks = [...prevBooks];
                                                                      const updateSummary = (nodes: NovelFile[]): boolean => {
                                                                          for (const node of nodes) {
                                                                              if (node.id === chapter.id) {
                                                                                  node.summary = newSummary;
                                                                                  if (activeFileId === chapter.id) {
                                                                                      setContext(prev => ({ ...prev, detailedOutline: newSummary }));
                                                                                  }
                                                                                  return true;
                                                                              }
                                                                              if (node.children && updateSummary(node.children)) return true;
                                                                          }
                                                                          return false;
                                                                      };
                                                                      updateSummary(newBooks);
                                                                      StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
                                                                      return newBooks;
                                                                  });
                                                             }
                                                         });
                                                     }}
                                                     className="flex-1 text-left flex items-center gap-2 text-xs text-gray-600"
                                                 >
                                                    <FileText className="w-3 h-3 flex-shrink-0 opacity-70 text-indigo-500" />
                                                    <span>{chapter.title} 细纲</span>
                                                 </button>
                                                <button
                                                    onClick={(e) => handleGenerateSummary(e, chapter)}
                                                    disabled={generatingSummaryId === chapter.id}
                                                    className={`p-1 rounded hover:bg-daiqing/10 text-gray-400 hover:text-daiqing transition-all ${generatingSummaryId === chapter.id ? 'text-daiqing' : 'opacity-0 group-hover/item:opacity-100'}`}
                                                    title="AI 生成/刷新细纲"
                                                >
                                                    {generatingSummaryId === chapter.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                </button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             ))}
                         </div>
                    ))}
                    
                    {books.length === 0 && (
                        <div className="text-center text-xs text-gray-400 py-8">
                            暂无书辑
                        </div>
                    )}
                 </div>
             )}
          </div>
       </div>

      <div className={`flex-1 flex flex-col p-3 md:p-6 h-full relative z-0 transition-all duration-500 ease-in-out ${isAiOpen ? 'mr-[360px]' : ''}`}>
         {!isNavOpen && (
             <button 
                onClick={() => setIsNavOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 p-2 rounded-r-lg shadow-sm z-10 hover:bg-gray-50 text-gray-500"
                title="展开目录"
             >
                <ChevronRight className="w-4 h-4" />
             </button>
         )}

        <div className="flex justify-between items-center mb-4 flex-col md:flex-row gap-2 md:gap-0 items-start md:items-center">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-3">
                    <PenTool className="w-5 h-5 md:w-6 md:h-6 text-daiqing" />
                    <span>AI 辅助写作</span>
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-daiqing/10 text-daiqing border border-daiqing/20">Module 7</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-ink/5 shadow-sm">
                <div className="flex items-center gap-1 border-r border-ink/10 pr-2 mr-1">
                    <button 
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className={`p-1.5 rounded transition-colors ${historyIndex > 0 ? 'text-ink/60 hover:text-daiqing hover:bg-daiqing/10' : 'text-gray-300 cursor-not-allowed'}`}
                        title="撤销 (Ctrl+Z)"
                    >
                        <Undo className="w-3.5 h-3.5" />
                        <span className="sr-only">撤销</span>
                    </button>
                    <button 
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className={`p-1.5 rounded transition-colors ${historyIndex < history.length - 1 ? 'text-ink/60 hover:text-daiqing hover:bg-daiqing/10' : 'text-gray-300 cursor-not-allowed'}`}
                        title="重做 (Ctrl+Shift+Z)"
                    >
                        <Redo className="w-3.5 h-3.5" />
                        <span className="sr-only">重做</span>
                    </button>
                </div>

                <div className="flex items-center gap-1 border-r border-ink/10 pr-2 mr-1">
                    <button 
                        onClick={() => updateEditorConfig({ fontSize: Math.max(12, editorConfig.fontSize - 1) })}
                        className="p-1.5 text-ink/60 hover:text-daiqing hover:bg-daiqing/10 rounded transition-colors"
                        title="减小字号"
                    >
                        <Minus className="w-3 h-3" />
                        <span className="sr-only">减小字号</span>
                    </button>
                    <span className="text-xs font-medium text-ink/70 w-8 text-center">{editorConfig.fontSize}px</span>
                    <button 
                        onClick={() => updateEditorConfig({ fontSize: Math.min(32, editorConfig.fontSize + 1) })}
                        className="p-1.5 text-ink/60 hover:text-daiqing hover:bg-daiqing/10 rounded transition-colors"
                        title="增大字号"
                    >
                        <Plus className="w-3 h-3" />
                        <span className="sr-only">增大字号</span>
                    </button>
                </div>

                <div className="flex items-center gap-1 border-r border-ink/10 pr-2 mr-1">
                     <button 
                        onClick={() => updateEditorConfig({ lineHeight: editorConfig.lineHeight === 1.5 ? 1.8 : editorConfig.lineHeight === 1.8 ? 2.2 : 1.5 })}
                        className="p-1.5 text-ink/60 hover:text-daiqing hover:bg-daiqing/10 rounded transition-colors flex items-center gap-1"
                        title="行间距"
                    >
                        <AlignLeft className="w-3 h-3" />
                        <span className="text-xs font-medium">{editorConfig.lineHeight}</span>
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={handleAutoFormat}
                        className="p-1.5 text-ink/60 hover:text-daiqing hover:bg-daiqing/10 rounded transition-colors flex items-center gap-1"
                        title="一键排版 (自动缩进)"
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span className="text-xs">排版</span>
                    </button>
                    <button 
                        onClick={handleCopyContent}
                        className="p-1.5 text-ink/60 hover:text-daiqing hover:bg-daiqing/10 rounded transition-colors"
                        title="复制全文"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>

        <div className={`flex-1 relative bg-rice-texture rounded-xl shadow-sm border border-ink/10 overflow-hidden relative group transition-all duration-500 ${
            agentState === 'reading' ? 'ring-4 ring-daiqing/30 shadow-daiqing/20' : 
            agentState === 'writing' ? 'ring-4 ring-cinnabar/30 shadow-cinnabar/20' : ''
        }`}>
            <div 
                ref={ghostRef}
                className="absolute inset-0 p-8 pb-32 resize-none outline-none font-serif text-transparent bg-transparent z-0 custom-scrollbar whitespace-pre-wrap break-words pointer-events-none overflow-y-auto"
                style={{ 
                    fontSize: `${editorConfig.fontSize}px`,
                    lineHeight: editorConfig.lineHeight,
                    scrollbarColor: 'transparent transparent' 
                }}
            >
                {content}
                {prediction && (
                    <span className="text-gray-400 opacity-80 font-medium">
                        {prediction.text}
                    </span>
                )}
            </div>

            {agentState === 'reading' && (
                <div className="absolute top-4 right-4 bg-daiqing/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse z-30 flex items-center gap-2 pointer-events-none">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI 正在阅读...
                </div>
            )}
            {agentState === 'writing' && (
                <div className="absolute top-4 right-4 bg-cinnabar/90 text白 px-3 py-1 rounded-full text-xs font-bold animate-pulse z-30 flex items-center gap-2 pointer-events-none">
                    <PenTool className="w-3 h-3 animate-bounce" />
                    AI 正在撰写...
                </div>
            )}

            <div className="absolute inset-2 border border-ink/5 pointer-events-none rounded-lg z-10"></div>
            
            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onContextMenu={handleEditorContextMenu}
                onSelect={updateCursorStats}
                onKeyUp={updateCursorStats}
                onScroll={(e) => {
                    if (ghostRef.current) {
                        ghostRef.current.scrollTop = e.currentTarget.scrollTop;
                    }
                }}
                onKeyDown={(e) => {
                    if (prediction && e.key === 'Tab') {
                        e.preventDefault();
                        const textToInsert = prediction.text;
                        const start = textareaRef.current?.selectionStart || content.length;
                        const end = textareaRef.current?.selectionEnd || content.length;
                        const newContent = content.substring(0, start) + textToInsert + content.substring(end);
                        
                        setContent(newContent);
                        prevLenRef.current = newContent.length;
                        setPrediction(null);
                        
                        setTimeout(() => {
                            if (textareaRef.current) {
                                textareaRef.current.selectionStart = start + textToInsert.length;
                                textareaRef.current.selectionEnd = start + textToInsert.length;
                                textareaRef.current.focus();
                            }
                        }, 0);
                        return;
                    }
                    if (prediction && e.key === 'Escape') {
                         e.preventDefault();
                         setPrediction(null);
                         return;
                    }

                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const value = e.currentTarget.value;
                        
                        const insertion = '\n　　';
                        const newValue = value.substring(0, start) + insertion + value.substring(end);
                        
                        setContent(newValue);
                        prevLenRef.current = newValue.length;
                        
                        cursorRestoreRef.current = { start: start + insertion.length, end: start + insertion.length };
                        
                        return;
                    }

                    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleRedo();
                        } else {
                            handleUndo();
                        }
                        return;
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                        e.preventDefault();
                        handleRedo();
                        return;
                    }
                }}
                onClick={updateCursorStats}
                onMouseUp={handleMouseUp}
                onBlur={handleBlur}
                className="w-full h-full p-8 pb-32 resize-none outline-none font-serif text-ink bg-transparent relative z-10 custom-scrollbar transition-all duration-200"
                placeholder="在此挥毫泼墨..."
                spellCheck={false}
                style={{ 
                    fontSize: `${editorConfig.fontSize}px`,
                    lineHeight: editorConfig.lineHeight 
                }}
            />
            {contextMenuState.visible && (
                <div
                    className="fixed z-[60] w-40 bg-white border border-ink/10 rounded-lg shadow-xl py-1 text-xs text-ink/80"
                    style={{ left: contextMenuState.x, top: contextMenuState.y }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <button
                        onClick={handleContextCopy}
                        className="w-full text-left px-3 py-1.5 hover:bg-paper"
                    >
                        复制
                    </button>
                    <button
                        onClick={handleContextCut}
                        className="w-full text-left px-3 py-1.5 hover:bg-paper"
                    >
                        剪切
                    </button>
                    <button
                        onClick={handleContextPaste}
                        className="w-full text-left px-3 py-1.5 hover:bg-paper"
                    >
                        粘贴
                    </button>
                    <button
                        onClick={handleContextCopyAll}
                        className="w-full text-left px-3 py-1.5 hover:bg-paper"
                    >
                        复制全文
                    </button>
                    <button
                        onClick={handleAddToClipboardBoard}
                        className="w-full text-left px-3 py-1.5 hover:bg-paper"
                    >
                        加入粘贴板
                    </button>
                    <div className="border-t border-ink/5 my-1"></div>
                    <div className="px-3 py-1 text-[10px] text-ink/40">粘贴板</div>
                    {clipboardBoard.length === 0 ? (
                        <div className="px-3 py-1.5 text-[10px] text-ink/30">暂无内容</div>
                    ) : (
                        clipboardBoard.map((item, idx) => (
                            <button
                                key={`${item}-${idx}`}
                                onClick={() => {
                                    replaceSelection(item);
                                    setContextMenuState(prev => ({ ...prev, visible: false }));
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-paper truncate"
                                title={item}
                            >
                                {item}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
        
        <div className="mt-2 flex justify-between items-center text-xs text-gray-400 px-4 py-2 border-t border-ink/5 bg-white/30 backdrop-blur-sm rounded-lg flex-wrap gap-y-2">
             <div className="flex gap-4 items-center flex-wrap">
                 <span>字数: {content.length}</span>
                 <span>预计阅读: {Math.ceil(content.length / 500)} 分钟</span>
                 
                 <div className={`flex items-center gap-1.5 transition-colors ${
                    !editorConfig.predictEnabled ? 'text-gray-400' :
                    predictionError ? 'text-red-500' :
                    isPredicting ? 'text-daiqing font-medium cursor-pointer hover:underline' : 'text-gray-400'
                 }`}
                 onClick={() => {
                     if (isPredicting && predictAbortControllerRef.current) {
                         predictAbortControllerRef.current.abort();
                     }
                 }}
                 title={isPredicting ? "点击停止生成" : ""}
                 >
                     <Sparkles className={`w-3 h-3 ${isPredicting ? 'animate-pulse' : ''}`} />
                     <span>
                         {!editorConfig.predictEnabled ? 'AI 续写关闭（去设置开启）' :
                          predictionError ? `AI 错误: ${predictionError}` :
                          isPredicting ? 'AI 正在思考... (点击停止)' :
                          content.trim().length < 10 ? 'AI 等待更多内容（至少 10 字）' :
                          prediction ? 'Tab 采纳灰色续写' :
                          'AI 续写已开启'}
                     </span>
                 </div>

                 <div className={`flex items-center gap-1.5 transition-colors ${
                     saveStatus === 'saved' ? 'text-green-600' : 
                     saveStatus === 'saving' ? 'text-daiqing' : 'text-amber-500'
                 }`}>
                     {saveStatus === 'saving' ? (
                         <Loader2 className="w-3 h-3 animate-spin" />
                     ) : saveStatus === 'saved' ? (
                         <Cloud className="w-3 h-3" />
                     ) : (
                         <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                     )}
                     <span>
                         {saveStatus === 'saved' ? '已自动保存' : 
                          saveStatus === 'saving' ? '正在保存...' : '未保存'}
                     </span>
                 </div>
             </div>
             <div>
                 Ln {cursorStats.line}, Col {cursorStats.col}
             </div>
        </div>
      </div>

      {toolbarState.show && (
          <div 
              className="fixed z-[100] flex items-center gap-1 p-1.5 bg-white rounded-lg shadow-xl border border-ink/10 animate-in fade-in zoom-in-95 duration-200"
              style={{ top: toolbarState.y, left: toolbarState.x, transform: 'translateX(-50%)' }}
              onMouseDown={(e) => e.preventDefault()}
          >
              <button 
                  type="button"
                  onClick={() => handleToolbarAction('ask')}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-ink hover:bg-daiqing/10 hover:text-daiqing rounded transition-colors"
                  title="询问 AI"
              >
                  <MessageSquare className="w-3.5 h-3.5" />
                  询问
              </button>
              <div className="w-px h-4 bg-ink/10 mx-1" />
              <button 
                  type="button"
                  onClick={() => handleToolbarAction('polish')}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-ink hover:bg-daiqing/10 hover:text-daiqing rounded transition-colors"
                  title="润色这段文字"
              >
                  <Sparkles className="w-3.5 h-3.5" />
                  润色
              </button>
              <button 
                  type="button"
                  onClick={() => handleToolbarAction('summarize')}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-ink hover:bg-daiqing/10 hover:text-daiqing rounded transition-colors"
                  title="总结核心内容"
              >
                  <List className="w-3.5 h-3.5" />
                  总结
              </button>
              <button 
                  type="button"
                  onClick={() => handleToolbarAction('continue')}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-ink hover:bg-daiqing/10 hover:text-daiqing rounded transition-colors"
                  title="根据上下文续写"
              >
                  <PenTool className="w-3.5 h-3.5" />
                  续写
              </button>
              <button 
                  type="button"
                  onClick={() => handleToolbarAction('proofread')}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-ink hover:bg-daiqing/10 hover:text-daiqing rounded transition-colors"
                  title="纠错校对"
              >
                  <Check className="w-3.5 h-3.5" />
                  校对
              </button>
          </div>
      )}

      {modalConfig.isOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-ink/10">
                  <div className="p-6 bg-rice-texture">
                      <h3 className="text-xl font-bold text-ink mb-2">{modalConfig.title}</h3>
                      {modalConfig.message && <p className="text-gray-600 mb-4">{modalConfig.message}</p>}
                      
                      {modalConfig.type === 'input' && (
                          <input 
                              ref={(el) => {
                                  modalInputRef.current = el;
                              }}
                              type="text"
                              autoFocus
                              defaultValue={modalConfig.defaultValue}
                              className="w-full px-4 py-3 bg-white border border-ink/20 rounded-xl focus:ring-2 focus:ring-daiqing outline-none transition-all text-ink"
                              placeholder="请输入..."
                              onKeyDown={(e) => {
                                  if (e.nativeEvent.isComposing) return;
                                  
                                  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                                      e.preventDefault();
                                      if (e.shiftKey) {
                                          handleRedo();
                                      } else {
                                          handleUndo();
                                      }
                                      return;
                                  }
                                  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                                      e.preventDefault();
                                      handleRedo();
                                      return;
                                  }

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

                      {modalConfig.type === 'textarea' && (
                          <textarea 
                              autoFocus
                              defaultValue={modalConfig.defaultValue}
                              className="w-full h-48 px-4 py-3 bg-white border border-ink/20 rounded-xl focus:ring-2 focus:ring-daiqing outline-none transition-all text-ink resize-none custom-scrollbar"
                              placeholder="请输入内容..."
                              onChange={(e) => {
                                  if (modalInputRef.current) {
                                      (modalInputRef.current as any).value = e.target.value;
                                  }
                              }}
                              ref={(el) => {
                                  modalInputRef.current = el;
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
                              if (modalConfig.type === 'input' || modalConfig.type === 'textarea') {
                                  const value = modalInputRef.current?.value || (modalConfig.type === 'textarea' && modalConfig.defaultValue) || '';
                                  modalConfig.onConfirm(value);
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

  const handleImportDocs = (bookId: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.text';
      input.multiple = true;
      input.onchange = async () => {
          const files = Array.from(input.files || []);
          if (files.length === 0) return;
          const readFile = (file: File) =>
              new Promise<{ name: string; text: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({ name: file.name.replace(/\.[^.]+$/, ''), text: String(reader.result || '') });
                  reader.onerror = reject;
                  reader.readAsText(file, 'utf-8');
              });
          const results: { name: string; text: string }[] = [];
          for (const f of files) {
              try {
                  results.push(await readFile(f));
              } catch {}
          }
          if (results.length === 0) return;

          setBooks(prev => {
              const newBooks = prev.map(book => {
                  if (book.id !== bookId) return book;
                  
                  const newDocs = results.map(res => {
                      let docType: NovelFile['docType'] = 'other';
                      const nameLower = res.name.toLowerCase();
                      if (nameLower.includes('人设') || nameLower.includes('角色') || nameLower.includes('character')) docType = 'character';
                      else if (nameLower.includes('世界') || nameLower.includes('背景') || nameLower.includes('设定') || nameLower.includes('world')) docType = 'world';
                      else if (nameLower.includes('势力') || nameLower.includes('组织') || nameLower.includes('force')) docType = 'force';
                      else if (nameLower.includes('文风') || nameLower.includes('style')) docType = 'style';
                      else if (nameLower.includes('金手指') || nameLower.includes('goldfinger')) docType = 'goldfinger';
                      else if (nameLower.includes('要求') || nameLower.includes('requirement')) docType = 'requirement';
                      else if (nameLower.includes('概要') || nameLower.includes('大纲') || nameLower.includes('summary')) docType = 'summary';

                      const doc: NovelFile = {
                          id: generateId(),
                          title: res.name,
                          type: 'doc',
                          docType: docType,
                          content: res.text
                      };
                      return doc;
                  });

                  return { 
                      ...book, 
                      isOpen: true, 
                      children: [...newDocs, ...(book.children || [])]
                  };
              });
              StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
              return newBooks;
          });
      };
      input.click();
  };

  const handleImportBook = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.text';
      input.multiple = true;
      input.onchange = async () => {
          const files = Array.from(input.files || []);
          if (files.length === 0) return;
          const readFile = (file: File) =>
              new Promise<{ name: string; text: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({ name: file.name.replace(/\.[^.]+$/, ''), text: String(reader.result || '') });
                  reader.onerror = reject;
                  reader.readAsText(file, 'utf-8');
              });
          const results: { name: string; text: string }[] = [];
          for (const f of files) {
              try {
                  results.push(await readFile(f));
              } catch {}
          }
          if (results.length === 0) return;

          let firstChapterId: string | null = null;
          let firstChapterContent: string | null = null;

          setBooks(prev => {
              const newBooks = [...prev];
              
              for (const res of results) {
                  const { volumes, chaptersWithoutVolume } = parseTextToStructure(res.text);
                  const newBookId = generateId();
                  
                  let children: NovelFile[] = [];
                  
                  if (volumes.length > 0) {
                      if (chaptersWithoutVolume.length > 0) {
                           const preVolume: NovelFile = {
                                  id: generateId(),
                                  title: '序章/前言',
                                  type: 'volume',
                                  children: chaptersWithoutVolume,
                                  isOpen: true
                           };
                           children = [preVolume, ...volumes];
                      } else {
                           children = [...volumes];
                      }
                  } else {
                      if (chaptersWithoutVolume.length > 0) {
                          const vol: NovelFile = {
                              id: generateId(),
                              title: '正文',
                              type: 'volume',
                              children: chaptersWithoutVolume,
                              isOpen: true
                          };
                          children = [vol];
                      }
                  }

                  if (!firstChapterId) {
                       const findFirst = (nodes: NovelFile[]): boolean => {
                           for (const n of nodes) {
                               if (n.type === 'chapter') {
                                   firstChapterId = n.id;
                                   firstChapterContent = n.content || '';
                                   return true;
                               }
                               if (n.children && findFirst(n.children)) return true;
                           }
                           return false;
                       };
                       findFirst(children);
                  }

                  const newBook: NovelFile = {
                      id: newBookId,
                      title: res.name,
                      type: 'book',
                      children: children,
                      isOpen: true
                  };
                  newBooks.push(newBook);
              }

              StorageManager.setJSON(STORAGE_KEYS.NOVEL_PROJECTS, newBooks);
              return newBooks;
          });

          setTimeout(() => {
              if (firstChapterId) {
                  setActiveFileId(firstChapterId);
                  setContent(firstChapterContent || '');
              }
          }, 0);
      };
      input.click();
  };
