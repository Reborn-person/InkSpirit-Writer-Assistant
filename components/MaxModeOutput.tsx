
'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Copy, CheckCircle2, X, Trash2 } from 'lucide-react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

interface MaxModeOutputProps {
  content: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  modelName?: string;
  onLock?: () => void;
  isLocked?: boolean;
  onRegenerate?: () => void;
}

interface Chapter {
  title: string;
  index: number;
  startIndex: number;
  endIndex: number;
}

export default function MaxModeOutput({ 
  content, 
  onChange, 
  isLoading, 
  modelName, 
  onLock, 
  isLocked,
  onRegenerate 
}: MaxModeOutputProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(-1); // -1 means all or none specific
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { registerEditor, unregisterEditor } = useEditorAgent();
  
  // Refs to hold latest values for editor methods without triggering effect
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
      contentRef.current = content;
  }, [content]);

  useEffect(() => {
      onChangeRef.current = onChange;
  }, [onChange]);

  // Register as an editor when mounted or when modelName changes
  useEffect(() => {
      // Use modelName as ID suffix, default to 'main'
      const editorId = `module_max_${modelName || 'main'}`;
      
      registerEditor(editorId, {
          getContent: () => contentRef.current,
          setContent: (newContent: string) => onChangeRef.current(newContent),
          insertText: (text: string) => {
              if (!textareaRef.current) {
                  onChangeRef.current(contentRef.current + text);
                  return;
              }
              const start = textareaRef.current.selectionStart;
              const end = textareaRef.current.selectionEnd;
              const currentContent = contentRef.current;
              const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
              onChangeRef.current(newContent);
              
              // Restore cursor after render (approximate)
              setTimeout(() => {
                  if (textareaRef.current) {
                      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
                      textareaRef.current.focus();
                  }
              }, 0);
          },
          getSelection: () => {
              if (!textareaRef.current) return { start: 0, end: 0 };
              return { 
                  start: textareaRef.current.selectionStart, 
                  end: textareaRef.current.selectionEnd 
              };
          },
          setSelection: (start: number, end: number) => {
              if (textareaRef.current) {
                  textareaRef.current.setSelectionRange(start, end);
                  textareaRef.current.focus();
              }
          },
          focus: () => {
              textareaRef.current?.focus();
          }
      });

      return () => {
          unregisterEditor(editorId);
      };
  }, [modelName, registerEditor, unregisterEditor]);

  // Parse chapters from content
  useEffect(() => {
    if (!content) {
      setChapters([]);
      return;
    }

    const newChapters: Chapter[] = [];
    // Refined regex to be more inclusive of common AI outputs including Outlines and Lists
    // Now supporting:
    // 1. Standard chapters: 第X章, Chapter X, 第X回, 第X卷
    // 2. Outlines: Phase X, Stage X, Part X, 阶段X
    // 3. Lists: 1. Title, 1、Title, (1) Title, 一、Title
    // 4. Markdown headers: ### Title (as fallback)
    
    const refinedRegex = /(?:^\s*|\n\s*)(?:[#*>\-\s]*)(第[0-9零一二三四五六七八九十百千万]+[章卷阶段回节]|(?:[Cc]hapter|[Pp]hase|[Ss]tage|[Pp]art)\s*\d+|[0-9]+\.|[0-9]+、|[一二三四五六七八九十]+、|序章|楔子|阶段\s*\d+)(?:[ \t]+.*)?(?:\*\*|)?(?=\n|$)/g;
    
    let match;
    let lastIndex = 0;
    
    // Find all matches
    while ((match = refinedRegex.exec(content)) !== null) {
      if (newChapters.length > 0) {
        newChapters[newChapters.length - 1].endIndex = match.index;
      }
      
      // Clean up title (remove markdown chars and common prefix noise)
      // match[0] includes the newline and prefix symbols due to the regex structure.
      // We want the clean title.
      // Group 1 is the keyword (e.g. "第1章").
      // But we want the full title line.
      
      const fullMatch = match[0];
      // Remove leading newlines/spaces
      let title = fullMatch.trim();
      
      // Remove markdown chars (#, *, >, -) from the start and end
      title = title.replace(/^[#*>\-\s]+|[#*>\-\s]+$/g, '');
      
      // If title is too long (e.g. a whole paragraph mistakenly matched), truncate it
      if (title.length > 50) {
          title = title.substring(0, 50) + '...';
      }
      
      newChapters.push({
        title: title, 
        index: newChapters.length,
        startIndex: match.index,
        endIndex: content.length // Temporary end index
      });
      lastIndex = refinedRegex.lastIndex;
    }

    // Fallback: If no chapters detected, try detecting Markdown headers (## or ###)
    if (newChapters.length === 0) {
        const headerRegex = /(?:^\s*|\n\s*)(#{1,6}\s+.*)(?=\n|$)/g;
        while ((match = headerRegex.exec(content)) !== null) {
            if (newChapters.length > 0) {
                newChapters[newChapters.length - 1].endIndex = match.index;
            }
            let title = match[1].trim().replace(/^#+\s+/, '');
             if (title.length > 50) title = title.substring(0, 50) + '...';
             
             newChapters.push({
                title: title,
                index: newChapters.length,
                startIndex: match.index,
                endIndex: content.length
            });
        }
    }

    // Fix the last chapter endIndex
    if (newChapters.length > 0) {
         newChapters[newChapters.length - 1].endIndex = content.length;
    }
    
    setChapters(newChapters);
  }, [content]);

  const handleChapterClick = (chapter: Chapter) => {
    setActiveChapterIndex(chapter.index);
    // Scroll textarea to chapter start
    if (textareaRef.current) {
      textareaRef.current.blur();
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(chapter.startIndex, chapter.startIndex);
      
      const textBefore = content.substring(0, chapter.startIndex);
      const fullLines = content.split('\n').length;
      const currentLines = textBefore.split('\n').length;
      const ratio = currentLines / fullLines;
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight * ratio;
    }
  };

  const handleDeleteChapter = (chapter: Chapter, e: React.MouseEvent) => {
      e.stopPropagation();
      if (typeof window !== 'undefined') {
          if (!window.confirm(`确定要删除“${chapter.title}”及其内容吗？`)) return;
      }

      const before = content.substring(0, chapter.startIndex);
      const after = content.substring(chapter.endIndex);
      const newContent = before + after;
      onChange(newContent);
  };

  return (
    <div className="flex h-[700px] bg-white/40 rounded-xl border border-ink/10 shadow-sm overflow-hidden animate-fade-in-up">
      {/* Sidebar: Chapter List */}
      <div className="w-48 bg-paper/50 border-r border-ink/10 flex flex-col">
        <div className="p-3 border-b border-ink/5 flex items-center justify-between">
          <span className="text-sm font-bold text-daiqing font-serif">章节列表</span>
          <span className="text-xs text-ink/40 font-mono">
            {chapters.length > 0 ? `${activeChapterIndex + 1 > 0 ? activeChapterIndex + 1 : '-'}/${chapters.length}` : '0/0'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {chapters.length === 0 ? (
            <div className="text-xs text-ink/30 text-center py-4">未检测到章节</div>
          ) : (
            chapters.map((chapter) => (
              <div
                key={chapter.index}
                className={`w-full flex items-center justify-between rounded-lg text-sm transition-all group relative pr-1 ${
                  activeChapterIndex === chapter.index
                    ? 'bg-daiqing text-white shadow-sm'
                    : 'text-ink/70 hover:bg-white/60 hover:text-ink'
                }`}
              >
                  <button
                    onClick={() => handleChapterClick(chapter)}
                    className="flex-1 text-left px-3 py-2 truncate font-serif"
                    title={chapter.title}
                  >
                    {chapter.title}
                  </button>
                  
                  {/* Delete Button (visible on hover) */}
                  <button
                      onClick={(e) => handleDeleteChapter(chapter, e)}
                      className={`p-1 rounded hover:bg-red-500 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 ${
                           activeChapterIndex === chapter.index ? 'text-white/70 hover:text-white' : 'text-ink/30'
                      }`}
                      title="删除此章节"
                  >
                      <Trash2 className="w-3 h-3" />
                  </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="p-3 border-b border-ink/5 flex items-center justify-between bg-white/30">
           <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink/50 bg-white/50 px-2 py-1 rounded border border-ink/5">
                  {modelName || '主模型'}
              </span>
              {isLoading && <span className="text-xs text-daiqing animate-pulse">正在生成...</span>}
           </div>
           <div className="flex items-center gap-1">
              <button 
                  onClick={onLock}
                  className={`p-1.5 rounded-lg transition-colors ${
                      isLocked 
                          ? 'bg-cinnabar/10 text-cinnabar hover:bg-cinnabar/20' 
                          : 'hover:bg-white/50 text-ink/40'
                  }`}
                  title={isLocked ? "已锁定" : "锁定结果"}
              >
                  <CheckCircle2 className={`w-4 h-4 ${isLocked ? 'fill-current' : ''}`} />
              </button>
              <button 
                  onClick={() => navigator.clipboard.writeText(content)}
                  className="p-1.5 hover:bg-white/50 rounded-lg text-ink/40 transition-colors"
                  title="复制"
              >
                  <Copy className="w-4 h-4" />
              </button>
              {onRegenerate && (
                  <button 
                      onClick={onRegenerate}
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-ink/30 transition-colors"
                      title="重置/重新生成"
                  >
                      <X className="w-4 h-4" />
                  </button>
              )}
           </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 relative">
            {isLoading && !content && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-ink/40 gap-2 bg-white/50 z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-daiqing" />
                    <span>AI 正在创作中...</span>
                </div>
            )}
            
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-full p-6 bg-transparent border-0 outline-none resize-none text-base text-ink font-serif leading-relaxed custom-scrollbar focus:ring-0"
                placeholder="生成的内容将显示在这里..."
                spellCheck={false}
            />
        </div>
      </div>
    </div>
  );
}
