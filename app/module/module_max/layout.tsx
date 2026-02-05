'use client';

import { useEffect } from 'react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

export default function MaxModuleLayout({ children }: { children: React.ReactNode }) {
  const { setIsMaxMode } = useEditorAgent();

  useEffect(() => {
    setIsMaxMode(true);
    return () => {
      setIsMaxMode(false);
    };
  }, [setIsMaxMode]);

  return <>{children}</>;
}
