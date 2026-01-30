import {
    HumanizeScore,
    Issue,
    IssueType,
    DetectionConfig,
    DEFAULT_CONFIG,
    REDUNDANT_WORDS,
    ABSTRACT_METAPHOR_KEYWORDS,
    EMOTION_WORDS
} from './types';

/**
 * AI特征检测器
 */
export class AIDetector {
    private config: DetectionConfig;

    constructor(config: Partial<DetectionConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 分析文本并返回AI率评分
     */
    analyze(text: string): HumanizeScore {
        const issues: Issue[] = [];

        // 运行各项检测
        issues.push(...this.detectParallelism(text));
        issues.push(...this.detectRepetition(text));
        issues.push(...this.detectExclamation(text));
        issues.push(...this.detectExaggeration(text));

        // 新增检测
        issues.push(...this.detectRedundantWords(text));
        issues.push(...this.detectAbstractMetaphor(text));
        issues.push(...this.detectLongSentence(text));
        issues.push(...this.detectEmotionFloating(text));

        // 计算各维度分数
        const breakdown = this.calculateBreakdown(text, issues);

        // 计算总分
        const overall = this.calculateOverall(breakdown, issues);

        return { overall, breakdown, issues };
    }

    /**
     * 检测排比句过多
     */
    private detectParallelism(text: string): Issue[] {
        const issues: Issue[] = [];
        const sentences = text.split(/[。！？]/);

        let parallelCount = 0;
        let parallelStart = 0;

        for (let i = 1; i < sentences.length; i++) {
            const prev = sentences[i - 1].trim();
            const curr = sentences[i].trim();

            if (this.isSimilarStructure(prev, curr)) {
                if (parallelCount === 0) parallelStart = i - 1;
                parallelCount++;
            } else {
                if (parallelCount >= this.config.parallelismThreshold) {
                    const excerpt = sentences.slice(parallelStart, i).join('。') + '。';
                    issues.push({
                        id: `para-${parallelStart}`,
                        type: 'parallelism',
                        severity: parallelCount >= 4 ? 'high' : 'medium',
                        title: `连续 ${parallelCount + 1} 个排比句`,
                        description: '过多排比句是AI生成的典型特征，建议拆解为不同句式',
                        position: { start: 0, end: 0 },
                        excerpt: excerpt.slice(0, 100) + '...',
                        suggestion: '拆解为不同句式，添加过渡词和细节描写'
                    });
                }
                parallelCount = 0;
            }
        }

        return issues;
    }

    /**
     * 检测词汇重复
     */
    private detectRepetition(text: string): Issue[] {
        const issues: Issue[] = [];
        const words = this.extractWords(text);
        const windowSize = this.config.repetitionWindow;

        // 滑动窗口检测
        const wordCount: Map<string, number[]> = new Map();

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (word.length < 2) continue; // 跳过单字

            if (!wordCount.has(word)) {
                wordCount.set(word, []);
            }
            wordCount.get(word)!.push(i);
        }

        // 检查重复词
        wordCount.forEach((positions, word) => {
            if (positions.length >= this.config.repetitionThreshold) {
                // 检查是否在短距离内重复
                for (let i = 0; i < positions.length - 1; i++) {
                    const distance = positions[i + 1] - positions[i];
                    if (distance < 20) { // 20个词内重复
                        issues.push({
                            id: `rep-${word}-${i}`,
                            type: 'repetition',
                            severity: 'medium',
                            title: `"${word}"重复出现`,
                            description: `该词在短距离内出现了${positions.length}次`,
                            position: { start: 0, end: 0 },
                            excerpt: word,
                            suggestion: `使用同义词替换或省略，如：${this.getSynonyms(word)}`
                        });
                        break;
                    }
                }
            }
        });

        return issues;
    }

