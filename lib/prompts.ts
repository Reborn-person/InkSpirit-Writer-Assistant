export type PromptConfig = {
  title: string;
  description: string;
  system: string;
  userTemplate: (data: any) => string;
};

export const PROMPTS: Record<string, PromptConfig> = {
  module0_5: {
    title: "模块0.5：拆书模块",
    description: "分析和拆解优秀小说的结构、技巧和创作手法。",
    system: '',
    userTemplate: (data: any) => `${data.novelContent || ''}`
  },
  module1: {
    title: "模块1：脑洞具象化",
    description: "将模糊的脑洞转化为结构化的创作基础。",
    system: '',
    userTemplate: (data: any) => `
- 脑洞描述：${data.brainhole}
- 核心元素：${data.elements}
- 目标受众：${data.audience}
- 风格基调：${data.style}
- 限制条件：${data.constraints}
- 超级长篇要求：${data.longReq}`.trim()
  },
  module2: {
    title: "模块2：超级长篇大纲生成",
    description: "生成500章+完整大纲，搭建三幕式结构。",
    system: '',
    userTemplate: (data: any) => `
- 结构化脑洞方案：${data.module1Output}
- 开篇类型：${data.openingType === '自定义' ? (data.customOpeningType || '自定义') : data.openingType}
- 情节密度：${data.density}
- 必含情节：${data.requiredPlots}`.trim()
  },
  module2_5: {
    title: "模块2.5：详细细纲生成 (蓝图骨架)",
    description: "基于三弧合一（人物+情节+情绪）生成深度细纲。",
    system: '',
    userTemplate: (data: any) => `
- 超级长篇大纲：${data.module2Output}
- 情节分布表（故事链）：${data.plotTable}
- 伏笔清单：${data.foreshadowingList}
- 节奏表（情绪链）：${data.pacingTable}
- 章节范围：${data.chapterRange}`.trim()
  },
  module3: {
    title: "模块3：高留存开篇生成",
    description: "创作高留存率的前三章内容。",
    system: '',
    userTemplate: (data: any) => `
- 超级长篇大纲：${data.module2Output}
- 超级长篇细纲（前3章）：${data.module2_5Output}
- 开篇类型：${data.openingType === '自定义' ? (data.customOpeningType || '自定义') : data.openingType}
- 分镜头风格：${data.shotStyle}
- 核心设定：${data.coreSettings}`.trim()
  },
  module4: {
    title: "模块4：后续章节批量生成",
    description: "基于细纲批量生成后续章节。",
    system: '',
    userTemplate: (data: any) => `
- 已生成内容：${data.previousContent}
- 超级长篇细纲（可编辑版）：${data.module2_5Output}
- 大纲情节分布表：${data.plotTable}
- 伏笔清单：${data.foreshadowingList}
- 节奏表：${data.pacingTable}
- 章节范围：${data.chapterRange}
- 字数要求：${data.wordCount}`.trim()
  },
  module5: {
    title: "模块5：仿写创作",
    description: "模仿特定风格进行原创内容创作。",
    system: '',
    userTemplate: (data: any) => `
- 结构化脑洞方案：${data.module1Output}
- 仿写原著信息：${data.originalInfo}
- 原著参考片段：${data.referenceFragment}
- 仿写内容类型：${data.imitationType}
- 章节范围/字数要求：${data.rangeOrWordCount}
- 原著长篇结构参考：${data.structureRef}`.trim()
  },
  module6: {
    title: "模块6：全文润色与精修",
    description: "对初稿进行文字润色、逻辑修复和风格统一。",
    system: '',
    userTemplate: (data: any) => `
- 初稿内容：${data.draft}
- 核心设定：${data.coreSettings}
- 修改后大纲：${data.modifiedOutline}
- 润色风格：${data.polishStyle}
- 需修正的问题：${data.issuesToFix}`.trim()
  },
  module7: {
    title: "模块7：AI 辅助写作编辑器 (Copilot)",
    description: "双模型驱动的智能写作助手：RAG 负责大纲人设，Writing 负责预测续写。",
    system: ``, // This system prompt is dynamically generated in the component based on RAG context
    userTemplate: (data: any) => `` // Not used in the standard way for this module
  },
  module8: {
    title: "模块8：文章评审与诊断",
    description: "全维度评估文章质量，提供评分、问题诊断及修改建议。",
    system: '',
    userTemplate: (data: any) => `评审请求：
- 文章内容：${data.articleContent}
- 题材类型：${data.genre || '未指定'}
- 目标受众：${data.audience || '未指定'}
- 核心卖点：${data.sellingPoint || '未指定'}（作者自认为的亮点）
- 重点关注：${data.focusArea || '全面体检'}（希望重点评审的方面）`
  },
  module_max: {
    title: "Max 创作中心",
    description: "集成了开篇生成、批量创作、风格仿写与全文润色的一站式创作工作台。",
    system: "",
    userTemplate: (data: any) => ""
  },
  module9: {
    title: "模块9：提示词炼金工坊",
    description: "多模型对抗与迭代：双模型生成提示词，独立模型评审打分，打造完美提示词。",
    system: "",
    userTemplate: (data: any) => ""
  },
  module10: {
    title: "模块10：提示词管理中心",
    description: "集中管理所有模块的提示词模板，支持导入导出和自定义配置。",
    system: "",
    userTemplate: (data: any) => ""
  },
  module11: {
    title: "模块11：创作备忘录",
    description: "全能创作知识库：存储人设、世界观、词库、热梗、技巧、参考素材等。",
    system: "",
    userTemplate: (data: any) => ""
  }
};
