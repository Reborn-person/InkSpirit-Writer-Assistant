import { StorageManager } from '@/lib/storage';
import {
    ConsistencyDatabase,
    CharacterProfile,
    WorldSetting,
    TimelineEvent,
    ChapterData,
    ChapterMention
} from './types';
// import { GodNode } from '@/app/module/module_max/godmode/types';

/**
 * 数据提取器 - 从 God Mode 和卡片库提取一致性检查所需数据
 */
export class ConsistencyExtractor {

    /**
     * 提取完整的一致性数据库
     */
    async extractDatabase(): Promise<ConsistencyDatabase> {
        const [characters, worldSettings, timeline, chapters, characterTracking] = await Promise.all([
            this.extractCharacters(),
            this.extractWorldSettings(),
            this.extractTimeline(),
            this.extractChapters(),
            this.extractCharacterTracking()
        ]);

        return {
            characters,
            worldSettings,
            timeline,
            chapters,
            characterTracking,
            lastUpdated: Date.now()
        };
    }

    /**
     * 提取实时角色追踪数据
     */
    private async extractCharacterTracking(): Promise<any> {
        const activeWorkId = StorageManager.get('novel_writer_max_active_work');
        if (!activeWorkId) return null;

        try {
            const context = await StorageManager.getJSONAsync(`novel_writer_max_context_${activeWorkId}`);
            if (context && context.characterTracking) {
                if (typeof context.characterTracking === 'string') {
                    return JSON.parse(context.characterTracking);
                }
                return context.characterTracking;
            }
        } catch (e) {
            console.warn('Failed to extract character tracking', e);
        }
        return null;
    }

    /**
     * 从 God Mode 和卡片库提取人物数据
     */
    private async extractCharacters(): Promise<CharacterProfile[]> {
        const profiles: CharacterProfile[] = [];

        // 1. 从 God Mode 提取人物节点 (Optional, loosely typed)
        try {
            const godModeCanvas = await StorageManager.getJSONAsync('novel_writer_godmode_canvas');
            if (godModeCanvas?.nodes) {
                const characterNodes = godModeCanvas.nodes.filter(
                    (node: any) => node.data.layer === 'race' || (node.data.layer as string) === 'character'
                );

                for (const node of characterNodes) {
                    profiles.push(this.nodeToCharacterProfile(node));
                }
            }
        } catch (e) {
            console.warn('Consistency: Failed to load God Mode data, skipping...');
        }

        // 2. 从卡片库提取人物卡片
        const cardLibrary = await StorageManager.getJSONAsync('novel_writer_card_library') || [];
        const characterCards = cardLibrary.filter((card: any) =>
            card.type === '人物' || card.type === '角色'
        );

        for (const card of characterCards) {
            // 检查是否已从 God Mode 提取，避免重复
            const existing = profiles.find(p => p.name === card.title);
            if (existing) {
                // 合并卡片信息到现有档案
                this.mergeCardToProfile(existing, card);
            } else {
                profiles.push(this.cardToCharacterProfile(card));
            }
        }

        // 3. 提取章节中的人物提及
        const chapters = await this.extractChapters();
        for (const profile of profiles) {
            profile.mentions = this.findCharacterMentions(profile.name, chapters);
            if (profile.mentions.length > 0) {
                profile.firstAppearance = Math.min(...profile.mentions.map(m => m.chapterNumber));
            }
        }

        return profiles;
    }

