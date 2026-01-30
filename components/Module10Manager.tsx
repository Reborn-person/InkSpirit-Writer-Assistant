'use client';

import { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronRight,
  Sparkles,
  Share2,
  Heart,
  Globe,
  FileJson,
  Upload
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';

// Define MODULES constant since lib/modules doesn't exist
const MODULES = [
  { id: 'module0_5', name: '0.5 拆书模块' },
  { id: 'module1', name: '1. 脑洞具象化' },
  { id: 'module2', name: '2. 大纲生成' },
  { id: 'module2_5', name: '2.5 细纲生成' },
  { id: 'module3', name: '3. 开篇生成' },
  { id: 'module4', name: '4. 章节批量' },
  { id: 'module5', name: '5. 仿写创作' },
  { id: 'module6', name: '6. 全文润色' },
  { id: 'module7', name: '7. AI 辅助写作' },
  { id: 'module8', name: '8. 文章评审' },
  { id: 'module_max', name: 'MAX 创作中心' },
  { id: 'module_max_outline', name: 'MAX 大纲生成' },
];

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

interface MarketPrompt extends PromptTemplate {
  uploaderName: string;
  likeCount: number;
  categoryId: string;
  createdAt: number;
}

interface Module10ManagerProps {
  onSelectPrompt?: (prompt: string) => void;
  onClose?: () => void;
  initialModuleId?: string;
}

export default function Module10Manager({ onSelectPrompt = () => {}, onClose = () => {}, initialModuleId }: Module10ManagerProps) {
  const [activeSection, setActiveSection] = useState<'library' | 'market'>('library');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModuleId || MODULES[0].id);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [marketItems, setMarketItems] = useState<MarketPrompt[]>([]);
  const [likedMarketIds, setLikedMarketIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [marketTab, setMarketTab] = useState<'hot' | 'month' | 'latest' | 'liked'>('hot');
  const [marketCategoryId, setMarketCategoryId] = useState<string>('all');
  const [currentUsername, setCurrentUsername] = useState<string>('');

  const fetchWithFallback = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options ? { ...options, body: options.body } : undefined);
      if (res.status === 404 && url.includes('/market/prompts')) {
        const singularUrl = url.replace('/market/prompts', '/market/prompt');
        console.warn(`404 on ${url}, retrying with ${singularUrl}`);
        return fetch(singularUrl, options);
      }
      return res;
    } catch (e) {
      throw e;
    }
  };

  // Load user info
  useEffect(() => {
    // Always check session API to ensure fresh auth state
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.username) {
          setCurrentUsername(json.data.username);
          localStorage.setItem('username', json.data.username);
        } else {
          // If session is invalid, clear local username
          setCurrentUsername('');
          localStorage.removeItem('username');
        }
      })
      .catch((err) => {
        console.error('Auth check failed', err);
        // Fallback to localStorage if API fails (network error)
        const saved = localStorage.getItem('username');
        if (saved) setCurrentUsername(saved);
      });
  }, []);

  // Load local templates
  useEffect(() => {
    const loadTemplates = () => {
      const saved = StorageManager.getJSON(`prompt_templates_${selectedModuleId}`);
      const savedTemplates = Array.isArray(saved) ? saved : [];
      if (savedTemplates.length > 0) {
        if (selectedModuleId === 'module_max_outline') {
          const defaultTemplates: PromptTemplate[] = [
            {
              id: 'max-outline-paradigm',
              title: 'MAX 大纲生成范式',
              content: `一、粗纲（整书 / 大卷核心框架，定全局根基，必填！）
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
将粗纲拆解为 若干个独立但衔接的剧情单元 （按「卷 / 篇」划分，每单元对应 10-20 章，适配网文「每 10-20 章一个中爽点」的规律），是粗纲落地的关键，也是 AI「剧情单元生成」的核心依据。

每个中纲单元必须包含 6 个要素，且 单元结尾需留「大钩子」，支撑读者追更下一个单元：
单元核心目标：本卷 / 本篇要达成的具体结果（如「主角进入内门」「手撕白莲花继妹」「和男主确定关系」）；
核心冲突 / 爽点：围绕目标的核心矛盾（如「内门考核被针对」「继妹设计陷害」）+ 本单元的中爽点（如「考核打脸考官，强势进内门」「当众揭穿继妹，让其身败名裂」）；
关键情节节点：3-5 个支撑单元目标的核心事件（按「起 - 承 - 转 - 合」排列，例：「考核报名被嘲讽→暗中修炼提升→考核遇刁难→爆发实力打脸→成功进内门」）；
人物弧光 / 关系变化：主角的实力 / 身份 / 心态提升（如「从外门废柴到内门天才」）+ 核心人物关系变化（如「和男主从陌生到暧昧」「和反派的矛盾升级为死仇」）；
章数规划：本单元的总章数，明确「小爽点」分布位置（每 3-5 章一个，例：20 章的单元，在 5/10/15 章各设一个小爽点）；
单元结尾钩子：本单元完成目标后，抛出新的危机 / 未知 / 期待（如「进内门后被宗门长老盯上」「手撕继妹后，继母设下更大的圈套」）。`,
              lastModified: Date.now()
            },
            {
              id: 'max-chapter-outline-paradigm',
              title: 'MAX 细纲生成范式',
              content: `细纲（单章 / 小节框架，落地执行，连载核心！）
细纲是单章的「写作脚本」，回答「这一章写什么、怎么写、爽点在哪、结尾钩子怎么留」，每章不超过 3000 字的网文，细纲控制在 50-200 字即可，避免冗余，AI 生成单章时可直接按细纲要素填充内容。

所有单章细纲通用 6 要素，无例外、无冗余，每段文字都要服务于这些要素：
章节核心目标：本章节要完成的具体小事（如「主角获得第一个修炼资源」「和男主的第一次独处」「揭露一个小阴谋」）；
核心情节（起承转合）：4 步走，极简落地 ——
起：承接上一章结尾的钩子，交代当前场景 / 人物状态；
承：铺陈矛盾 / 铺垫爽点（如「反派上门挑衅」「主角发现资源线索」）；
转：冲突爆发 / 爽点触发（如「主角和反派对峙」「主角找到资源」）；
合：冲突 / 爽点的初步结果（如「反派被打脸离开」「主角拿到资源」）；
爽点 / 冲突 / 情感点：本章节的核心看点（男频的打脸 / 升级，女频的撒糖 / 虐心 / 手撕），单章必须有至少 1 个小看点，无看点的章节直接删掉；
人物互动：核心人物的对话 / 动作 / 心理（紧扣人设标签，避免 OOC，例：杀伐果断的主角不会拖泥带水，白切黑的女主不会无脑善良）；
细节铺垫：为后续剧情埋的小伏笔（如「反派离开时放的狠话」「男主递给女主的一个小物件」），适配网文长文本的前后呼应；
章末钩子（网文连载的命门，必填！）：章节结尾必须留悬念，拒绝「圆满结尾」，常见类型 ——
危机型：「主角刚拿到资源，就被更强的敌人包围」；
未知型：「主角发现资源上有一串看不懂的文字」；
期待型：「系统发布新任务，奖励是主角梦寐以求的天赋」；
情感型：「男主刚说完暧昧的话，突然被紧急事情叫走」。`,
              lastModified: Date.now()
            }
          ];
          const existingIds = new Set(savedTemplates.map((item: PromptTemplate) => item.id));
          const mergedTemplates = [...savedTemplates, ...defaultTemplates.filter(t => !existingIds.has(t.id))];
          setPromptTemplates(mergedTemplates);
          if (mergedTemplates.length !== savedTemplates.length) {
            StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, mergedTemplates);
          }
          return;
        }
        setPromptTemplates(savedTemplates);
      } else {
        if (selectedModuleId === 'module_max') {
          const defaultTemplate: PromptTemplate = {
            id: 'default-character-tracker',
            title: '角色状态追踪JSON模板',
            content: `{
  "characters": [
    {
      "id": "",
      "name": "",
      "type": "主要/配角/临时",
      "relation": "",
      "status": "活跃/死亡/被困/失踪/离开/受伤",
      "status_detail": "",
      "last_appearance": 0,
      "appearance_count": 0,
      "can_appear": true,
      "can_mention": true,
      "importance": "高/中/低",
      "traits": [
        "",
        ""
      ]
    }
  ],
  "chapter_index": 0,
  "appearance_tracking": {
    "current_chapter": 0,
    "long_absent_characters": [
      ""
    ],
    "recent_active": [
      ""
    ]
  }
}

历史小说状态追踪重点：官职品级、势力范围、军队实力、政治地位、历史影响、人物关系。
直接输出JSON,不要代码块。
数据管理员,追踪角色状态。

JSON格式要求(极其重要):
1.输出标准JSON:从{开始到}结束
2.禁\`\`\`代码块标记
3.数组元素间用逗号分隔
4.数组/对象最后一项后无逗号
5.字符串用双引号,不用单引号
6.字符串内引号转义",换行用\\n
7.无注释
8.布尔值小写true/false
9.数字不用引号

特别注意characters数组(最易错):
• 每个角色对象间逗号分隔:},
{
• traits数组内字符串间逗号:"trait1","trait2"
• status_detail含引号需转义:"他说\\"你好\\""
• 格式完全一致

管理原则:
基于旧JSON修改,提取等级/技能/物品/关系/事件,数值合逻辑,剧情简洁

状态检测:
死亡(死/亡/殒/牺/阵)→status死亡
被困(困/封/囚/禁)→被困
失踪(消失/失踪/不知所踪)→失踪
离开(离/远走/离去)→离开
受伤(重伤/昏迷/中毒)→受伤
特殊(残魂/元神/灵体)→活跃+detail说明
出场→记录last_appearance+count
新角色→type临时

characters字段:
id/name/type(主要/配角/临时)/relation/status(活跃/死亡/被困/失踪/离开/受伤)/status_detail/last_appearance/appearance_count/can_appear(是/否,死亡被困失踪=否)/can_mention(是/否)/importance(高/中/低)/traits数组

自动管理:
1.临时角色type临时且5章+未出场且importance低且本章未提及→删除
2.角色>20时仅更新本章出场+所有主要+本章提及,其他复制旧状态
3.角色>20时少加临时角色

管理指令:总数,章节
当前角色数量正常（个），继续正常更新即可。

本章:
第X章 SETTING_CHAPTER_LINK_MANDATORY_锚点100%呼应+情绪无缝延续+细节前后回扣+风格平滑过渡
END_CHAPTER_X_主题_事件_LINK_危机-XXX_LAST_氛围
START_CHAPTER_X_主题_事件_CONTINUE_危机-XXX_FIRST_氛围
END_CHAPTER_X_主题_事件_LINK_危机-XXX_LAST_氛围

输出前自检清单(必须逐项检查):
步骤1-检查characters数组:
✓每个角色对象}后有逗号(最后除外)
✓格式为},
{不是}
{
步骤2-检查traits数组:
✓字符串间有逗号
✓格式"trait1","trait2"不是"trait1""trait2"
✓最后一个后无逗号
步骤3-检查字符串转义:
✓status_detail等字段引号转义"
✓换行用\\n
步骤4-检查格式标记:
✓无\`\`\`代码块
✓从{开始到}结束
✓无注释
步骤5-检查尾部逗号:
✓数组最后元素后无逗号
✓对象最后属性后无逗号

确认无误后直接输出JSON(从{开始到}结束)`,
            lastModified: Date.now()
          };
          const templates = [defaultTemplate];
          setPromptTemplates(templates);
          StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, templates);
        } else if (selectedModuleId === 'module_max_outline') {
          const defaultTemplates: PromptTemplate[] = [
            {
              id: 'max-outline-paradigm',
              title: 'MAX 大纲生成范式',
              content: `一、粗纲（整书 / 大卷核心框架，定全局根基，必填！）
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
将粗纲拆解为 若干个独立但衔接的剧情单元 （按「卷 / 篇」划分，每单元对应 10-20 章，适配网文「每 10-20 章一个中爽点」的规律），是粗纲落地的关键，也是 AI「剧情单元生成」的核心依据。

每个中纲单元必须包含 6 个要素，且 单元结尾需留「大钩子」，支撑读者追更下一个单元：
单元核心目标：本卷 / 本篇要达成的具体结果（如「主角进入内门」「手撕白莲花继妹」「和男主确定关系」）；
核心冲突 / 爽点：围绕目标的核心矛盾（如「内门考核被针对」「继妹设计陷害」）+ 本单元的中爽点（如「考核打脸考官，强势进内门」「当众揭穿继妹，让其身败名裂」）；
关键情节节点：3-5 个支撑单元目标的核心事件（按「起 - 承 - 转 - 合」排列，例：「考核报名被嘲讽→暗中修炼提升→考核遇刁难→爆发实力打脸→成功进内门」）；
人物弧光 / 关系变化：主角的实力 / 身份 / 心态提升（如「从外门废柴到内门天才」）+ 核心人物关系变化（如「和男主从陌生到暧昧」「和反派的矛盾升级为死仇」）；
章数规划：本单元的总章数，明确「小爽点」分布位置（每 3-5 章一个，例：20 章的单元，在 5/10/15 章各设一个小爽点）；
单元结尾钩子：本单元完成目标后，抛出新的危机 / 未知 / 期待（如「进内门后被宗门长老盯上」「手撕继妹后，继母设下更大的圈套」）。`,
              lastModified: Date.now()
            },
            {
              id: 'max-chapter-outline-paradigm',
              title: 'MAX 细纲生成范式',
              content: `细纲（单章 / 小节框架，落地执行，连载核心！）
细纲是单章的「写作脚本」，回答「这一章写什么、怎么写、爽点在哪、结尾钩子怎么留」，每章不超过 3000 字的网文，细纲控制在 50-200 字即可，避免冗余，AI 生成单章时可直接按细纲要素填充内容。

所有单章细纲通用 6 要素，无例外、无冗余，每段文字都要服务于这些要素：
章节核心目标：本章节要完成的具体小事（如「主角获得第一个修炼资源」「和男主的第一次独处」「揭露一个小阴谋」）；
核心情节（起承转合）：4 步走，极简落地 ——
起：承接上一章结尾的钩子，交代当前场景 / 人物状态；
承：铺陈矛盾 / 铺垫爽点（如「反派上门挑衅」「主角发现资源线索」）；
转：冲突爆发 / 爽点触发（如「主角和反派对峙」「主角找到资源」）；
合：冲突 / 爽点的初步结果（如「反派被打脸离开」「主角拿到资源」）；
爽点 / 冲突 / 情感点：本章节的核心看点（男频的打脸 / 升级，女频的撒糖 / 虐心 / 手撕），单章必须有至少 1 个小看点，无看点的章节直接删掉；
人物互动：核心人物的对话 / 动作 / 心理（紧扣人设标签，避免 OOC，例：杀伐果断的主角不会拖泥带水，白切黑的女主不会无脑善良）；
细节铺垫：为后续剧情埋的小伏笔（如「反派离开时放的狠话」「男主递给女主的一个小物件」），适配网文长文本的前后呼应；
章末钩子（网文连载的命门，必填！）：章节结尾必须留悬念，拒绝「圆满结尾」，常见类型 ——
危机型：「主角刚拿到资源，就被更强的敌人包围」；
未知型：「主角发现资源上有一串看不懂的文字」；
期待型：「系统发布新任务，奖励是主角梦寐以求的天赋」；
情感型：「男主刚说完暧昧的话，突然被紧急事情叫走」。`,
              lastModified: Date.now()
            }
          ];
          setPromptTemplates(defaultTemplates);
          StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, defaultTemplates);
        } else {
          setPromptTemplates([]);
        }
      }
    };
    loadTemplates();
  }, [selectedModuleId]);

  // Fetch market items from API
  const fetchMarketItems = async () => {
    try {
      const res = await fetchWithFallback('/api/market/prompts');
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setMarketItems(json.data.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt).getTime(),
          lastModified: new Date(item.lastModified).getTime()
        })));
      } else {
        // Fallback or empty
        setMarketItems([]);
      }
    } catch (err) {
      console.error('Failed to fetch market items', err);
    }
  };

  // Load market items and liked status
  useEffect(() => {
    fetchMarketItems();
    
    // Load local liked status
    const loadLiked = async () => {
      const savedLiked = await StorageManager.getJSONAsync('prompt_market_liked');
      if (savedLiked && Array.isArray(savedLiked)) {
        setLikedMarketIds(savedLiked);
      }
    };
    loadLiked();
  }, []);

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    const newTemplates = editingTemplate.id 
      ? promptTemplates.map(t => t.id === editingTemplate.id ? { ...editingTemplate, lastModified: Date.now() } : t)
      : [...promptTemplates, { ...editingTemplate, id: Date.now().toString(), lastModified: Date.now() }];

    setPromptTemplates(newTemplates);
    StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, newTemplates);
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('确定要删除这个提示词吗？')) return;
    const newTemplates = promptTemplates.filter(t => t.id !== id);
    setPromptTemplates(newTemplates);
    StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, newTemplates);
  };

  const handleShareToMarket = async (template: PromptTemplate) => {
    // Re-check auth status right before sharing
    try {
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();
      
      if (!authRes.ok || !authJson.data || !authJson.data.username) {
        alert('登录状态已失效，请重新登录');
        // Clear local state
        setCurrentUsername('');
        localStorage.removeItem('username');
        return;
      }

      // Proceed with sharing
      const res = await fetchWithFallback('/api/market/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          content: template.content,
          categoryId: selectedModuleId
        })
      });

      if (res.ok) {
        alert('已分享到提示词市场');
        fetchMarketItems();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(`分享失败 (${res.status}): ${json.error || '未知错误'}`);
      }
    } catch (e) {
      console.error(e);
      alert('分享出错，请检查网络');
    }
  };

  const handleLikeMarketItem = async (item: MarketPrompt) => {
    if (likedMarketIds.includes(item.id)) return;

    // Add to local library
    const baseTemplates = StorageManager.getJSON(`prompt_templates_${item.categoryId}`) || [];
    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      title: item.title,
      content: item.content,
      lastModified: Date.now()
    };
    
    const updatedTemplates = [...baseTemplates, newTemplate];
    StorageManager.setJSON(`prompt_templates_${item.categoryId}`, updatedTemplates);
    
    // Update state if in same module
    if (item.categoryId === selectedModuleId) {
      setPromptTemplates(updatedTemplates);
    }

    // Call API to like
    try {
      await fetchWithFallback(`/api/market/prompts/${item.id}/like`, { method: 'POST' });
      // Don't await refresh, just update UI optimistically or lazily
      // fetchMarketItems(); 
    } catch (e) { 
      console.error(e); 
    }

    // Update liked status
    const updatedLiked = [...likedMarketIds, item.id];
    setLikedMarketIds(updatedLiked);
    StorageManager.setJSON('prompt_market_liked', updatedLiked);

    alert('已加入提示词库并点赞');
  };

  const handleDeleteMarketItem = async (item: MarketPrompt) => {
    // Only allow deletion if user is logged in and matches uploader
    if (!currentUsername || item.uploaderName !== currentUsername) return;
    
    if (!confirm('确定要删除这个提示词吗？')) return;

    try {
      const res = await fetchWithFallback(`/api/market/prompts/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMarketItems();
      } else {
        alert('删除失败');
      }
    } catch (e) {
      console.error(e);
      alert('删除出错');
    }
  };

  const filteredTemplates = promptTemplates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMarketItemsBase = marketItems
    .filter((item) => {
      if (marketCategoryId !== 'all' && item.categoryId !== marketCategoryId) return false;
      const q = marketSearchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.uploaderName.toLowerCase().includes(q)
      );
    })
    .filter((item) => {
      if (marketTab !== 'liked') return true;
      return likedMarketIds.includes(item.id);
    })
    .filter((item) => {
      if (marketTab !== 'month') return true;
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return now - item.createdAt <= thirtyDays;
    });

  const filteredMarketItems = [...filteredMarketItemsBase].sort((a, b) => {
    if (marketTab === 'latest') return b.createdAt - a.createdAt;
    if (marketTab === 'month' || marketTab === 'hot') return (b.likeCount ?? 0) - (a.likeCount ?? 0) || b.createdAt - a.createdAt;
    if (marketTab === 'liked') return b.createdAt - a.createdAt;
    return 0;
  });

  const selectedModuleName = MODULES.find(m => m.id === selectedModuleId)?.name;

  return (
    <div className="flex h-[calc(100vh-4rem)] glass-card overflow-hidden rounded-xl font-serif">
      {/* Sidebar: Module List */}
      <div className="w-64 bg-white/40 border-r border-ink/10 flex flex-col backdrop-blur-sm">
        <div className="p-4 border-b border-ink/10">
          <h2 className="font-bold text-ink flex items-center gap-2">
            <FileJson className="w-5 h-5 text-daiqing" />
            模块选择
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {MODULES.map(module => (
            <button
              key={module.id}
              onClick={() => setSelectedModuleId(module.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedModuleId === module.id
                  ? 'bg-daiqing/10 text-daiqing'
                  : 'text-ink/60 hover:bg-paper'
              }`}
            >
              {module.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Template List/Edit */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <div className="p-4 border-b border-ink/10 flex justify-between items-center bg-white/40 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => {
                  setActiveSection('library');
                  setViewMode('list');
                  setEditingTemplate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'library'
                    ? 'bg-daiqing/10 text-daiqing'
                    : 'text-ink/50 hover:bg-paper'
                }`}
              >
                提示词库
              </button>
              <button
                onClick={() => {
                  setActiveSection('market');
                  setViewMode('list');
                  setEditingTemplate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'market'
                    ? 'bg-daiqing/10 text-daiqing'
                    : 'text-ink/50 hover:bg-paper'
                }`}
              >
                提示词市场
              </button>
            </div>
            <h2 className="text-xl font-bold text-ink">
              {activeSection === 'library' 
                ? `${selectedModuleName} - 提示词库`
                : '提示词市场 (所有模块)'
              }
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeSection === 'library' && viewMode === 'list' && (
              <button
                onClick={() => {
                  setEditingTemplate({ id: '', title: '', content: '', lastModified: 0 });
                  setViewMode('edit');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-daiqing text-paper rounded-lg hover:bg-daiqing/90 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                新建
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ink/40 hover:text-ink hover:bg-paper rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-paper/30">
          {activeSection === 'library' ? (
            viewMode === 'list' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索本地提示词..."
                    className="w-full pl-9 pr-4 py-2 bg-white/50 border border-ink/10 rounded-lg text-sm focus:outline-none focus:border-daiqing/30 focus:ring-1 focus:ring-daiqing/30"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(template => (
                    <div 
                      key={template.id}
                      className="bg-white/60 p-4 rounded-xl border border-ink/5 hover:border-daiqing/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-ink/80">{template.title}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleShareToMarket(template)}
                            className="p-1.5 text-ink/40 hover:text-daiqing hover:bg-daiqing/10 rounded-lg"
                            title="分享到市场"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setViewMode('edit');
                            }}
                            className="p-1.5 text-ink/40 hover:text-daiqing hover:bg-daiqing/10 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 text-ink/40 hover:text-cinnabar hover:bg-cinnabar/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-ink/60 line-clamp-3 mb-3 font-mono bg-paper/50 p-2 rounded-lg">
                        {template.content}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-ink/30">
                          {new Date(template.lastModified).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => onSelectPrompt(template.content)}
                          className="flex items-center gap-1 text-xs text-daiqing hover:underline"
                        >
                          使用 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-white/60 p-6 rounded-xl border border-ink/5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1">标题</label>
                    <input
                      type="text"
                      value={editingTemplate?.title}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full px-4 py-2 bg-white/50 border border-ink/10 rounded-lg focus:outline-none focus:border-daiqing/30"
                      placeholder="输入提示词标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1">内容</label>
                    <textarea
                      value={editingTemplate?.content}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                      className="w-full h-64 px-4 py-3 bg-white/50 border border-ink/10 rounded-lg focus:outline-none focus:border-daiqing/30 font-mono text-sm resize-none"
                      placeholder="输入提示词内容..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setViewMode('list');
                        setEditingTemplate(null);
                      }}
                      className="px-4 py-2 text-ink/60 hover:bg-paper rounded-lg transition-colors text-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-daiqing text-paper rounded-lg hover:bg-daiqing/90 transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMarketTab('hot')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'hot' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  热榜
                </button>
                <button
                  onClick={() => setMarketTab('month')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'month' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  月榜
                </button>
                <button
                  onClick={() => setMarketTab('latest')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'latest' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  最新
                </button>
                <button
                  onClick={() => setMarketTab('liked')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    marketTab === 'liked' ? 'bg-daiqing text-white border-daiqing' : 'bg-white/50 border-ink/10 text-ink/60 hover:bg-paper'
                  }`}
                >
                  已收藏
                </button>
              </div>

              <div className="bg-white/40 border border-ink/10 rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMarketCategoryId('all')}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      marketCategoryId === 'all' ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20' : 'bg-white/60 border-ink/10 text-ink/60 hover:bg-paper'
                    }`}
                  >
                    全部
                  </button>
                  {MODULES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMarketCategoryId(m.id)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        marketCategoryId === m.id ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20' : 'bg-white/60 border-ink/10 text-ink/60 hover:bg-paper'
                      }`}
                      title={m.name}
                    >
                      {m.name.replace(/^\d+(\.\d+)?\s*/, '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                <input
                  type="text"
                  value={marketSearchTerm}
                  onChange={(e) => setMarketSearchTerm(e.target.value)}
                  placeholder="搜索市场提示词或上传者..."
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-ink/10 rounded-lg text-sm focus:outline-none focus:border-daiqing/30 focus:ring-1 focus:ring-daiqing/30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarketItems.map(item => (
                  <div 
                    key={item.id}
                    className="bg-white/70 p-4 rounded-xl border border-ink/10 hover:border-daiqing/30 transition-all flex flex-col shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-daiqing/10 border border-daiqing/20 flex items-center justify-center text-daiqing font-bold shrink-0">
                          {(item.uploaderName || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-paper/60 border border-ink/10 text-ink/60">
                              {MODULES.find(m => m.id === item.categoryId)?.name || item.categoryId}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-ink/40">
                              <Globe className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{item.uploaderName}</span>
                            </span>
                          </div>
                          <h3 className="font-bold text-ink/80 text-sm mt-1 truncate">{item.title}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleLikeMarketItem(item)}
                          className={`p-2 rounded-lg transition-colors ${
                            likedMarketIds.includes(item.id)
                              ? 'text-cinnabar bg-cinnabar/10'
                              : 'text-ink/40 hover:text-cinnabar hover:bg-cinnabar/10'
                          }`}
                          title="收藏并加入提示词库"
                        >
                          <Heart className={`w-4 h-4 ${likedMarketIds.includes(item.id) ? 'fill-current' : ''}`} />
                        </button>
                        <span className="text-xs text-ink/40 min-w-5 text-center">
                          {item.likeCount ?? 0}
                        </span>
                        {currentUsername && item.uploaderName === currentUsername && (
                          <button
                            onClick={() => handleDeleteMarketItem(item)}
                            className="p-2 rounded-lg text-ink/40 hover:text-cinnabar hover:bg-cinnabar/10 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-ink/70 bg-paper/50 p-3 rounded-lg h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap border border-ink/5 font-mono">
                      {item.content}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink/40">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectPrompt(item.content)}
                          className="px-3 py-1.5 rounded-lg bg-daiqing text-paper hover:bg-daiqing/90 transition-colors"
                          title="应用到当前模块"
                        >
                          使用
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredMarketItems.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-ink/30">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>暂无提示词</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
