import { HumanizeResult, HumanizeScore, Change } from './types';
import { aiDetector } from './detector';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

export type RewriteMode = 'conservative' | 'balanced' | 'creative';

/**
 * 人性化改写器
 */
export class AIRewriter {

    /**
     * 执行人性化改写
     */
    async rewrite(text: string, mode: RewriteMode = 'balanced', config?: { apiKey?: string; baseUrl?: string; model?: string; customPrompt?: string; systemPrompt?: string }): Promise<HumanizeResult> {
        // 1. 分析原文
        const scoreBefore = aiDetector.analyze(text);

        // 2. 调用AI进行改写
        const rewritten = await this.callAIRewrite(text, scoreBefore, mode, config);

        // 3. 分析改写后
        const scoreAfter = aiDetector.analyze(rewritten);

        // 4. 生成变更记录
        const changes = this.detectChanges(text, rewritten);

        return {
            original: text,
            rewritten,
            scoreBefore,
            scoreAfter,
            changes
        };
    }

    /**
     * 调用AI进行人性化改写
     */
    private async callAIRewrite(text: string, score: HumanizeScore, mode: RewriteMode, config?: { apiKey?: string; baseUrl?: string; model?: string; customPrompt?: string; systemPrompt?: string }): Promise<string> {
        // 获取API配置
        let apiKey = config?.apiKey;
        let baseUrl = config?.baseUrl;
        let model = config?.model;
        let customPrompt = config?.customPrompt;
        let systemPromptOverride = config?.systemPrompt;

        // 如果没传配置，则尝试从 Storage 获取 (回退逻辑)
        if (!apiKey) {
            const provider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
            const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
            apiKey = storedKeys[provider] || StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';

            if (!apiKey) {
                const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
                if (Array.isArray(savedKeys)) {
                    const fallback = savedKeys.find((k: any) => k.provider === provider);
                    if (fallback) apiKey = fallback.key;
                }
            }
        }

        if (!baseUrl) {
            baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) ||
                StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) ||
                'https://api.siliconflow.cn/v1';
        }

        if (!model) {
            model = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || 'deepseek-ai/DeepSeek-V3';
        }

        if (!apiKey) {
            throw new Error('未配置API密钥');
        }

        // 构建改写提示词
        const systemPrompt = this.buildSystemPrompt(score, mode, customPrompt);

        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`AI请求失败: ${response.status}`);
        }

        const data = await response.json();

        // 记录Token使用
        if (data.usage) {
            await StorageManager.addTokenUsage(
                provider,
                model,
                data.usage.prompt_tokens,
                data.usage.completion_tokens
            );
        }

        return data.choices?.[0]?.message?.content || text;
    }

    /**
     * 构建改写提示词
     */
    public buildSystemPrompt(score: HumanizeScore | null, mode: RewriteMode, customPrompt?: string): string {
        const issueDescriptions = score?.issues?.slice(0, 8).map(i =>
            `- ${i.title}: ${i.suggestion || ''}`
        ).join('\n') || '';

        const basePrompt = `你是一位资深小说编辑，擅长将AI生成的生硬文本改写为生动自然的人类作品。
请根据以下【改写模式】的要求，对文本进行润色。

【当前检测到的问题】
${issueDescriptions || '无明显结构性问题，请进行常规润色'}

【全局重要原则】
1. **禁止缩写**：无论选择何种模式，都必须**完整保留原文的所有情节、对话和细节**。
2. **长文处理**：原文可能很长（5000字以上），请务必耐心处理，**严禁进行摘要、概括或截断**。如果原文很长，请输出足够长的内容以匹配原文。
3. **字数对齐**：输出字数必须与原文高度接近，严禁大幅度删减字数（除非是明显的废话重复）。

`;

        let finalPrompt = '';

        if (mode === 'conservative') {
            finalPrompt = basePrompt + `
【改写模式：保守 (Conservative)】
核心原则：**最大程度保留原文信息，严禁删减情节和细节。**

【改写要求】
1. **去翻译腔**：将“当...的时候”、“被...”等翻译腔句式改为中文习惯表达。
2. **优化连接词**：删除生硬的逻辑连接词（如“首先、其次、总而言之”），用自然叙述衔接。
3. **句式微调**：仅在句子极其拗口时进行拆分，否则保持原句结构。
4. **字数控制**：严格控制字数变化在 ±5% 以内，**绝对禁止缩写**。

【输出要求】
- 直接输出改写后的正文。
- **不要**删减任何原文中的动作、对话或环境描写。
- **严禁**只输出前几段或进行总结。`;
        } else if (mode === 'creative') {
            finalPrompt = basePrompt + `
【改写模式：强力 (Creative)】
核心原则：**打破AI的工整感，追求沉浸式体验，允许大幅重写，但必须保留所有核心情节。**

【改写技巧】
1. **Show, Don't Tell**：将所有概括性描述（如“他很生气”）改为具体的动作和感官描写（如“他把烟头狠狠按在桌上”）。
2. **打碎结构**：彻底打破原文的排比句和工整结构，使用长短句交替，增加节奏感。
3. **增加“杂质”**：加入一些看似无关紧要但增加真实感的环境细节（如空气中的灰尘、远处的车鸣）。
4. **口语化**：让对话和心理活动更加碎片化、口语化，去掉书面语。

【输出要求】
- 允许为了更好的效果重写整个段落。
- 字数可根据描写需要灵活调整（±10%），**严禁大幅缩减**。
- 拒绝任何AI常用的陈词滥调。
- **严禁**因为追求创意而丢失原文的剧情点。`;
        } else {
            // Balanced (Default)
            finalPrompt = basePrompt + `
【改写模式：平衡 (Balanced)】
核心原则：**在保留核心信息的前提下，提升文学性和自然度。**

【核心改写技巧】
1. **让比喻"落地"**：
   - 拒绝：抽象名词堆砌（如"像宇宙黑洞吸走声音"）
   - 优化：具体事物 + 感官细节 + 场景反馈
   - 示例："目光像浸了冰的铁，凉得我后颈发僵"

2. **拆分长句**：
   - 拒绝：长难句信息堆砌
   - 优化：按"动作/情绪/环境"拆分成3-4个短句，多用逗号断句
   - 示例：月光透过破旧窗棂，落在木桌上。少年握着信纸，想起往事。

3. **注入情绪**：
   - 拒绝：直接喊情绪词（如"她很绝望"）
   - 优化：用"动作细微变化 + 身体感官反应 + 环境互动"替代
   - 示例："手指攥得发白，指甲嵌进掌心，连疼都感觉不到"

4. **扫除冗余**：
   - 删除"非常/极其/充满...气息/在...的时候"等空泛修饰

【输出要求】
- 保持原有人设和核心剧情不变。
- 语气更加生活化，拒绝翻译腔。
- 直接输出改写后的正文，**不要**包含任何解释、前缀或后缀。
- 字数尽量保持稳定（±10%），避免大量删减。
- **严禁**进行摘要式改写。`;
        }

        if (customPrompt) {
            finalPrompt += `\n\n【用户额外指令】\n请务必遵守以下用户指定的特殊要求：\n${customPrompt}`;
        }

        return finalPrompt;
    }

    /**
     * 检测文本变化
     */
    private detectChanges(original: string, rewritten: string): Change[] {
        const changes: Change[] = [];

        // 简单实现：检测长度变化
        if (rewritten.length !== original.length) {
            changes.push({
                type: rewritten.length > original.length ? 'insert' : 'delete',
                original: `${original.length}字`,
                replacement: `${rewritten.length}字`,
                reason: '字数调整'
            });
        }

        // 检测感叹号变化
        const exclBefore = (original.match(/！/g) || []).length;
        const exclAfter = (rewritten.match(/！/g) || []).length;
        if (exclAfter < exclBefore) {
            changes.push({
                type: 'replace',
                original: `${exclBefore}个感叹号`,
                replacement: `${exclAfter}个感叹号`,
                reason: '减少感叹号使用'
            });
        }

        return changes;
    }
}

// 导出单例
export const aiRewriter = new AIRewriter();
