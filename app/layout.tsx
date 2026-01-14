import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import FloatingAI from "@/components/FloatingAI";

export const metadata: Metadata = {
  title: '墨灵写作助手 - 墨灵引擎',
  description: '专为超长篇网文创作打造的AI工作流工具，支持拆书分析、脑洞大纲生成、细纲规划及正文创作。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased flex h-screen bg-rice-paper text-ink overflow-hidden font-serif`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-0 relative">
          {children}
        </main>
        <FloatingAI />
      </body>
    </html>
  );
}
