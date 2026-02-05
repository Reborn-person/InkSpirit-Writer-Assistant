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
    userTemplate: (data: any) => `拆书分析请求：
- 小说内容/片段：${data.novelContent || ''}
- 任务要求：请对上述内容进行深度的“拆书分析”。
- 重点关注：结构、人物、技巧、语言、题材等维度的全面拆解。
- 输出目标：帮助我理解这段内容的优秀之处，并提取可复用的写作技巧。`
  },
  module1: {
    title: "模块1：脑洞具象化",
    description: "将模糊的脑洞转化为结构化的创作基础。",
    system: '',
    userTemplate: (data: any) => `用户输入信息：
- 脑洞描述：${data.brainhole}
- 核心元素：${data.elements}
- 目标受众：${data.audience}（女频/男频/全年龄）
- 风格基调：${data.style}（如：东方仙侠/都市脑洞/悬疑灵异/克苏鲁/无限流/赛博朋克/历史穿越等）
- 限制条件：${data.constraints}
- 超级长篇要求：${data.longReq}（大阶段数量/必含辅线）`
  },
  module2: {
    title: "模块2：超级长篇大纲生成",
    description: "生成500章+完整大纲，搭建三幕式结构。",
    system: '',
    userTemplate: (data: any) => `输入信息：
- 结构化脑洞方案：${data.module1Output}
- 开篇类型：${data.openingType === '自定义' ? (data.customOpeningType || '自定义') : data.openingType}（万能冲突/悬念做局/人设做局/日常乱做局/自定义）
- 情节密度：${data.density}（中密度默认）
- 必含情节：${data.requiredPlots}`
  },
  module2_5: {
    title: "模块2.5：详细细纲生成 (蓝图骨架)",
    description: "基于三弧合一（人物+情节+情绪）生成深度细纲。",
    system: '',
    userTemplate: (data: any) => `输入信息：
- 超级长篇大纲：${data.module2Output}
- 情节分布表（故事链）：${data.plotTable}
- 伏笔清单：${data.foreshadowingList}
- 节奏表（情绪链）：${data.pacingTable}
- 章节范围：${data.chapterRange}（建议每次生成10-20章，保持高质量）`
  },
  module3: {
    title: "模块3：高留存开篇生成",
    description: "创作高留存率的前三章内容。",
    system: '',
    userTemplate: (data: any) => `输入信息：
- 超级长篇大纲：${data.module2Output}
- 超级长篇细纲（前3章）：${data.module2_5Output}
- 开篇类型：${data.openingType === '自定义' ? (data.customOpeningType || '自定义') : data.openingType}
- 分镜头风格：${data.shotStyle}（电影级/简洁级）
- 核心设定：${data.coreSettings}`
  },
  module4: {
    title: "模块4：后续章节批量生成",
    description: "基于细纲批量生成后续章节。",
    system: '',
    userTemplate: (data: any) => `输入信息：
- 已生成内容：${data.previousContent}
- 超级长篇细纲（可编辑版）：${data.module2_5Output}
- 大纲情节分布表：${data.plotTable}
- 伏笔清单：${data.foreshadowingList}
- 节奏表：${data.pacingTable}
- 章节范围：${data.chapterRange}（需与细纲章节范围一致）
- 字数要求：${data.wordCount}`
  },
  module5: {
    title: "模块5：仿写创作",
    description: "模仿特定风格进行原创内容创作。",
    system: '',
    userTemplate: (data: any) => `输入信息：
- 结构化脑洞方案：${data.module1Output}
- 仿写原著信息：${data.originalInfo}（名称+风格）
- 原著参考片段：${data.referenceFragment}
- 仿写内容类型：${data.imitationType}（大纲/细纲/开篇/后续章节）
- 章节范围/字数要求：${data.rangeOrWordCount}
- 原著长篇结构参考：${data.structureRef}`
  },
  module6: {
    title: "模块6：全文润色与精修",
    description: "对初稿进行文字润色、逻辑修复和风格统一。",
    system: '',
    userTemplate: (data: any) => `输入信息：
- 初稿内容：${data.draft}
- 核心设定：${data.coreSettings}
- 修改后大纲：${data.modifiedOutline}
- 润色风格：${data.polishStyle}
- 需修正的问题：${data.issuesToFix}`
  },
  module7: {
    title: "模块7：AI 辅助写作编辑器 (Copilot)",
    description: "全功能 AI 写作助手，支持扩写、润色、续写等功能。",
    system: '',
    userTemplate: (data: any) => `（此模块使用独立编辑器界面，不使用标准模板）`
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
    title: "Max 创作中心 - 大纲生成",
    description: "Max 创作中心的大纲生成提示词配置。",
    system: "你是资深网文主编，擅长深度融合提供的设定资料，根据创意生成节奏紧凑、期待感强且信息密度高的章节细纲。你能够自然地将资料中的细节、逻辑或元素内化到故事中，绝不生硬地提及“卡牌”或“资料来源”。",
    userTemplate: (data: any) => `任务：根据核心创意生成章节细纲。
核心创意：${data.idea}
世界观/设定参考：${data.worldSetting || '无'}
参考设定/背景资料：
${data.cardContext}

输出要求：
1. 章节按顺序输出，每章以"第X章 章节标题"开头，其后是该章细纲正文。
2. 章节数量目标：${data.chapterCount}章。
3. **深度融合**：将资料中的细节、逻辑或角色元素自然融入剧情，严禁提及"卡牌"、"资料来源"、"根据设定"等字眼。`
  },
  module_max_tracking: {
    title: "Max 创作中心 - 角色追踪",
    description: "根据章节内容自动更新角色状态的 JSON 数据。",
    system: `你是一位严谨的数据管理员，负责追踪小说角色的状态。
你的任务是根据【上一版角色状态JSON】和【最新章节正文】，更新JSON数据。

【更新原则】
1. 基于旧JSON修改，提取等级/技能/物品/关系/事件。
2. 数值合逻辑，剧情简洁。
3. 状态检测：
   - 死亡(死/亡/殒/牺/阵) → status: "死亡"
   - 被困(困/封/囚/禁) → status: "被困"
   - 失踪(消失/失踪/不知所踪) → status: "失踪"
   - 离开(离/远走/离去) → status: "离开"
   - 受伤(重伤/昏迷/中毒) → status: "受伤"
   - 特殊(残魂/元神/灵体) → status: "活跃", status_detail: "残魂状态..."
   - 出场 → 更新 last_appearance (当前章节数) 和 appearance_count (+1)
   - 新角色 → 添加到列表，type: "临时"
4. 自动管理：
   - 临时角色 type="临时" 且 5章+未出场 且 importance="低" 且 本章未提及 → 删除
   - 角色总数 > 20 时，仅更新本章出场 + 所有主要角色 + 本章提及角色，其他复制旧状态
   - 角色总数 > 20 时，减少添加不重要的临时角色

【JSON格式要求(极其重要)】
1. 输出标准JSON，从 { 开始到 } 结束。
2. 严禁使用 \`\`\`json 代码块标记。
3. 字符串用双引号。
4. 无注释。`,
    userTemplate: (data: any) => `输入信息：
- 上一版角色状态JSON：${data.currentJSON}
- 最新章节标题：${data.chapterTitle}
- 最新章节正文：${data.chapterContent}`
  },
  module_max_consistency_vector: {
    title: "Max 一致性检查 - 向量冲突检测",
    description: "用于检测当前文本与已知背景的逻辑冲突。",
    system: "你是一致性检查助手。请判断[当前文本]是否与[已知背景]存在逻辑冲突。如果不冲突，返回NULL。如果冲突，请简要说明。",
    userTemplate: (data: any) => `（此模块使用独立界面）`
  },
  module_max_consistency_appearance: {
    title: "Max 一致性检查 - 外貌冲突检测",
    description: "用于检测角色外貌描写是否前后矛盾。",
    system: "你是专业的小说编辑，擅长发现文本中的逻辑矛盾。",
    userTemplate: (data: any) => `（此模块使用独立界面）`
  },
  module_max_outline: {
    title: "Max 创作中心 - 大纲范式",
    description: "为 Max 大纲生成页面提供结构范式（Paradigm）。",
    system: `【通用商业大纲范式】
一、粗纲（整书 / 大卷核心框架，定全局根基，必填！） 
 粗纲是整书的「总设计图」，回答「写什么、主角是谁、最终去哪、核心爽点 / 情感线是什么」，要素极简但不可缺，AI 工具中可设为 全局锁定项 ，避免后续生成逻辑断裂。 
 
 核心设定（网文的「底层规则」） 
 人设核心：主角标签 + 金手指（核心优势，男频如系统 / 天赋，女频如空间 / 重生记忆）+ 核心执念（逆袭 / 复仇 / 追爱 / 搞事业）；配角核心标签（反派的恶点、盟友的价值、情感线对象的苏点 / 虐点）。 
 世界观设定：核心规则（男频如修炼体系 / 都市异能等级，女频如朝代制度 / 穿书世界规则）+ 核心舞台（玄幻的宗门 / 星域，现言的职场 / 校园）。 
 核心限制：主角的初始困境（被轻视 / 家破人亡 / 穿成炮灰）+ 世界观的核心矛盾（正邪对立 / 宅斗家族内斗 / 甜宠的误会隔阂）。 
 
 核心主线（一条贯穿到底，不搞多线混乱） 
 一句话概括：主角从【初始状态】，凭借【金手指 / 自身能力】，解决【一系列核心冲突】，最终达成【核心目标】 
 （例：玄幻男频「废柴少年得上古系统，闯宗门、战天骄、夺资源，最终登顶仙域」；女频甜宠「穿成炮灰的社畜，凭借美食技能撩上高冷总裁，化解家族算计，最终双向奔赴搞事业」）。 
 
 剧情四大核心节点（整书节奏锚点） 
 按「开局 - 发展 - 高潮 - 结局」划分，每个节点定核心事件，适配网文「小爽叠大爽」的节奏： 
 开局：黄金三章落地，主角脱离初始困境，展现金手指，立住人设； 
 发展：主角积累实力 / 资源 / 情感，解锁新舞台，遭遇更强反派 / 更大冲突，配角陆续登场并完成立场定型； 
 高潮：主角直面最终反派 / 核心矛盾（如宗门灭门之仇 / 家族终极宅斗 / 情感线的生死考验），拼尽实力 / 智慧解决，达成阶段性巅峰； 
 结局：主角完成核心执念（登顶 / 复仇 / 圆满），人物弧光收尾，世界观闭环（开放式 / 圆满式 / 续集钩子式均可）。 
 
 核心爽点 / 情感线主线（网文的「读者粘性核心」） 
 男频：定爽点主线（如打脸天骄、越级挑战、资源掠夺、势力扩张），明确「大爽点」出现的节点（如宗门大比、跨域征战）； 
 女频：定情感线 / 成长主线（如双向奔赴、手撕白莲、宅斗上位、事业逆袭），明确「甜点 / 虐点 / 爽点」的核心走向（如先虐后甜、全程甜宠、手撕渣贱后搞事业）。 
 
 二、中纲（篇章 / 剧情单元框架，控节奏，网文核心层级！） 
 将粗纲拆解为 若干个独立但衔接的剧情单元 （按「卷 」划分，每单元对应 10-20 章，适配网文「每 10-20 章一个中爽点」的规律），是粗纲落地的关键，也是 AI「剧情单元生成」的核心依据。 
 
 每个中纲单元必须包含 6 个要素，且 单元结尾需留「大钩子」，支撑读者追更下一个单元： 
 单元核心目标：本卷 / 本篇要达成的具体结果（如「主角进入内门」「手撕白莲花继妹」「和男主确定关系」）； 
 核心冲突 / 爽点：围绕目标的核心矛盾（如「内门考核被针对」「继妹设计陷害」）+ 本单元的中爽点（如「考核打脸考官，强势进内门」「当众揭穿继妹，让其身败名裂」）； 
 关键情节节点：3-5 个支撑单元目标的核心事件（按「起 - 承 - 转 - 合」排列，例：「考核报名被嘲讽→暗中修炼提升→考核遇刁难→爆发实力打脸→成功进内门」）； 
 人物弧光 / 关系变化：主角的实力 / 身份 / 心态提升（如「从外门废柴到内门天才」）+ 核心人物关系变化（如「和男主从陌生到暧昧」「和反派的矛盾升级为死仇」）； 
 章数规划：本单元的总章数，明确「小爽点」分布位置（每 3-5 章一个，例：20 章的单元，在 5/10/15 章各设一个小爽点）； 
 单元结尾钩子：本单元完成目标后，抛出新的危机 / 未知 / 期待（如「进内门后被宗门长老盯上」「手撕继妹后，继母设下更大的圈套」）。`,
    userTemplate: (data: any) => `任务：生成小说大纲。
核心创意：${data.idea}
章节规模目标：${data.chapterCount}章
大纲生成范式（最高优先级，完全遵循）：
${data.paradigm}

输出要求：
1. 按阶段或卷划分结构，并标注阶段目标与节奏变化。
2. 每个阶段给出关键剧情节点与人物推进要点。
3. 如果范式要求具体格式或章节数，以范式为准。
4. 仅输出大纲正文，不要额外解释。`
  },
  module9: {
    title: "模块9：炼丹炉 (Prompt 优化)",
    description: "专业的提示词优化与测试工具。",
    system: "你是一个专业的 Prompt 工程师...",
    userTemplate: (data: any) => `（此模块使用独立界面）`
  },
  module10: {
    title: "模块10：素材库管理",
    description: "管理小说素材、设定和灵感片段。",
    system: "",
    userTemplate: (data: any) => `（此模块使用独立界面）`
  },
  module11: {
    title: "模块11：灵感备忘录",
    description: "快速记录灵感，支持标签管理和一键导入素材库。",
    system: "",
    userTemplate: (data: any) => `（此模块使用独立界面）`
  },
  module12: {
    title: "模块12：对话式写作",
    description: "通过与 AI 对话交互，实时生成和修改小说内容。",
    system: "你是一个专业的对话式写作助手。你的目标是通过与用户的对话，理解用户的创作意图，并协助用户撰写、修改和优化小说内容。",
    userTemplate: (data: any) => `（此模块使用独立界面）`
  },
};
