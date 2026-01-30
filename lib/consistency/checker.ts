import {
    ConsistencyCheck,
    ConsistencyDatabase,
    ConsistencyReport,
    CheckOptions,
    CharacterProfile,
    WorldSetting,
    TimelineEvent,
    Evidence
} from './types';
import { consistencyVectorStore } from './vector-store';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

/**
 * AI 一致性检测引擎
 */
export class ConsistencyChecker {

    /**
     * 执行完整的一致性检查
     */
    async performCheck(
        database: ConsistencyDatabase,
        options: CheckOptions = {}
    ): Promise<ConsistencyReport> {
        const checks: ConsistencyCheck[] = [];

        // 根据 scope 执行不同类型的检查
        const scope = options.scope || 'all';

        // 0. 构建向量索引 (如果需要)
        // 这一步将 database 中的 facts 和 fragments 存入向量库
        await this.buildVectorIndex(database);

        if (scope === 'all' || scope === 'character') {
            const characterChecks = await this.checkCharacterConsistency(
                database,
                options.characterIds
            );
            checks.push(...characterChecks);
        }

        if (scope === 'all' || scope === 'world') {
            const worldChecks = await this.checkWorldConsistency(database);
            checks.push(...worldChecks);
        }

        if (scope === 'all' || scope === 'timeline') {
            const timelineChecks = await this.checkTimelineConsistency(database);
            checks.push(...timelineChecks);
        }

        // 新增：基于向量的剧情深度一致性检查
        // 针对最新章节进行深度扫描
        const vectorChecks = await this.checkPlotConsistencyWithVectors(database);
        checks.push(...vectorChecks);

        // 生成报告
        const summary = {
            total: checks.length,
            errors: checks.filter(c => c.severity === 'error').length,
            warnings: checks.filter(c => c.severity === 'warning').length,
            info: checks.filter(c => c.severity === 'info').length
        };

        return {
            checks,
            summary,
            generatedAt: Date.now(),
            scope: {
                characterIds: options.characterIds,
                chapterRange: options.chapterRange,
                types: scope === 'all' ? ['character', 'world', 'timeline'] : [scope as any]
            }
        };
    }

    private async buildVectorIndex(database: ConsistencyDatabase) {
        // 将 Card Library (Characters, World Settings) 存入向量库
        const docs = [];
        
        for (const char of database.characters) {
            docs.push({
                id: `char-${char.id}`,
                text: `[人物档案] ${char.name}\n外貌：${char.appearance.join(',')}\n性格：${char.personality.join(',')}\n能力：${char.abilities.join(',')}`,
                type: 'character' as const
            });
        }

        for (const setting of database.worldSettings) {
             docs.push({
                id: `world-${setting.id}`,
                text: `[世界设定] ${setting.name} (${setting.type})\n描述：${setting.description}\n规则：${setting.rules.join(',')}`,
                type: 'world' as const
            });
        }
        
        // 仅索引前文剧情片段 (Recent Context)
        // 为了节省 Token，只索引最近 10 章的摘要或关键情节
        const recentChapters = database.chapters.slice(-10); 
        for (const ch of recentChapters) {
             docs.push({
                 id: `ch-${ch.number}`,
                 text: `[第${ch.number}章剧情] ${ch.title}\n${ch.content.slice(0, 500)}...`, // 简化处理，实际应为摘要
                 type: 'chapter_fragment' as const
             });
        }

        await consistencyVectorStore.addDocuments(docs);
    }