    /**
     * 检测感叹号滥用
     */
    private detectExclamation(text: string): Issue[] {
        const issues: Issue[] = [];

        const exclamations = (text.match(/！/g) || []).length;
        const allPunctuation = (text.match(/[。！？，、；：]/g) || []).length;

        if (allPunctuation === 0) return issues;

        const ratio = exclamations / allPunctuation;

        if (ratio > this.config.exclamationRatio) {
            issues.push({
                id: 'excl-overall',
                type: 'exclamation',
                severity: ratio > 0.5 ? 'high' : 'medium',
                title: '感叹号使用过多',
                description: `感叹号占标点${(ratio * 100).toFixed(1)}%，正常人写作约为10-20%`,
                position: { start: 0, end: 0 },
                excerpt: '',
                suggestion: '将部分感叹号改为句号或逗号，保持语气平和'
            });
        }

        return issues;
    }

    /**
     * 检测浮夸表达
     */
    private detectExaggeration(text: string): Issue[] {
        const issues: Issue[] = [];

        for (const word of this.config.exaggerationWords) {
            const regex = new RegExp(word, 'g');
            const matches = text.match(regex);

            if (matches && matches.length >= 2) {
                issues.push({
                    id: `exag-${word}`,
                    type: 'exaggeration',
                    severity: matches.length >= 4 ? 'high' : 'low',
                    title: `浮夸词"${word}"出现${matches.length}次`,
                    description: '过多使用强调词会显得不自然',
                    position: { start: 0, end: 0 },
                    excerpt: word,
                    suggestion: `替换为更平实的表达，或直接删除`
                });
            }
        }

        return issues;
    }

    // ============ 新增检测方法 ============

    /**
     * 检测冗余词汇
     */
    private detectRedundantWords(text: string): Issue[] {
        const issues: Issue[] = [];

        for (const word of REDUNDANT_WORDS) {
            // 处理包含...的模式
            const pattern = word.replace('……', '.+?');
            const regex = new RegExp(pattern, 'g');
            const matches = text.match(regex);

            if (matches && matches.length >= 2) {
                issues.push({
                    id: `redundant-${word}`,
                    type: 'redundant_words',
                    severity: 'low',
                    title: `冗余词"${word}"出现${matches.length}次`,
                    description: '删除空泛修饰词，保留核心信息',
                    position: { start: 0, end: 0 },
                    excerpt: word,
                    suggestion: '直接删除或替换为具体描写'
                });
            }
        }

        return issues;
    }

    /**
     * 检测抽象比喻
     */
    private detectAbstractMetaphor(text: string): Issue[] {
        const issues: Issue[] = [];

        // 检测"像"字比喻
        const metaphorPattern = /([^，。！？]{2,10})(像|如同|仿佛|好似)([^，。！？]{2,20})/g;
        const matches = [...text.matchAll(metaphorPattern)];

        for (const match of matches) {
            const metaphorPart = match[3];

            // 检查是否包含抽象关键词
            const hasAbstract = ABSTRACT_METAPHOR_KEYWORDS.some(kw => metaphorPart.includes(kw));

            if (hasAbstract) {
                issues.push({
                    id: `abstract-metaphor-${match.index}`,
                    type: 'abstract_metaphor',
                    severity: 'medium',
                    title: '抽象比喻缺乏场景感',
                    description: '比喻应绑定具体场景和感官体验',
                    position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
                    excerpt: match[0],
                    suggestion: '用具体事物+感官细节+场景反馈替换（如：目光像浸了冰的铁）'
                });
            }
        }

        return issues;
    }

    /**
     * 检测长句堆砌
     */
    private detectLongSentence(text: string): Issue[] {
        const issues: Issue[] = [];
        const sentences = text.split(/[。！？]/);

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();

            // 检测"的地得"密度
            const deCount = (sentence.match(/[的地得]/g) || []).length;
            const deRatio = deCount / Math.max(sentence.length, 1);

            // 长度超过50字且"的地得"占比超过15%
            if (sentence.length > 50 && deRatio > 0.15) {
                issues.push({
                    id: `long-sentence-${i}`,
                    type: 'long_sentence',
                    severity: sentence.length > 80 ? 'high' : 'medium',
                    title: `长句堆砌（${sentence.length}字，${deCount}个"的地得"）`,
                    description: '信息堆砌，节奏拖沓',
                    position: { start: 0, end: 0 },
                    excerpt: sentence.slice(0, 50) + '...',
                    suggestion: '拆成3-4个短句，每句聚焦一个核心（环境/动作/心理）'
                });
            }
        }

