# AI小说创作工作室

这是一个基于 Next.js 和 AI 技术的超长篇网文创作工具，提供从脑洞具象化到章节批量生成的完整工作流。

## 功能特性

- 🧠 **脑洞具象化**：将模糊的脑洞转化为结构化的创作基础
- 📚 **大纲生成**：生成包含三幕式结构的500+章超级长篇大纲
- 🔍 **细纲生成**：基于大纲生成逐章的详细细纲
- 📝 **开篇生成**：创作高留存率的前三章内容
- 📖 **章节批量**：基于细纲批量生成后续章节
- 🎨 **仿写创作**：模仿特定风格进行原创内容创作
- ✨ **AI辅助写作**：智能续写和润色功能
- 💾 **储存管理**：统一的数据管理和导出功能

## 技术栈

- **前端框架**：Next.js 16.1.1 (React 19)
- **样式**：Tailwind CSS 4
- **图标**：Lucide React
- **AI集成**：支持 SiliconFlow 和 OpenAI API
- **储存**：localStorage + 统一储存管理
- **部署**：支持 Vercel 一键部署

## 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/你的用户名/ai-novel-writer.git
cd ai-novel-writer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。

### 部署到 Vercel

1. 点击下面的按钮一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/ai-novel-writer)

2. 或者手动部署：
   - 将代码推送到 GitHub
   - 在 Vercel 中导入项目
   - 点击部署即可

## 使用说明

1. **设置API密钥**：在设置页面配置 SiliconFlow 或 OpenAI 的 API 密钥
2. **开始创作**：按照模块顺序进行创作，每个模块的输出会自动保存
3. **储存管理**：在储存管理页面可以导出项目、备份数据、导出TXT文件夹

## 项目结构

```
ai-novel-writer/
├── app/                    # Next.js App Router
│   ├── module/[id]/       # 各模块页面
│   ├── settings/          # 设置页面
│   ├── storage/           # 储存管理页面
│   └── page.tsx           # 主页
├── components/            # 组件
│   ├── Sidebar.tsx        # 侧边栏
│   └── Module7Editor.tsx  # AI辅助写作编辑器
├── lib/                   # 工具库
│   ├── storage.ts         # 储存管理
│   └── ai.ts              # AI接口
└── public/                # 静态资源
```

## 储存功能

- **统一储存管理**：所有模块数据集中管理
- **项目导出**：支持导出完整项目数据
- **TXT文件夹导出**：将大纲、细纲、正文导出为结构化TXT文件
- **数据备份**：支持创建和恢复备份
- **模块数据清理**：可以单独清理各模块数据

## 许可证

MIT License