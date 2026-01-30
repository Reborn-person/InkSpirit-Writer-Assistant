'use client';

import { useEffect } from 'react';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

export default function MaxModuleLayout({ children }: { children: React.ReactNode }) {
  const { setIsMaxMode } = useEditorAgent();

  useEffect(() => {
    // Enable MAX mode when entering this module
    setIsMaxMode(true);
    document.documentElement.classList.add('max-mode');
    document.body.classList.add('max-mode');
    
    // Disable MAX mode when leaving this module
    return () => {
      setIsMaxMode(false);
      document.documentElement.classList.remove('max-mode');
      document.body.classList.remove('max-mode');
    };
  }, [setIsMaxMode]);

  return <>{children}</>;
}
