import Link from 'next/link';
import { BookOpen, FileText, List, PenTool, Edit3, Wand2, Home, Settings, Coffee, Database } from 'lucide-react';

const menuItems = [
  { name: '首页', href: '/', icon: Home },
  { name: '1. 脑洞具象化', href: '/module/module1', icon: Wand2 },
  { name: '2. 大纲生成', href: '/module/module2', icon: FileText },
  { name: '2.5 细纲生成', href: '/module/module2_5', icon: List },
  { name: '3. 开篇生成', href: '/module/module3', icon: BookOpen },
  { name: '4. 章节批量', href: '/module/module4', icon: PenTool },
  { name: '5. 仿写创作', href: '/module/module5', icon: Edit3 },
  { name: '6. 全文润色', href: '/module/module6', icon: Wand2 },
  { name: '7. AI 辅助写作', href: '/module/module7', icon: Edit3 },
  { name: '请开发者喝杯咖啡', href: '/coffee', icon: Coffee },
  { name: '储存管理', href: '/storage', icon: Database },
  { name: '设置', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <span className="text-xl font-bold">AI 小说创作工作室</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-400">
        v1.0.0
      </div>
    </div>
  );
}
