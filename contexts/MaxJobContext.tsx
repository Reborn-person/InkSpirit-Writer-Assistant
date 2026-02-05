'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { generateAIContentStream, generateEmbeddings } from '@/lib/ai';
import { APIConfigValidator } from '@/lib/api-validator';
import { MASTER_TAG_LIST_CONFIG, CARD_EXTRACTION_PROMPT } from '@/lib/card-config';

// --- Types ---

interface VectorBuildState {
  status: 'idle' | 'building' | 'ready' | 'error';
  progress: { processed: number; total: number };
  error: string;
}

interface CardExtractionState {
  isExtracting: boolean;
  statusText: string;
  error: string;
}

interface OutlineGenState {
  isGenerating: boolean;
  result: string; // The raw outline text
  error: string;
}

interface MaxJobContextType {
  // Vector Build
  vectorBuildState: VectorBuildState;
  startVectorBuild: (sourceText: string, config: { chunkSize: number; overlap: number; batchSize: number }) => Promise<void>;
  resetVectorBuild: () => void;
  setVectorBuildStatus: (status: 'idle' | 'building' | 'ready' | 'error') => void;

  // Card Extraction
  cardExtractionState: CardExtractionState;
  startCardExtraction: (sourceText: string, vectorReady: boolean, modelConfig?: { apiKey: string; baseUrl: string; model: string }) => Promise<void>;
  
  // Outline Generation
  outlineGenState: OutlineGenState;
  startOutlineGeneration: (params: { 
    idea: string; 
    chapterCount: number; 
    worldSetting: string; 
    cardContext: string; 
    customSystemPrompt: string;
    modelConfig: { apiKey: string; baseUrl: string; model: string }
  }) => Promise<string>;
}

const MaxJobContext = createContext<MaxJobContextType | null>(null);