    /**
     * 从 God Mode 提取世界观设定
     */
    private async extractWorldSettings(): Promise<WorldSetting[]> {
        const settings: WorldSetting[] = [];

        try {
            const godModeCanvas = await StorageManager.getJSONAsync('novel_writer_godmode_canvas');
            if (godModeCanvas?.nodes) {
                const settingNodes = godModeCanvas.nodes.filter((node: any) =>
                    ['power', 'geo', 'faction', 'economy', 'culture'].includes(node.data.layer)
                );

                for (const node of settingNodes) {
                    settings.push(this.nodeToWorldSetting(node));
                }
            }
        } catch (e) {
             // Ignore
        }
        
        // Also try to load from Card Library (Type: World View/Setting)
        const cardLibrary = await StorageManager.getJSONAsync('novel_writer_card_library') || [];
        const worldCards = cardLibrary.filter((card: any) => 
            ['世界观', '设定', '地理', '势力'].includes(card.type)
        );
        
        for (const card of worldCards) {
             const existing = settings.find(s => s.name === card.title);
             if (!existing) {
                 settings.push({
                     id: card.id,
                     type: 'world' as any, // Simplified type mapping
                     name: card.title,
                     description: card.analysis || card.example || '',
                     rules: [],
                     mentions: []
                 });
             }
        }

        // 提取章节中的设定提及
        const chapters = await this.extractChapters();
        for (const setting of settings) {
            setting.mentions = this.findSettingMentions(setting.name, chapters);
        }

        return settings;
    }

    /**
     * 从 God Mode 提取时间线事件
     */
    private async extractTimeline(): Promise<TimelineEvent[]> {
        const events: TimelineEvent[] = [];

        try {
            const godModeCanvas = await StorageManager.getJSONAsync('novel_writer_godmode_canvas');
            if (godModeCanvas?.nodes) {
                const timelineNodes = godModeCanvas.nodes.filter(
                    (node: any) => node.data.layer === 'timeline'
                );

                for (const node of timelineNodes) {
                    events.push(this.nodeToTimelineEvent(node));
                }
            }
        } catch (e) {
            // Ignore
        }

        // 按章节号排序
        events.sort((a, b) => a.chapter - b.chapter);

        return events;
    }

    /**
     * 提取已写章节内容
     */
    private async extractChapters(): Promise<ChapterData[]> {
        const chapters: ChapterData[] = [];
        let loadedFromMax = false;

        // 1. 优先尝试 MAX Works (novel_writer_max_context_*)
        // 这支持从"万字冲刺"等模块选择的作品
        const activeWorkId = StorageManager.get('novel_writer_max_active_work');
        if (activeWorkId) {
            try {
                const context = await StorageManager.getJSONAsync(`novel_writer_max_context_${activeWorkId}`);
                if (context && Array.isArray(context.chapters) && context.chapters.length > 0) {
                    context.chapters.forEach((ch: any, idx: number) => {
                        if (ch.content) {
                            chapters.push({
                                number: idx + 1,
                                title: ch.title || `第 ${idx + 1} 章`,
                                content: ch.content,
                                wordCount: ch.content.length,
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            });
                        }
                    });
                    loadedFromMax = true;
                }
            } catch (e) {
                console.warn('Failed to load MAX work chapters', e);
            }
        }

        // 2. 如果未从 MAX 加载 (或没有选中的 MAX 作品)，尝试标准章节 (Module 7)
        if (!loadedFromMax) {
            const allChapters = await StorageManager.getJSONAsync('novel_writer_chapters') || {};
            for (const [key, value] of Object.entries(allChapters)) {
                const chapterData = value as any;
                if (chapterData.content) {
                    chapters.push({
                        number: chapterData.number || parseInt(key),
                        title: chapterData.title || `第 ${chapterData.number} 章`,
                        content: chapterData.content,
                        wordCount: chapterData.content.length,
                        createdAt: chapterData.createdAt || Date.now(),
                        updatedAt: chapterData.updatedAt || Date.now()
                    });
                }
            }
        }

        // 按章节号排序
        chapters.sort((a, b) => a.number - b.number);

        return chapters;
    }

    // ============ 转换辅助方法 ============

