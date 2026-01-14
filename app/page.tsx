import Link from 'next/link';
import { ArrowRight, Wand2, FileText, List, BookOpen, PenTool, Edit3, BookMarked, FlaskConical, Database, ClipboardCheck, Sparkles, Layout, Layers, Feather, Target, Book, GraduationCap } from 'lucide-react';
import AnnouncementModal from '@/components/AnnouncementModal';

// Workflow Phases
const phases = [
    {
        title: "第一阶段：输入与分析",
        description: "拆解爆款，找准方向",
        modules: [
            {
                title: "0.5 智能拆书",
                description: "导入TXT，AI自动识别章节并进行深度拆解分析。",
                href: "/module/module0_5",
                icon: BookMarked,
                colorClass: "text-[#497568] bg-[#497568]/10 border-[#497568]/20" // Dai Lv
            },
            {
                title: "8. 文章评审",
                description: "毒舌主编视角，全维度体检，指出毒点与爽点。",
                href: "/module/module8",
                icon: ClipboardCheck,
                colorClass: "text-[#C82506] bg-[#C82506]/10 border-[#C82506]/20" // Zhu Sha
            }
        ]
    },
    {
        title: "第二阶段：创意与架构",
        description: "从脑洞到万字大纲",
        modules: [
            {
                title: "1. 脑洞具象化",
                description: "将一句话灵感转化为结构化的世界观与冲突设定。",
                href: "/module/module1",
                icon: Sparkles,
                colorClass: "text-[#8B5F8F] bg-[#8B5F8F]/10 border-[#8B5F8F]/20" // Zi
            },
            {
                title: "2. 长篇大纲",
                description: "生成500章+三幕式超级大纲，规划宏大叙事。",
                href: "/module/module2",
                icon: Layout,
                colorClass: "text-[#177CB0] bg-[#177CB0]/10 border-[#177CB0]/20" // Dian Lan
            },
            {
                title: "2.5 细纲蓝图",
                description: "三弧合一（人物+情节+情绪），生成逐章施工图。",
                href: "/module/module2_5",
                icon: Layers,
                colorClass: "text-[#1A2933] bg-[#1A2933]/10 border-[#1A2933]/20" // Zang Lan
            }
        ]
    },
    {
        title: "第三阶段：正文创作",
        description: "日更万字的核心引擎",
        modules: [
            {
                title: "3. 黄金开篇",
                description: "打造高留存率的前三章，内置多种爆款开篇模型。",
                href: "/module/module3",
                icon: Target,
                colorClass: "text-[#CA6924] bg-[#CA6924]/10 border-[#CA6924]/20" // Hu Po
            },
            {
                title: "4. 批量生成",
                description: "基于细纲批量生产后续章节，稳定输出。",
                href: "/module/module4",
                icon: PenTool,
                colorClass: "text-[#F0AC6B] bg-[#F0AC6B]/10 border-[#F0AC6B]/20" // Ju Huang
            },
            {
                title: "5. 风格仿写",
                description: "学习特定大师文风，进行原创剧情创作。",
                href: "/module/module5",
                icon: Feather,
                colorClass: "text-[#F47983] bg-[#F47983]/10 border-[#F47983]/20" // Tao Hong
            },
            {
                title: "6. 全文润色",
                description: "智能精修，修复逻辑漏洞，统一文风。",
                href: "/module/module6",
                icon: Wand2,
                colorClass: "text-[#57C3C2] bg-[#57C3C2]/10 border-[#57C3C2]/20" // Tian Qing
            }
        ]
    },
    {
        title: "第四阶段：辅助与进阶",
        description: "全能助手与资产沉淀",
        modules: [
             {
                title: "7. 墨灵编辑器",
                description: "书架管理+AI续写助手，你的24小时贴身书童。",
                href: "/module/module7",
                icon: Edit3,
                colorClass: "text-[#008000] bg-[#008000]/10 border-[#008000]/20" // Cui Lv
            },
            {
                title: "9. 提示词炼金",
                description: "对抗生成+自动评测，迭代出最强Prompt。",
                href: "/module/module9",
                icon: FlaskConical,
                colorClass: "text-[#800080] bg-[#800080]/10 border-[#800080]/20" // Zi Luo Lan
            },
             {
                title: "10. 提示词管理",
                description: "全站提示词资产化管理，支持导入导出。",
                href: "/module/module10",
                icon: Database,
                colorClass: "text-[#758A99] bg-[#758A99]/10 border-[#758A99]/20" // Mo Hui
            }
        ]
    }
];

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto pb-12 font-serif">
      <AnnouncementModal />
      
      {/* Hero Section */}
      <div className="mb-16 text-center space-y-6 pt-12">
        <h1 className="text-5xl font-extrabold tracking-tight text-ink">
          墨灵写作助手
        </h1>
        <div className="flex justify-center">
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-cinnabar to-transparent opacity-50 rounded-full"></div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
          从脑洞到爆款。专为超长篇网文创作打造的<br/>
          <span className="font-medium text-daiqing">全流程 AI 工作流引擎 (InkSpirit Engine)</span>
        </p>
      </div>

      {/* Workflow Sections */}
      <div className="space-y-16 px-4">
        {phases.map((phase, index) => (
            <div key={index} className="space-y-6">
                <div className="flex items-end gap-4 border-b border-ink/10 pb-3 relative">
                    <h2 className="text-2xl font-bold text-ink">{phase.title}</h2>
                    <span className="text-sm text-gray-500 font-medium pb-1">{phase.description}</span>
                    <div className="absolute bottom-0 left-0 w-16 h-[2px] bg-daiqing"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {phase.modules.map((module) => (
                    <Link 
                        key={module.title} 
                        href={module.href}
                        className={`group block p-6 bg-[#FFFEFA] rounded-xl border border-ink/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-daiqing/30 relative overflow-hidden`}
                    >
                        {/* Background Texture Overlay */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-rice-texture"></div>

                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors border ${module.colorClass}`}>
                           <module.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-ink mb-2 group-hover:text-daiqing transition-colors">
                           {module.title}
                        </h3>
                        <p className="text-gray-500 text-xs leading-relaxed mb-6 h-8 line-clamp-2">
                           {module.description}
                        </p>
                        <div className="flex items-center text-xs font-semibold text-gray-400 group-hover:text-daiqing transition-colors">
                           立即使用
                           <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                    ))}
                </div>
            </div>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="mt-24 text-center border-t border-ink/5 pt-10 pb-12">
          <p className="text-sm text-gray-500 font-light italic mb-3">
            “人们都喜欢做梦，而墨灵让你把梦里的山海、人间的星河，都揉进笔墨里，让虚妄的念想，长出真实的模样。”
          </p>
          <p className="text-xs text-gray-400">
              v1.2.0 InkSpirit Engine • Designed for Long-form Web Novels
          </p>
      </div>
    </div>
  );
}