        return issues;
    }

    /**
     * 检测情绪悬浮
     */
    private detectEmotionFloating(text: string): Issue[] {
        const issues: Issue[] = [];

        for (const emotionWord of EMOTION_WORDS) {
            const regex = new RegExp(`(很|非常|十分|极其|特别)?(${emotionWord})`, 'g');
            const matches = [...text.matchAll(regex)];

            if (matches.length >= 2) {
                issues.push({
                    id: `emotion-${emotionWord}`,
                    type: 'emotion_floating',
                    severity: 'medium',
                    title: `直接喊情绪词"${emotionWord}"（${matches.length}次）`,
                    description: '情绪不直接说，而是通过细节让读者感知',
                    position: { start: 0, end: 0 },
                    excerpt: emotionWord,
                    suggestion: '用"动作+感官+场景互动"表达（如：肩膀一抽一抽的，眼泪砸在地上）'
                });
            }
        }

        return issues;
    }

    // ============ 辅助方法 ============

    private isSimilarStructure(s1: string, s2: string): boolean {
        if (!s1 || !s2 || s1.length < 5 || s2.length < 5) return false;

        // 简单判断：句尾相似或长度相近
        const ending1 = s1.slice(-3);
        const ending2 = s2.slice(-3);
        const lenDiff = Math.abs(s1.length - s2.length);

        return ending1 === ending2 || lenDiff < 5;
    }

    private extractWords(text: string): string[] {
        // 简单分词（中文按字分割，后续可用分词库）
        return text.split(/[\s，。！？、；：""''【】（）《》\n]+/)
            .filter(w => w.length >= 2);
    }

    private getSynonyms(word: string): string {
        // 简单同义词表
        const synonyms: Record<string, string[]> = {
            '震撼': ['触动', '感染', '打动'],
            '惊天': ['巨大', '重大', '显著'],
            '无敌': ['强大', '厉害', '出众'],
            '瞬间': ['片刻', '须臾', '一会'],
            '顿时': ['随即', '继而', '紧接着'],
        };

        return synonyms[word]?.slice(0, 2).join('、') || '(无建议)';
    }

    private calculateBreakdown(text: string, issues: Issue[]) {
        const parallelIssues = issues.filter(i => i.type === 'parallelism').length;
        const repetitionIssues = issues.filter(i => i.type === 'repetition').length;
        const exclamationIssues = issues.filter(i => i.type === 'exclamation').length;
        const exaggerationIssues = issues.filter(i => i.type === 'exaggeration').length;

        // 新增维度影响
        const structureIssues = parallelIssues + issues.filter(i => i.type === 'long_sentence' || i.type === 'redundant_words').length;
        const emotionIssues = exaggerationIssues + exclamationIssues + issues.filter(i => i.type === 'emotion_floating').length;
        const detailIssues = issues.filter(i => i.type === 'abstract_metaphor' || i.type === 'lack_detail').length;

        return {
            repetition: Math.max(0, 100 - repetitionIssues * 15),
            structure: Math.max(0, 100 - structureIssues * 15),
            vocabulary: Math.max(0, 100 - (repetitionIssues + exaggerationIssues) * 10),
            emotion: Math.max(0, 100 - emotionIssues * 15),
            detail: Math.max(0, 100 - detailIssues * 20)
        };
    }

    private calculateOverall(breakdown: any, issues: Issue[]): number {
        const weights = { repetition: 0.2, structure: 0.25, vocabulary: 0.2, emotion: 0.2, detail: 0.15 };
        let score = 0;

        for (const [key, weight] of Object.entries(weights)) {
            score += breakdown[key] * weight;
        }

        // 根据问题数量扣分
        const penalty = issues.filter(i => i.severity === 'high').length * 5 +
            issues.filter(i => i.severity === 'medium').length * 2;

        return Math.max(0, Math.round(score - penalty));
    }
}

// 导出单例
export const aiDetector = new AIDetector();
