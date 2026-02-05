'use client';

import { useEffect, useState } from 'react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { useEditorAgent } from '@/contexts/EditorAgentContext';

export type Theme = 'default' | 'pixel' | 'eyecare' | 'cyberpunk' | 'ios26' | 'vision-os' | 'steampunk' | 'retro-gaming' | 'neumorphism' | 'bauhaus';

export default function ThemeProvider() {
    const { isMaxMode } = useEditorAgent();
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem(STORAGE_KEYS.UI_THEME) as Theme) || 'default';
        }
        return 'default';
    });
    
    // Listen for theme changes
    useEffect(() => {
        const loadTheme = () => {
            const savedTheme = StorageManager.get(STORAGE_KEYS.UI_THEME) as Theme;
            if (savedTheme) {
                setTheme(savedTheme);
            }
        };
        
        loadTheme();
        
        // Listen for storage events (e.g. when settings page updates it)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEYS.UI_THEME) {
                loadTheme();
            }
        };
        
        // Custom event for same-tab updates
        const handleLocalUpdate = () => loadTheme();
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage-update', handleLocalUpdate);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage-update', handleLocalUpdate);
        };
    }, []);

    // Apply theme and max-mode to body centrally
    useEffect(() => {
        const body = document.body;
        const html = document.documentElement;
        const allThemes = ['theme-default', 'theme-pixel', 'theme-eyecare', 'theme-cyberpunk', 'theme-ios26', 'theme-vision-os', 'theme-steampunk', 'theme-retro-gaming', 'theme-neumorphism', 'theme-bauhaus'];
        const currentThemeClass = `theme-${theme}`;
        
        const applyClasses = () => {
            // 1. Handle Theme
            const classesToRemove = allThemes.filter(t => t !== currentThemeClass && body.classList.contains(t));
            if (classesToRemove.length > 0) {
                body.classList.remove(...classesToRemove);
            }
            if (!body.classList.contains(currentThemeClass)) {
                body.classList.add(currentThemeClass);
            }
            
            // 2. Handle Max Mode (on body and html)
            if (isMaxMode) {
                if (!body.classList.contains('max-mode')) body.classList.add('max-mode');
                if (!html.classList.contains('max-mode')) html.classList.add('max-mode');
            } else {
                if (body.classList.contains('max-mode')) body.classList.remove('max-mode');
                if (html.classList.contains('max-mode')) html.classList.remove('max-mode');
            }
        };
        
        // Apply immediately
        applyClasses();
        
        // Use MutationObserver to ensure classes persist against React re-renders or hydration mismatches
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Check Theme
                    if (!body.classList.contains(currentThemeClass)) shouldReapply = true;
                    // Check Max Mode
                    if (isMaxMode && !body.classList.contains('max-mode')) shouldReapply = true;
                    if (!isMaxMode && body.classList.contains('max-mode')) shouldReapply = true;
                }
            }
            
            if (shouldReapply) {
                applyClasses();
            }
        });
        
        observer.observe(body, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, [theme, isMaxMode]);

    return null; // This component renders nothing visually
}
