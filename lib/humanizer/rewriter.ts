import { HumanizeResult, HumanizeScore, Change } from './types';
import { aiDetector } from './detector';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

/**
 * 人性化改写器
 */
export class AIRewriter {

    /**
     * 执行人性化改写
     */
    async rewrite(text: string): Promise<HumanizeResult> {
        // 1. 分析原文
        const scoreBefore = aiDetector.analyze(text);

        // 2. 调用AI进行改写
        const rewritten = await this.callAIRewrite(text, scoreBefore);

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
    private async callAIRewrite(text: string, score: HumanizeScore): Promise<string> {
        // 获取API配置
        const provider = StorageManager.get(STORAGE_KEYS.CHAT_PROVIDER) || 'siliconflow';
        const storedKeys = StorageManager.getJSON('novel_writer_chat_provider_keys') || {};
        let apiKey = storedKeys[provider] || StorageManager.get(STORAGE_KEYS.CHAT_API_KEY) || '';

        if (!apiKey) {
            const savedKeys = StorageManager.getJSON(STORAGE_KEYS.SAVED_KEYS);
            if (Array.isArray(savedKeys)) {
                const fallback = savedKeys.find((k: any) => k.provider === provider);
                if (fallback) apiKey = fallback.key;
            }
        }

        const baseUrl = StorageManager.get(STORAGE_KEYS.CHAT_BASE_URL) ||
            StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) ||
            'https://api.siliconflow.cn/v1';
        const model = StorageManager.get(STORAGE_KEYS.CHAT_MODEL) || 'deepseek-ai/DeepSeek-V3';

        if (!apiKey) {
            throw new Error('未配置API密钥');
        }

        // 构建改写提示词
        const systemPrompt = this.buildSystemPrompt(score);

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
    private buildSystemPrompt(score: HumanizeScore): string {
        const issueDescriptions = score.issues.slice(0, 8).map(i =>
            `- ${i.title}: ${i.suggestion || ''}`
        ).join('\n');

        return `你是一位资深小说编辑，擅长将AI生成的生硬文本改写为生动自然的人类作品。请根据以下指导对文本进行深度润色。

【当前检测到的问题】
${issueDescriptions || '无明显结构性问题，请进行常规润色'}

【核心改写技巧】
1. 让比喻"落地"（针对抽象比喻）：
   - 拒绝：抽象名词堆砌（如"像宇宙黑洞吸走声音"）
   - 优化：具体事物 + 感官细节 + 场景反馈
   - 示例："目光像浸了冰的铁，凉得我后颈发僵"

2. 拆分长句（针对长句堆砌）：
   - 拒绝：长难句信息堆砌
   - 优化：按"动作/情绪/环境"拆分成3-4个短句，多用逗号断句
   - 示例：月光透过破旧窗棂，落在木桌上。少年握着信纸，想起往事。

3. 注入情绪（针对情绪悬浮）：
   - 拒绝：直接喊情绪词（如"她很绝望"）
   - 优化：用"动作细微变化 + 身体感官反应 + 环境互动"替代
   - 示例："手指攥得发白，指甲嵌进掌心，连疼都感觉不到"

4. 扫除冗余（针对冗余词汇）：
   - 删除"非常/极其/充满...气息/在...的时候"等空泛修饰

【输出要求】
- 保持原有人设和核心剧情不变
- 语气更加生活化，拒绝翻译腔
- 直接输出改写后的正文，**不要**包含任何解释、前缀或后缀
- 字数可根据描写需要适当调整（±30%）`;
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
