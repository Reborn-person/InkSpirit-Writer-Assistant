import React from 'react';
import { useGodMode } from '../store/GodModeContext';
import { Clock, SkipBack, SkipForward, Play, Pause } from 'lucide-react';

export function TimelineControl() {
    const { state, dispatch } = useGodMode();
    const { currentChapter } = state;

    const handleChapterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1) {
            dispatch({ type: 'SET_CURRENT_CHAPTER', payload: val });
        }
    };

    const nextChapter = () => dispatch({ type: 'SET_CURRENT_CHAPTER', payload: currentChapter + 1 });
    const prevChapter = () => {
        if (currentChapter > 1) {
            dispatch({ type: 'SET_CURRENT_CHAPTER', payload: currentChapter - 1 });
        }
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-auto">
            <div className="bg-max-bg/90 backdrop-blur border border-max-border rounded-xl shadow-xl p-3 flex items-center gap-4 min-w-[400px]">
                <div className="flex items-center gap-2 text-max-text min-w-[80px]">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium whitespace-nowrap">第 {currentChapter} 章</span>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={prevChapter}
                        disabled={currentChapter <= 1}
                        className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>
                    
                    {/* Slider */}
                    <input
                        type="range"
                        min="1"
                        max="100" // Arbitrary max for now, ideally dynamic based on max chapter in nodes
                        value={currentChapter}
                        onChange={handleChapterChange}
                        className="w-48 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
                    />

                    <button 
                        onClick={nextChapter}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs text-gray-500 border-l border-white/10 pl-4">
                    时间线控制
                </div>
            </div>
        </div>
    );
}
