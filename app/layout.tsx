import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import FloatingAI from "@/components/FloatingAI";
import { EditorAgentProvider } from "@/contexts/EditorAgentContext";
import { MaxJobProvider } from "@/contexts/MaxJobContext";

export const metadata: Metadata = {
  title: 'AI Novel Writer',
  description: 'AI-powered novel writing assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased flex h-screen bg-rice-paper text-ink overflow-hidden font-serif`}>
        <EditorAgentProvider>
          <MaxJobProvider>
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-0 relative">
              {children}
            </main>
            <FloatingAI />
          </MaxJobProvider>
        </EditorAgentProvider>
      </body>
    </html>
  );
}
