'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

type EditorMethods = {
  getContent: () => string;
  setContent: (content: string) => void;
  insertText: (text: string) => void;
  getSelection: () => { start: number; end: number };
  setSelection: (start: number, end: number) => void;
  focus: () => void;
};

type PageSkillHandler = (payload: any) => Promise<void> | void;

interface EditorAgentContextType {
  // Registry
  registerEditor: (id: string, methods: EditorMethods) => void;
  unregisterEditor: (id: string) => void;
  activeEditor: EditorMethods | null;
  activeEditorId: string | null;

  // Visual States
  agentState: 'idle' | 'reading' | 'writing';
  setAgentState: (state: 'idle' | 'reading' | 'writing') => void;
  
  // Agent Visual Mode
  agentMode: 'standard' | 'neon';
  setAgentMode: (mode: 'standard' | 'neon') => void;

  // AI Panel State
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;

  // Actions
  readEditorContent: () => Promise<string>;
  readSelection: () => Promise<string>;
  writeToEditor: (text: string, mode?: 'append' | 'overwrite' | 'insert') => Promise<void>;
  deleteSelection: () => Promise<void>;
  undo: () => Promise<void>;

  // Interaction
  pendingPrompt: string | null;
  shouldAutoSend: boolean;
  setPendingPrompt: (prompt: string | null, autoSend?: boolean) => void;

  registerPageSkill: (name: string, handler: PageSkillHandler) => void;
  unregisterPageSkill: (name: string) => void;
  runPageSkill: (name: string, payload: any) => Promise<any>;

  // Max Mode
  isMaxMode: boolean;
  setIsMaxMode: (mode: boolean) => void;

  // User Level
  userLevel: 'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX' | null;
}

const EditorAgentContext = createContext<EditorAgentContextType | null>(null);

export function EditorAgentProvider({ children }: { children: React.ReactNode }) {
  const editorsRef = useRef<Record<string, EditorMethods>>({});
  const pageSkillsRef = useRef<Record<string, PageSkillHandler>>({});
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<'idle' | 'reading' | 'writing'>('idle');
  const [agentMode, setAgentMode] = useState<'standard' | 'neon'>('standard');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [pendingPrompt, setPendingPromptState] = useState<string | null>(null);
  const [shouldAutoSend, setShouldAutoSend] = useState(true);
  const MAX_UNDO_STACK = 5; // 优化：从10减少到5，减少内存占用
  const [undoStack, setUndoStack] = useState<{ content: string, selection: { start: number, end: number } }[]>([]);
  const [isMaxMode, setIsMaxMode] = useState(false);
  const [userLevel, setUserLevel] = useState<'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX' | null>(null);

  useEffect(() => {
    // Fetch user info to populate userLevel
    const fetchUserLevel = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserLevel(data.data?.level || null);
        }
      } catch (e) {
        console.error('Failed to fetch user level', e);
      }
    };
    fetchUserLevel();
  }, []);

  const setPendingPrompt = useCallback((prompt: string | null, autoSend: boolean = true) => {
    setShouldAutoSend(autoSend);
    setPendingPromptState(prompt);
  }, []);

  const registerEditor = useCallback((id: string, methods: EditorMethods) => {
    editorsRef.current[id] = methods;
    setActiveEditorId(id);
  }, []);

  const unregisterEditor = useCallback((id: string) => {
    delete editorsRef.current[id];
    if (activeEditorId === id) {
      setActiveEditorId(null);
    }
  }, [activeEditorId]);

  const activeEditor = activeEditorId ? editorsRef.current[activeEditorId] : null;

  const saveSnapshot = useCallback(() => {
    if (!activeEditor) return;
    const content = activeEditor.getContent();
    const selection = activeEditor.getSelection();
    setUndoStack(prev => {
      const newStack = [...prev, { content, selection }];
      if (newStack.length > MAX_UNDO_STACK) {
        return newStack.slice(newStack.length - MAX_UNDO_STACK);
      }
      return newStack;
    });
  }, [activeEditor]);

  const undo = useCallback(async () => {
    if (!activeEditor || undoStack.length === 0) return;

    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    activeEditor.setContent(lastState.content);
    activeEditor.setSelection(lastState.selection.start, lastState.selection.end);
    activeEditor.focus();
  }, [activeEditor, undoStack]);

  const readEditorContent = useCallback(async () => {
    if (!activeEditor) return '';
    setAgentState('reading');
    await new Promise(resolve => setTimeout(resolve, 800));
    const content = activeEditor.getContent();
    setAgentState('idle');
    return content;
  }, [activeEditor]);

  const readSelection = useCallback(async () => {
    if (!activeEditor) return '';
    setAgentState('reading');

    const { start, end } = activeEditor.getSelection();
    if (start === end) {
      setAgentState('idle');
      return '';
    }

    const content = activeEditor.getContent();
    const selection = content.slice(start, end);

    setAgentState('idle');
    return selection;
  }, [activeEditor]);

  const writeToEditor = useCallback(async (text: string, mode: 'append' | 'overwrite' | 'insert' = 'insert') => {
    if (!activeEditor) return;

    saveSnapshot();

    setAgentState('writing');

    activeEditor.focus();

    if (mode === 'overwrite') {
      activeEditor.setContent('');
    }

    const chunkSize = 5;
    const chunkRegex = new RegExp(`.{1,${chunkSize}}`, 'g');
    const chunks = text.match(chunkRegex) || [];

    for (const chunk of chunks) {
      activeEditor.insertText(chunk);
      const delay = Math.floor(Math.random() * 10) + 10;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    setAgentState('idle');
  }, [activeEditor, saveSnapshot]);

  const deleteSelection = useCallback(async () => {
    if (!activeEditor) return;

    saveSnapshot();

    setAgentState('writing');

    const { start, end } = activeEditor.getSelection();
    if (start === end) {
      setAgentState('idle');
      return;
    }

    const content = activeEditor.getContent();
    const newContent = content.slice(0, start) + content.slice(end);

    activeEditor.setContent(newContent);
    activeEditor.setSelection(start, start);
    activeEditor.focus();

    setAgentState('idle');
  }, [activeEditor, saveSnapshot]);

  const registerPageSkill = useCallback((name: string, handler: PageSkillHandler) => {
    pageSkillsRef.current[name] = handler;
  }, []);

  const unregisterPageSkill = useCallback((name: string) => {
    delete pageSkillsRef.current[name];
  }, []);

  const runPageSkill = useCallback(async (name: string, payload: any) => {
    const handler = pageSkillsRef.current[name];
    if (!handler) return undefined;
    try {
      return await handler(payload);
    } catch (e) {
      console.error(`Error running page skill ${name}:`, e);
      return undefined;
    }
  }, []);

  return (
    <EditorAgentContext.Provider value={{
      registerEditor,
      unregisterEditor,
      activeEditor,
      activeEditorId,
      agentState,
      setAgentState,
      agentMode,
      setAgentMode,
      isAiOpen,
      setIsAiOpen,
      readEditorContent,
      readSelection,
      writeToEditor,
      deleteSelection,
      undo,
      pendingPrompt,
      shouldAutoSend,
      setPendingPrompt,
      registerPageSkill,
      unregisterPageSkill,
      runPageSkill,
      isMaxMode,
      setIsMaxMode,
      userLevel
    }}>
      {children}
    </EditorAgentContext.Provider>
  );
}

export function useEditorAgent() {
  const context = useContext(EditorAgentContext);
  if (!context) {
    throw new Error('useEditorAgent must be used within an EditorAgentProvider');
  }
  return context;
}
