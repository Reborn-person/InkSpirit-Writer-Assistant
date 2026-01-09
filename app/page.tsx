import Link from 'next/link';
import { ArrowRight, Wand2, FileText, List, BookOpen, PenTool, Edit3 } from 'lucide-react';

const steps = [
  {
    title: "1. 脑洞具象化",
    description: "将模糊的脑洞转化为结构化的创作基础。",
    href: "/module/module1",
    icon: Wand2,
    color: "bg-purple-100 text-purple-600"
  },
  {
    title: "2. 大纲生成",
    description: "生成包含三幕式结构的500+章超级长篇大纲。",
    href: "/module/module2",
    icon: FileText,
    color: "bg-blue-100 text-blue-600"
  },
  {
    title: "2.5 细纲生成",
    description: "基于大纲生成逐章的详细细纲。",
    href: "/module/module2_5",
    icon: List,
    color: "bg-indigo-100 text-indigo-600"
  },
  {
    title: "3. 开篇生成",
    description: "创作高留存率的前三章内容。",
    href: "/module/module3",
    icon: BookOpen,
    color: "bg-green-100 text-green-600"
  },
  {
    title: "4. 章节批量",
    description: "基于细纲批量生成后续章节。",
    href: "/module/module4",
    icon: PenTool,
    color: "bg-orange-100 text-orange-600"
  },
  {
    title: "5. 仿写创作",
    description: "模仿特定风格进行原创内容创作。",
    href: "/module/module5",
    icon: Edit3,
    color: "bg-pink-100 text-pink-600"
  }
];

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI 小说创作工作室
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          从脑洞到爆款。专为超长篇网文创作打造的全流程工作流。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => (
          <Link 
            key={step.title} 
            href={step.href}
            className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${step.color}`}>
              <step.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
              {step.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {step.description}
            </p>
            <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-blue-500">
              开始创作
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