    private async checkPlotConsistencyWithVectors(database: ConsistencyDatabase): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];
        const latestChapter = database.chapters[database.chapters.length - 1];
        if (!latestChapter) return checks;

        // 将最新章节切分为"断言"或"事件片段"
        // 简化：按段落切分，每 500 字一查
        const chunks = this.splitText(latestChapter.content, 500);

        for (const chunk of chunks) {
            // 1. 检索相关背景
            const relatedDocs = await consistencyVectorStore.search(chunk, 3);
            if (relatedDocs.length === 0) continue;

            // 2. 构建 AI 验证 Prompt
            const contextText = relatedDocs.map(d => d.text).join('\n---\n');
            const conflict = await this.detectConflictWithContext(chunk, contextText);

            if (conflict) {
                checks.push({
                    id: `vec-conflict-${Date.now()}`,
                    type: 'world', // 或 character，视情况而定
                    severity: 'warning',
                    title: '发现潜在剧情/设定冲突 (AI向量检测)',
                    description: conflict.description,
                    evidence: [
                        {
                            chapterNumber: latestChapter.number,
                            excerpt: chunk.slice(0, 100) + '...',
                            location: '最新章节正文'
                        },
                        ...relatedDocs.map(d => ({
                            chapterNumber: 0, // System/Fact
                            excerpt: d.text.slice(0, 100) + '...',
                            location: '背景设定库/前文'
                        }))
                    ],
                    suggestion: conflict.suggestion,
                    createdAt: Date.now()
                });
            }
        }
        
        return checks;
    }

    private splitText(text: string, chunkSize: number): string[] {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private async detectConflictWithContext(text: string, context: string): Promise<{description: string, suggestion: string} | null> {
         try {
            const apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || '';
            const baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || 'https://api.siliconflow.cn/v1';
            const model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';

            if (!apiKey) return null;

            const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: '你是一致性检查助手。请判断[当前文本]是否与[已知背景]存在逻辑冲突。如果不冲突，返回NULL。如果冲突，请简要说明。' },
                        { role: 'user', content: `[已知背景]:\n${context}\n\n[当前文本]:\n${text}\n\n请判断是否存在矛盾？若有，请以JSON返回 {"conflict": "是", "reason": "...", "suggestion": "..."}` }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) return null;
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            
            if (content.includes('conflict') || content.includes('矛盾')) {
                 const jsonMatch = content.match(/\{[\s\S]*\}/);
                 if (jsonMatch) {
                     const res = JSON.parse(jsonMatch[0]);
                     if (res.conflict === '是' || res.conflict === true) {
                         return {
                             description: res.reason || '检测到潜在逻辑矛盾',
                             suggestion: res.suggestion || '请核对背景设定'
                         };
                     }
                 }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 检查人物一致性
     */
    private async checkCharacterConsistency(
        database: ConsistencyDatabase,
        characterIds?: string[]
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];
        const characters = characterIds
            ? database.characters.filter(c => characterIds.includes(c.id))
            : database.characters;

        for (const character of characters) {
            // 1. 检查外貌一致性
            const appearanceChecks = await this.checkAppearanceConsistency(character);
            checks.push(...appearanceChecks);

            // 2. 检查性格一致性
            const personalityChecks = await this.checkPersonalityConsistency(character);
            checks.push(...personalityChecks);

            // 3. 检查能力一致性
            const abilityChecks = await this.checkAbilityConsistency(character);
            checks.push(...abilityChecks);
        }

        return checks;
    }

    /**
     * 检查外貌描写一致性
     */
    private async checkAppearanceConsistency(
        character: CharacterProfile
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        if (character.mentions.length < 2) {
            return checks; // 至少需要2次提及才能检查一致性
        }

        // 提取所有包含外貌描写的提及
        const appearanceMentions = character.mentions.filter(m =>
            this.containsAppearanceKeywords(m.excerpt)
        );

        if (appearanceMentions.length < 2) {
            return checks;
        }

        // 使用 AI 检测矛盾
        const conflicts = await this.detectAppearanceConflicts(
            character.name,
            appearanceMentions
        );

        for (const conflict of conflicts) {
            checks.push({
                id: `char-app-${character.id}-${Date.now()}`,
                type: 'character',
                severity: conflict.severity,
                title: `${character.name} 的外貌描写不一致`,
                description: conflict.description,
                evidence: conflict.evidence,
                suggestion: conflict.suggestion,
                createdAt: Date.now()
            });
        }

        return checks;
    }

    /**
     * 检查性格表现一致性
     */
    private async checkPersonalityConsistency(
        character: CharacterProfile
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        // 类似 checkAppearanceConsistency 的逻辑
        // 这里简化实现，实际可用 AI 分析

        return checks;
    }

    /**
     * 检查能力设定一致性
     */
    private async checkAbilityConsistency(
        character: CharacterProfile
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        // 检查力量等级是否合理递增
        const powerMentions = character.mentions.filter(m =>
            this.containsPowerKeywords(m.excerpt)
        );

        if (powerMentions.length >= 2) {
            // 简单的规则检查：后续章节力量不应低于前面
            // 实际实现需要 AI 理解力量体系
        }

        return checks;
    }

    /**
     * 检查世界观一致性
     */
    private async checkWorldConsistency(
        database: ConsistencyDatabase
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        // 1. 检查力量体系一致性
        const powerSettings = database.worldSettings.filter(s => s.type === 'power');
        for (const setting of powerSettings) {
            const powerChecks = await this.checkPowerSystemConsistency(setting);
            checks.push(...powerChecks);
        }

        // 2. 检查地理设定一致性
        const geoSettings = database.worldSettings.filter(s => s.type === 'geography');
        for (const setting of geoSettings) {
            const geoChecks = await this.checkGeographyConsistency(setting);
            checks.push(...geoChecks);
        }

        return checks;
    }

    /**
     * 检查力量体系一致性
     */
    private async checkPowerSystemConsistency(
        setting: WorldSetting
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        // 检查力量等级、规则是否前后一致
        // 实际需要 AI 语义分析

        return checks;
    }

    /**
     * 检查地理设定一致性
     */
    private async checkGeographyConsistency(
        setting: WorldSetting
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        if (setting.mentions.length < 2) {
            return checks;
        }

        // 检查位置、距离描述是否矛盾
        // 例如："位于东方" vs "位于北方"

        return checks;
    }

    /**
     * 检查时间线一致性
     */
    private async checkTimelineConsistency(
        database: ConsistencyDatabase
    ): Promise<ConsistencyCheck[]> {
        const checks: ConsistencyCheck[] = [];

        // 1. 检查事件顺序是否合理
        for (let i = 0; i < database.timeline.length - 1; i++) {
            const current = database.timeline[i];
            const next = database.timeline[i + 1];

            // 检查章节号递增
            if (next.chapter < current.chapter) {
                checks.push({
                    id: `timeline-order-${i}`,
                    type: 'timeline',
                    severity: 'error',
                    title: '时间线事件顺序错误',
                    description: `第 ${current.chapter} 章的事件在第 ${next.chapter} 章之后`,
                    evidence: [
                        {
                            chapterNumber: current.chapter,
                            excerpt: current.event,
                            location: 'Timeline'
                        },
                        {
                            chapterNumber: next.chapter,
                            excerpt: next.event,
                            location: 'Timeline'
                        }
                    ],
                    createdAt: Date.now()
                });
            }

            // 检查时间逻辑（简化版）
            const timeCheck = this.checkTimeLogic(current, next);
            if (timeCheck) {
                checks.push(timeCheck);
            }
        }

        // 2. 检查人物年龄推算
        const ageChecks = await this.checkCharacterAges(database);
        checks.push(...ageChecks);

        return checks;
    }

    private checkTimeLogic(
        current: TimelineEvent,
        next: TimelineEvent
    ): ConsistencyCheck | null {
        // 简化实现：检查世界时间是否合理
        // 实际需要解析时间格式并验证
        return null;
    }

    private async checkCharacterAges(
        database: ConsistencyDatabase
    ): Promise<ConsistencyCheck[]> {
        // 根据时间线推算人物年龄是否合理
        return [];
    }

    // ============ AI 调用辅助方法 ============

    /**
     * 使用 AI 检测外貌描写冲突
     */
    private async detectAppearanceConflicts(
        characterName: string,
        mentions: any[]
    ): Promise<any[]> {
        if (mentions.length < 2) return [];

        try {
            // 获取 AI 配置
            const { StorageManager, STORAGE_KEYS } = await import('@/lib/storage');
            const apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || '';
            const baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || 'https://api.siliconflow.cn/v1';
            const model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';

            if (!apiKey) {
                console.warn('未配置 AI API，跳过冲突检测');
                return [];
            }

            // 构建提示词
            const mentionsList = mentions.map((m, idx) =>
                `[${idx + 1}] 第${m.chapterNumber}章: "${m.excerpt}"`
            ).join('\n');

            const prompt = `请分析角色"${characterName}"的以下外貌描写是否存在矛盾：

${mentionsList}

如果发现矛盾，请以 JSON 格式返回：
{
  "conflicts": [
    {
      "severity": "error" | "warning",
      "description": "具体矛盾描述",
      "evidenceIndices": [索引1, 索引2],
      "suggestion": "修复建议"
    }
  ]
}

如果没有矛盾，返回：{"conflicts": []}`;

            // 调用 AI API
            const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: '你是专业的小说编辑，擅长发现文本中的逻辑矛盾。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                console.error('AI API 调用失败:', response.status);
                return [];
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '{}';

            // 解析 JSON（可能包含 markdown 代码块）
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return [];

            const result = JSON.parse(jsonMatch[0]);

            // 转换为标准格式
            return (result.conflicts || []).map((conflict: any) => ({
                severity: conflict.severity || 'warning',
                description: conflict.description,
                evidence: conflict.evidenceIndices?.map((idx: number) => mentions[idx - 1]) || [],
                suggestion: conflict.suggestion
            }));

        } catch (error) {
            console.error('AI 冲突检测失败:', error);
            return [];
        }
    }

    // ============ 工具方法 ============

    private containsAppearanceKeywords(text: string): boolean {
        const keywords = ['发色', '眼睛', '身高', '外貌', '长相', '容貌', '黑发', '金发', '蓝眼', '黑眼'];
        return keywords.some(kw => text.includes(kw));
    }

    private containsPowerKeywords(text: string): boolean {
        const keywords = ['斗者', '斗师', '斗王', '境界', '等级', '实力', '修为'];
        return keywords.some(kw => text.includes(kw));
    }
}

// 导出单例
export const consistencyChecker = new ConsistencyChecker();