    private nodeToCharacterProfile(node: any): CharacterProfile {
        const props = node.data.props || {};
        return {
            id: node.id,
            name: node.data.name,
            appearance: this.parseArray(props.appearance || props.外貌),
            personality: this.parseArray(props.personality || props.性格),
            abilities: this.parseArray(props.abilities || props.能力),
            relationships: [],
            mentions: [],
            nodeId: node.id
        };
    }

    private cardToCharacterProfile(card: any): CharacterProfile {
        return {
            id: card.id,
            name: card.title,
            appearance: this.extractFeatures(card.analysis, '外貌'),
            personality: this.extractFeatures(card.analysis, '性格'),
            abilities: this.extractFeatures(card.analysis, '能力'),
            relationships: [],
            mentions: []
        };
    }

    private mergeCardToProfile(profile: CharacterProfile, card: any) {
        // 合并外貌、性格、能力信息
        const appearance = this.extractFeatures(card.analysis, '外貌');
        const personality = this.extractFeatures(card.analysis, '性格');
        const abilities = this.extractFeatures(card.analysis, '能力');

        profile.appearance = [...new Set([...profile.appearance, ...appearance])];
        profile.personality = [...new Set([...profile.personality, ...personality])];
        profile.abilities = [...new Set([...profile.abilities, ...abilities])];
    }

    private nodeToWorldSetting(node: any): WorldSetting {
        const props = node.data.props || {};
        return {
            id: node.id,
            type: node.data.layer as any,
            name: node.data.name,
            description: node.data.desc || '',
            rules: this.parseArray(props.rules || props.规则),
            mentions: [],
            nodeId: node.id
        };
    }

    private nodeToTimelineEvent(node: any): TimelineEvent {
        const props = node.data.props || {};
        return {
            id: node.id,
            chapter: props.chapter || 0,
            worldDate: props.worldDate || '',
            era: props.era || '',
            event: props.keyEvent || node.data.name,
            involvedCharacters: this.parseArray(props.characters),
            nodeId: node.id
        };
    }

    // ============ 提取辅助方法 ============

    private findCharacterMentions(name: string, chapters: ChapterData[]): ChapterMention[] {
        const mentions: ChapterMention[] = [];

        for (const chapter of chapters) {
            const indices = this.findAllIndices(chapter.content, name);
            for (const index of indices) {
                mentions.push({
                    chapterNumber: chapter.number,
                    chapterTitle: chapter.title,
                    excerpt: this.extractExcerpt(chapter.content, index, 50),
                    context: this.extractContext(chapter.content, index, 50),
                    position: index
                });
            }
        }

        return mentions;
    }

    private findSettingMentions(name: string, chapters: ChapterData[]): ChapterMention[] {
        // 类似 findCharacterMentions
        return this.findCharacterMentions(name, chapters);
    }

    private findAllIndices(text: string, keyword: string): number[] {
        const indices: number[] = [];
        let index = text.indexOf(keyword);
        while (index !== -1) {
            indices.push(index);
            index = text.indexOf(keyword, index + 1);
        }
        return indices;
    }

    private extractExcerpt(text: string, position: number, radius: number): string {
        const start = Math.max(0, position - radius);
        const end = Math.min(text.length, position + radius);
        return text.substring(start, end);
    }

    private extractContext(text: string, position: number, radius: number): string {
        return this.extractExcerpt(text, position, radius);
    }

    private parseArray(value: any): string[] {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            return value.split(/[,，、；;]/).map(s => s.trim()).filter(Boolean);
        }
        return [];
    }

    private extractFeatures(text: string, category: string): string[] {
        if (!text) return [];
        // 简单的特征提取，可以后续用 AI 优化
        const lines = text.split('\n');
        const features: string[] = [];

        for (const line of lines) {
            if (line.includes(category)) {
                const parts = line.split(/[:：]/);
                if (parts.length > 1) {
                    features.push(...this.parseArray(parts[1]));
                }
            }
        }

        return features;
    }
}

// 导出单例
export const consistencyExtractor = new ConsistencyExtractor();
