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
                color: "bg-teal-50 text-teal-600 border-teal-200"
            },
            {
                title: "8. 文章评审",
                description: "毒舌主编视角，全维度体检，指出毒点与爽点。",
                href: "/module/module8",
                icon: ClipboardCheck,
                color: "bg-red-50 text-red-600 border-red-200"
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
                color: "bg-purple-50 text-purple-600 border-purple-200"
            },
            {
                title: "2. 长篇大纲",
                description: "生成500章+三幕式超级大纲，规划宏大叙事。",
                href: "/module/module2",
                icon: Layout,
                color: "bg-blue-50 text-blue-600 border-blue-200"
            },
            {
                title: "2.5 细纲蓝图",
                description: "三弧合一（人物+情节+情绪），生成逐章施工图。",
                href: "/module/module2_5",
                icon: Layers,
                color: "bg-indigo-50 text-indigo-600 border-indigo-200"
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
                color: "bg-amber-50 text-amber-600 border-amber-200"
            },
            {
                title: "4. 批量生成",
                description: "基于细纲批量生产后续章节，稳定输出。",
                href: "/module/module4",
                icon: PenTool,
                color: "bg-orange-50 text-orange-600 border-orange-200"
            },
            {
                title: "5. 风格仿写",
                description: "学习特定大师文风，进行原创剧情创作。",
                href: "/module/module5",
                icon: Feather,
                color: "bg-pink-50 text-pink-600 border-pink-200"
            },
            {
                title: "6. 全文润色",
                description: "智能精修，修复逻辑漏洞，统一文风。",
                href: "/module/module6",
                icon: Wand2,
                color: "bg-cyan-50 text-cyan-600 border-cyan-200"
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
                color: "bg-emerald-50 text-emerald-600 border-emerald-200"
            },
            {
                title: "9. 提示词炼金",
                description: "对抗生成+自动评测，迭代出最强Prompt。",
                href: "/module/module9",
                icon: FlaskConical,
                color: "bg-violet-50 text-violet-600 border-violet-200"
            },
             {
                title: "10. 提示词管理",
                description: "全站提示词资产化管理，支持导入导出。",
                href: "/module/module10",
                icon: Database,
                color: "bg-slate-50 text-slate-600 border-slate-200"
            }
        ]
    }
];

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto pb-12">
      <AnnouncementModal />
      
      {/* Hero Section */}
      <div className="mb-16 text-center space-y-6 pt-8">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
          墨灵写作助手
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
          从脑洞到爆款。专为超长篇网文创作打造的<br/>
          <span className="font-semibold text-gray-700">全流程 AI 工作流引擎 (InkSpirit Engine)</span>
        </p>
      </div>

      {/* Workflow Sections */}
      <div className="space-y-12">
        {phases.map((phase, index) => (
            <div key={index} className="space-y-6">
                <div className="flex items-end gap-4 border-b border-gray-100 pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">{phase.title}</h2>
                    <span className="text-sm text-gray-400 font-medium pb-1">{phase.description}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {phase.modules.map((module) => (
                    <Link 
                        key={module.title} 
                        href={module.href}
                        className={`group block p-5 bg-white rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${module.color.replace('bg-', 'border-')}`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${module.color}`}>
                           <module.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                           {module.title}
                        </h3>
                        <p className="text-gray-500 text-xs leading-relaxed mb-4 h-8 line-clamp-2">
                           {module.description}
                        </p>
                        <div className="flex items-center text-xs font-semibold text-gray-400 group-hover:text-blue-500 transition-colors">
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
      <div className="mt-20 text-center border-t border-gray-100 pt-8 pb-10">
          <p className="text-sm text-gray-500 font-light italic mb-2">
            “人们都喜欢做梦，而墨灵让你把梦里的山海、人间的星河，都揉进笔墨里，让虚妄的念想，长出真实的模样。”
          </p>
          <p className="text-xs text-gray-300">
              v1.2.0 InkSpirit Engine • Designed for Long-form Web Novels
          </p>
      </div>
    </div>
  );
}