export function MaxJobProvider({ children }: { children: React.ReactNode }) {
  // --- States ---
  
  const [vectorBuildState, setVectorBuildState] = useState<VectorBuildState>({
    status: 'idle',
    progress: { processed: 0, total: 0 },
    error: ''
  });

  const [cardExtractionState, setCardExtractionState] = useState<CardExtractionState>({
    isExtracting: false,
    statusText: '',
    error: ''
  });

  const [outlineGenState, setOutlineGenState] = useState<OutlineGenState>({
    isGenerating: false,
    result: '',
    error: ''
  });

  // --- Helpers ---

  const getEmbeddingConfig = () => {
    const apiKey = StorageManager.get(STORAGE_KEYS.VECTOR_API_KEY) || StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
    const baseUrl = StorageManager.get(STORAGE_KEYS.VECTOR_BASE_URL) || StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
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
    const chunks: { text: string; start: number; end: number }[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = Math.min(start + chunkSize, cleaned.length);
      if (end < cleaned.length) {
        const lastBreak = cleaned.lastIndexOf('\n', end);
        if (lastBreak > start + 100) end = lastBreak;
      }
      const slice = cleaned.slice(start, end).trim();
      if (slice) {
        chunks.push({ text: slice, start, end });
      }
      if (end >= cleaned.length) break;
      start = Math.max(0, end - overlap);
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

  // --- Actions ---

  const startVectorBuild = useCallback(async (sourceText: string, config: { chunkSize: number; overlap: number; batchSize: number }) => {
    setVectorBuildState({ status: 'idle', progress: { processed: 0, total: 0 }, error: '' });
    
    if (!sourceText.trim()) {
      setVectorBuildState(prev => ({ ...prev, error: '请先导入小说文本' }));
      return;
    }

    const { apiKey, baseUrl, model, validation } = getEmbeddingConfig();
    if (!validation.valid) {
      setVectorBuildState(prev => ({ ...prev, error: `向量模型配置错误：${validation.errors.join('，')}` }));
      return;
    }

    const chunks = splitTextIntoChunks(sourceText, config.chunkSize, config.overlap);
    if (chunks.length === 0) {
      setVectorBuildState(prev => ({ ...prev, error: '未能切分出有效文本片段' }));
      return;
    }

    setVectorBuildState({ status: 'building', progress: { processed: 0, total: chunks.length }, error: '' });

    try {
      const index: any[] = [];
      
      for (let i = 0; i < chunks.length; i += config.batchSize) {
        const batch = chunks.slice(i, i + config.batchSize);
        const embeddings = await generateEmbeddings(
          apiKey,
          batch.map((item) => item.text),
          baseUrl,
          model
        );
        
        batch.forEach((item, idx) => {
          index.push({
            id: `${i + idx}`,
            text: item.text,
            embedding: embeddings[idx],
            start: item.start,
            end: item.end
          });
        });

        setVectorBuildState(prev => ({
          ...prev,
          progress: {
            processed: Math.min(i + batch.length, chunks.length),
            total: chunks.length
          }
        }));
      }

      StorageManager.setJSON('novel_writer_module_max_vector_index', index);
      StorageManager.set('novel_writer_module_max_source_text', sourceText);
      StorageManager.setJSON('novel_writer_module_max_index_settings', {
        chunkSize: config.chunkSize,
        overlap: config.overlap,
        batchSize: config.batchSize,
        topK: 6 // Default
      });

      setVectorBuildState(prev => ({ ...prev, status: 'ready' }));
    } catch (error: any) {
      setVectorBuildState(prev => ({ ...prev, status: 'error', error: error?.message || '向量索引构建失败' }));
    }
  }, []);

  const resetVectorBuild = useCallback(() => {
      setVectorBuildState({ status: 'idle', progress: { processed: 0, total: 0 }, error: '' });
  }, []);

  const setVectorBuildStatus = useCallback((status: 'idle' | 'building' | 'ready' | 'error') => {
      setVectorBuildState(prev => ({ ...prev, status }));
  }, []);

  const startCardExtraction = useCallback(async (sourceText: string, vectorReady: boolean, modelConfig?: { apiKey: string; baseUrl: string; model: string }) => {
    setCardExtractionState({ isExtracting: true, statusText: '正在初始化...', error: '' });
    
    if (!sourceText.trim() || sourceText.length < 10) {
        setCardExtractionState({ isExtracting: false, statusText: '', error: '请先输入或导入足够长度的原文（至少10字）' });
        return;
    }

    let apiKey: string, baseUrl: string, model: string, validation: any;

    if (modelConfig) {
        apiKey = modelConfig.apiKey;
        baseUrl = modelConfig.baseUrl;
        model = modelConfig.model;
        validation = APIConfigValidator.validateConfig(apiKey, baseUrl, model);
    } else {
        const config = getBigModelConfig();
        apiKey = config.apiKey;
        baseUrl = config.baseUrl;
        model = config.model;
        validation = config.validation;
    }

    if (!validation.valid) {
        setCardExtractionState({ isExtracting: false, statusText: '', error: `模型配置错误：${validation.errors.join('，')}` });
        return;
    }

    try {
        let textToDeconstruct = '';
        let extractionMode = 'simple';

        // Vector Logic (Simplified for context - reusing logic)
        // Note: Ideally we should read the index from storage since we are in a context
        // and the state might not be passed directly if we want to be fully independent.
        // But for now, we'll assume we read from storage if vectorReady is true.
        
        if (vectorReady) {
            setCardExtractionState(prev => ({ ...prev, statusText: '正在调用向量索引进行深度挖掘...' }));
            const maxIndex = await StorageManager.getJSONAsync('novel_writer_module_max_vector_index');
            
            if (maxIndex && maxIndex.length > 0) {
                extractionMode = 'vector_deep_dive';
                const miningProbes = [
                    "独具特色的世界观设定、魔法体系、历史传说或社会规则",
                    "精彩绝伦的环境描写、氛围营造或感官细节",
                    "深刻的人物心理活动、性格展现或复杂的人际关系交互",
                    "激烈的冲突、打斗场面、剧情转折或悬念伏笔",
                    "富有哲理的金句、优美的修辞或独特的叙事风格"
                ];
                
                // Need embedding config again
                const embedConfig = getEmbeddingConfig();
                if (embedConfig.validation.valid) {
                    const probeEmbeddings = await generateEmbeddings(
                        embedConfig.apiKey, 
                        miningProbes, 
                        embedConfig.baseUrl, 
                        embedConfig.model
                    );
                    
                     const uniqueChunks = new Set<string>();
                     const selectedChunks: any[] = [];
        
                     probeEmbeddings.forEach((probeVec, idx) => {
                         const scored = maxIndex.map((item: any) => ({
                             ...item,
                             score: cosineSimilarity(probeVec, item.embedding)
                         }));
                         const top3 = scored.sort((a: any, b: any) => b.score - a.score).slice(0, 3);
                         top3.forEach((chunk: any) => {
                             if (!uniqueChunks.has(chunk.id)) {
                                 uniqueChunks.add(chunk.id);
                                 selectedChunks.push({
                                     id: chunk.id,
                                     text: chunk.text,
                                     score: chunk.score
                                 });
                             }
                         });
                     });
                     
                     selectedChunks.sort((a, b) => parseInt(a.id) - parseInt(b.id));
                     const finalChunks = selectedChunks.length > 20 
                        ? selectedChunks.sort((a, b) => b.score - a.score).slice(0, 20).sort((a, b) => parseInt(a.id) - parseInt(b.id))
                        : selectedChunks;
        
                     textToDeconstruct = finalChunks.map(c => `[片段-${c.id}]\n${c.text}`).join('\n\n');
                     setCardExtractionState(prev => ({ ...prev, statusText: `已通过向量检索锁定全书 ${finalChunks.length} 个精华片段，正在进行智能提炼...` }));
                } else {
                    // Fallback
                    textToDeconstruct = sourceText.slice(0, 30000);
                }
            } else {
                textToDeconstruct = sourceText.slice(0, 30000);
            }
        } else {
            textToDeconstruct = sourceText.slice(0, 30000);
            setCardExtractionState(prev => ({ ...prev, statusText: '正在扫描前文片段...' }));
        }

        // Generate
        const allTagsToCheck = MASTER_TAG_LIST_CONFIG.flatMap(matrix => matrix.groups.flatMap(group => group.tags));
        const tagChecklist = JSON.stringify(allTagsToCheck);
    
        const userPrompt = CARD_EXTRACTION_PROMPT
            .replace('{{TEXT_TO_DECONSTRUCT}}', textToDeconstruct)
            .replace('{{TAG_CHECKLIST}}', tagChecklist);

        let jsonString = '';
        const fullText = await generateAIContentStream(
            apiKey,
            '你是一位极其严谨、知识渊博的文学地质勘探专家。',
            userPrompt,
            baseUrl,
            model,
            (content) => {
                // Optional: Update detailed progress log if we wanted
            }
        );

        // Parse JSON
        const jsonMatch = fullText.match(/```json([\s\S]*?)```/) || fullText.match(/\[([\s\S]*)\]/);
        if (jsonMatch) {
            jsonString = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '');
        } else if (fullText.trim().startsWith('[')) {
            jsonString = fullText;
        } else {
            throw new Error('AI未返回有效的JSON格式');
        }

        const rawCards = JSON.parse(jsonString);
        if (!Array.isArray(rawCards)) throw new Error('AI返回的数据不是数组格式');

        const newCards = rawCards.map((c: any) => ({
            id: crypto.randomUUID(),
            type: c.TYPE || '未分类',
            title: c.TITLE || '无标题',
            example: c.EXAMPLE || '',
            analysis: c.ANALYSIS || '',
            tags: c.TAGS || []
        }));

        // Auto Share
        try {
            await Promise.all(newCards.map(async (card: any) => {
                await fetch('/api/market/cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card)
                });
            }));
        } catch (e) { console.error(e); }

        // Save
        const currentLibrary = await StorageManager.getJSONAsync('novel_writer_card_library') || [];
        const updatedLibrary = [...newCards, ...currentLibrary];
        StorageManager.setJSON('novel_writer_card_library', updatedLibrary);

        setCardExtractionState({ 
            isExtracting: false, 
            statusText: `扫描完成！生成了 ${newCards.length} 张卡牌。`,
            error: '' 
        });

    } catch (error: any) {
        setCardExtractionState({ isExtracting: false, statusText: '', error: `卡牌提取失败: ${error.message}` });
    }
  }, []);

  const startOutlineGeneration = useCallback(async (params: { 
    idea: string; 
    chapterCount: number; 
    worldSetting: string; 
    cardContext: string; 
    customSystemPrompt: string;
    modelConfig: { apiKey: string; baseUrl: string; model: string };
    appendMode?: boolean; // New parameter to support appending
    existingContent?: string; // Content to append to
  }) => {
      // If in append mode, initialize result with existing content
      setOutlineGenState({ 
          isGenerating: true, 
          result: params.appendMode && params.existingContent ? params.existingContent : '', 
          error: '' 
      });
      
      const systemPrompt = params.customSystemPrompt || "你是资深网文主编，擅长根据创意生成节奏紧凑、期待感强的章节细纲。";
      // ... rest of the code ...
      
      // Update the stream callbacks to account for append mode
      // When we set state, we need to respect the initial offset if appending
      // But simpler: just let `accumulated` handle the new content, and we merge it with `params.existingContent` when setting state.
      
      const initialContent = params.appendMode && params.existingContent ? params.existingContent.trim() : '';
      const separator = initialContent ? '\n\n' : '';

      // ... (inside try block) ...
        
        // When streaming updates occur:
        // setOutlineGenState(prev => ({ ...prev, result: initialContent + separator + content }));
        
        // However, `runChunk` and `generateAIContentStream` logic needs to be adapted slightly 
        // OR we just wrap the setter passed to `generateAIContentStream`.
        
        // Let's modify the `setOutlineGenState` calls inside.

      const normalizeOutlineToChapterCount = (text: string, targetCount: number) => {
        if (!targetCount || targetCount < 1) return text;
        const lines = text.split('\n');
        const chapterIndices: number[] = [];
        const chapterRegex = /^(?:第[0-9一二三四五六七八九十百千]+章|Chapter\s+\d+)\s*/;
        const chapterRegexAlt = /^##\s+(?:第[0-9一二三四五六七八九十百千]+章|Chapter\s+\d+)\s*/;
        lines.forEach((line, index) => {
          if (chapterRegex.test(line) || chapterRegexAlt.test(line)) {
            chapterIndices.push(index);
          }
        });
        if (chapterIndices.length === 0) return text;
        if (chapterIndices.length > targetCount) {
          const cutIndex = chapterIndices[targetCount];
          return lines.slice(0, cutIndex).join('\n').trimEnd();
        }
        return text;
      };
      const countChapters = (text: string) => {
        const lines = text.split('\n');
        const chapterRegex = /^(?:第[0-9一二三四五六七八九十百千]+章|Chapter\s+\d+)\s*/;
        const chapterRegexAlt = /^##\s+(?:第[0-9一二三四五六七八九十百千]+章|Chapter\s+\d+)\s*/;
        let count = 0;
        for (const line of lines) {
          if (chapterRegex.test(line) || chapterRegexAlt.test(line)) count += 1;
        }
        return count;
      };

      const promptRule = params.customSystemPrompt?.trim()
        ? `细纲生成范式（最高优先级，完全遵循，不要添加固定模板）：\n${params.customSystemPrompt.trim()}`
        : '';
      const baseUserPrompt = `
任务：根据核心创意生成章节细纲。
核心创意：${params.idea}
世界观/设定参考：${params.worldSetting || '无'}
参考设定/背景资料：
${params.cardContext}
${promptRule ? `\n${promptRule}\n` : ''}

输出要求：
1. 章节按顺序输出，每章以"第X章 章节标题"开头，其后是该章细纲正文。
2. 章节数量目标：${params.chapterCount}章（若生成范式已明确数量，以范式为准）。
3. **深度融合**：将资料中的细节、逻辑或角色元素自然融入剧情，严禁提及"卡牌"、"资料来源"、"根据设定"等字眼。
4. 除非生成范式另有要求，不要附加额外说明或附录。
      `.trim();

      const buildRangePrompt = (startChapter: number, endChapter: number, tail: string, previousSummary: string) => {
        const rangeLabel = `当前生成范围：第${startChapter}章-第${endChapter}章`;
        const contextBlock = previousSummary ? `【已生成章节脉络回顾】：\n${previousSummary}\n...（中间省略）...\n` : '';
        const tailBlock = tail ? `【上文末尾片段（紧接此处继续）】：\n${tail}` : '';
        
        return [
          baseUserPrompt,
          rangeLabel,
          contextBlock,
          tailBlock,
          '要求：\n1. 必须紧密承接上文剧情，保持故事连贯性。\n2. 仅输出当前范围内的章节细纲，不要复述已生成部分。\n3. 请完整生成每一章的细节，不要省略或跳过内容。'
        ].filter(Boolean).join('\n\n');
      };

      try {
        const safeChapterCount = Math.max(0, params.chapterCount || 0);
        const shouldChunk = safeChapterCount > 60;
        let accumulated = '';

        const runChunk = async (start: number, end: number) => {
          let currentChunk = '';
          // 增加上下文回溯长度，提取更多前文信息
          const tail = accumulated ? accumulated.slice(-1500) : '';
          
          // 简单的"读一次大纲"实现：提取已生成章节的标题和少量开头，作为脉络
          // 如果内容太长，只取标题列表
          let previousSummary = '';
          if (accumulated) {
             const titles = accumulated.match(/^(?:第[0-9一二三四五六七八九十百千]+章|Chapter\s+\d+).*$/gm);
             if (titles && titles.length > 0) {
                 previousSummary = titles.join('\n');
             }
          }

          const prompt = buildRangePrompt(start, end, tail, previousSummary);
          await generateAIContentStream(
            params.modelConfig.apiKey,
            systemPrompt,
            prompt,
            params.modelConfig.baseUrl,
            params.modelConfig.model,
            (content) => {
              currentChunk = content;
              const nextChunk = [accumulated, content].filter(Boolean).join('\n\n');
              const finalResult = initialContent ? (initialContent + separator + nextChunk) : nextChunk;
              setOutlineGenState(prev => ({ ...prev, result: finalResult }));
            }
          );
          const cleaned = currentChunk.trim();
          accumulated = [accumulated, cleaned].filter(Boolean).join('\n\n');
        };

        if (shouldChunk) {
          const chunkSize = 40;
          let start = 1;
          while (start <= safeChapterCount) {
            const end = Math.min(start + chunkSize - 1, safeChapterCount);
            await runChunk(start, end);
            start = end + 1;
          }
          let normalizedText = normalizeOutlineToChapterCount(accumulated, params.chapterCount);
          const currentCount = countChapters(normalizedText);
          if (params.chapterCount > 0 && currentCount > 0 && currentCount < params.chapterCount) {
            accumulated = normalizedText;
            await runChunk(currentCount + 1, params.chapterCount);
            normalizedText = normalizeOutlineToChapterCount(accumulated, params.chapterCount);
          }
          const finalFullText = initialContent ? (initialContent + separator + normalizedText) : normalizedText;
          setOutlineGenState({ isGenerating: false, result: finalFullText, error: '' });
          return finalFullText;
        }

        let fullText = '';
        try {
          fullText = await generateAIContentStream(
            params.modelConfig.apiKey,
            systemPrompt,
            baseUserPrompt,
            params.modelConfig.baseUrl,
            params.modelConfig.model,
            (content) => {
              const finalRes = initialContent ? (initialContent + separator + content) : content;
              setOutlineGenState(prev => ({ ...prev, result: finalRes }));
            }
          );
        } catch (error: any) {
          const message = String(error?.message || error);
          if (safeChapterCount > 0 && /context|token|length/i.test(message)) {
            let start = 1;
            const chunkSize = 40;
            while (start <= safeChapterCount) {
              const end = Math.min(start + chunkSize - 1, safeChapterCount);
              await runChunk(start, end);
              start = end + 1;
            }
            let normalizedText = normalizeOutlineToChapterCount(accumulated, params.chapterCount);
            const currentCount = countChapters(normalizedText);
            if (params.chapterCount > 0 && currentCount > 0 && currentCount < params.chapterCount) {
              accumulated = normalizedText;
              await runChunk(currentCount + 1, params.chapterCount);
              normalizedText = normalizeOutlineToChapterCount(accumulated, params.chapterCount);
            }
            const finalFullText = initialContent ? (initialContent + separator + normalizedText) : normalizedText;
            setOutlineGenState({ isGenerating: false, result: finalFullText, error: '' });
            return finalFullText;
          }
          throw error;
        }

        accumulated = fullText.trim();
        let normalizedText = normalizeOutlineToChapterCount(accumulated, params.chapterCount);
        const currentCount = countChapters(normalizedText);
        if (params.chapterCount > 0 && currentCount > 0 && currentCount < params.chapterCount) {
          accumulated = normalizedText;
          await runChunk(currentCount + 1, params.chapterCount);
          normalizedText = normalizeOutlineToChapterCount(accumulated, params.chapterCount);
        }
        const finalResult = initialContent ? (initialContent + separator + normalizedText) : normalizedText;
        setOutlineGenState({ isGenerating: false, result: finalResult, error: '' });
        return finalResult;
      } catch (error: any) {
        setOutlineGenState(prev => ({ ...prev, isGenerating: false, error: error?.message || '生成失败' }));
        throw error;
      }
  }, []);

  return (
    <MaxJobContext.Provider value={{
      vectorBuildState,
      startVectorBuild,
      resetVectorBuild,
      setVectorBuildStatus,
      cardExtractionState,
      startCardExtraction,
      outlineGenState,
      startOutlineGeneration
    }}>
      {children}
    </MaxJobContext.Provider>
  );
}

export function useMaxJob() {
  const context = useContext(MaxJobContext);
  if (!context) {
    throw new Error('useMaxJob must be used within a MaxJobProvider');
  }
  return context;
}
