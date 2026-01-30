# 上帝模式 (God Mode) - 技术实现方案

> 版本: v3 | 日期: 2026-01-27

## 功能概述

一个多维世界构建系统，用户可以在多个平行图层上创建和关联节点，支持分形深入、AI 生成和时间线管理，最终生成完整的小说内容。

---

## 七大世界维度

| 维度 | 图层 | 节点类型 | 示例 |
|------|------|----------|------|
| 地理 | 🗺️ geography | 地点 | 黑石城、魔兽山脉 |
| 历史 | 📜 history | 时间节点 | 远古大战、主角出生 |
| 力量 | ⚡ power | 等级/能力 | 斗者→斗师→斗王 |
| 势力 | 🏛️ faction | 组织 | 萧家、云岚宗 |
| 人物 | 👤 character | 角色 | 萧炎、药老 |
| 剧情 | 📖 plot | 事件/冲突 | 三年之约、斗气化翼 |
| **时间线** | 🕰️ **timeline** | **章节时间点** | **第 1 章 (0 年 – 春)** |

---

## 数据结构

```typescript
// 维度类型
type WorldLayer = 'geography' | 'history' | 'power' | 'faction' | 'character' | 'plot';

// 通用节点
interface WorldNode {
  id: string;
  layer: WorldLayer;
  name: string;
  x: number;
  y: number;
  cardIds: string[];           // 关联的卡片 ID
  linkedNodeIds: string[];     // 跨维度关联的节点 ID
  metadata: Record<string, any>;
}

// 连线
interface WorldEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  description: string;
  edgeType: 'event' | 'relation' | 'causation' | 'timeline';
}

// 完整世界
interface WorldCanvas {
  id: string;
  name: string;
  layers: Record<WorldLayer, WorldNode[]>;
  edges: WorldEdge[];
  createdAt: number;
  updatedAt: number;
}
```

---

## 各图层节点 Metadata

### 地图层 (geography)
```typescript
{ locationType: 'city' | 'mountain' | 'sect' | 'country' | 'realm', climate?: string }
```

### 历史层 (history)
```typescript
{ year: number | string, era: string, importance: 'major' | 'minor' }
```

### 力量层 (power)
```typescript
{ rank: number, requirements?: string, abilities?: string[] }
```

### 势力层 (faction)
```typescript
{ factionType: 'family' | 'sect' | 'empire', alignment: 'good' | 'neutral' | 'evil', influence: number }
```

### 角色层 (character)
```typescript
{ role: 'protagonist' | 'antagonist' | 'supporting', gender: string, powerLevel?: string }
```

### 剧情层 (plot)
```typescript
{ plotType: 'conflict' | 'turning_point' | 'climax' | 'resolution', tension: number }
```

### 时间线层 (timeline)
```typescript
{ 
  chapter: number,        // 章节号
  worldDate: string,      // 世界时间，如 "0 年 – 春"
  era: string,            // 时代，如 "领域黎明"
  keyEvent: string,       // 关键事件
  description?: string    // 简要描述
}
```


---

## 文件结构

```
app/module/module_max/godmode/
├── page.tsx                      # 主页面 ✅
├── components/
│   ├── GodCanvas.tsx             # 画布容器（支持分形导航）✅
│   ├── GodNode.tsx               # 节点组件（支持双击进入）✅
│   ├── LayerPanel.tsx            # 图层切换 ✅
│   ├── AssetPanel.tsx            # 资产面板 ✅
│   ├── AIGenerationDialog.tsx    # AI 生成对话框 ✅
│   └── Breadcrumbs.tsx           # 面包屑导航 ✅
├── store/
│   └── GodModeContext.tsx        # 全局状态管理 ✅
├── types.ts                      # 类型定义 ✅
└── utils.ts                      # 工具函数
```


---

## 技术选型

| 需求 | 方案 |
|------|------|
| 画布 | `react-flow` 或 Canvas + Transform |
| 拖放 | HTML5 Drag & Drop |
| 连线 | SVG `<path>` 或 react-flow 内置 |
| 持久化 | `StorageManager` (IndexedDB) |

---

## AI 生成逻辑

生成时收集所有关联信息，构建完整上下文：

```
【世界观背景】
- 力量体系：{power层}
- 主要势力：{faction层}

【时间线背景】（新增）
- 当前章节：第 X 章
- 世界时间：{worldDate}
- 时代：{era}
- 前序事件：{上一个时间线节点}

【当前场景】
- 地点：{geography节点}
- 时间：{history节点}

【相关角色】
- {character节点 + 卡片内容}

【剧情事件】
- {plot节点 + description}

【写作要求】
生成章节，字数 2000-3000 字
```


---

## 与现有模块联动

| 模块 | 联动方式 |
|------|---------|
| 拆书中心 | 读取 `novel_writer_card_library` |
| 大纲生成 | 导出事件线为细纲 |
| 万字冲刺 | 生成结果同步到创作 |

---

## 分形系统（已实现 ✅）

支持无限下钻的分形世界构建：

- **双击进入子世界**：双击任意节点可进入其内部世界，在子层级继续扩展细节
- **面包屑导航**：顶部显示当前层级路径，支持快速返回上级
- **独立画布**：每个节点内部拥有独立的子画布和图层
- **无限嵌套**：理论上可无限深入，适合详细世界观构建

```typescript
interface FractalNode extends WorldNode {
  children?: WorldCanvas;  // 子世界画布
  parentId?: string;       // 父节点 ID
  depth: number;           // 嵌套深度
}
```

---

## 数据持久化（已实现 ✅）

- **自动保存**：每 2 秒自动保存到 IndexedDB
- **手动保存**：顶部工具栏"保存"按钮
- **自动加载**：启动时自动恢复最后状态
- **重置功能**：清空画布并重新开始

存储键：`novel_writer_godmode_canvas`

---

## 实现状态

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | 画布 + 节点 + 图层切换 | ✅ |
| P0 | 卡片栏 + 拖入节点 | ✅ |
| P1 | 连线 + 跨维度关联 | ✅ |
| P1 | AI 生成逻辑（区域生成 + 剧情推演） | ✅ |
| P1 | 分形系统（双击进入子世界） | ✅ |
| P1 | 数据持久化（IndexedDB） | ✅ |
| P2 | **时间线维度** | 🔄 计划中 |
| P2 | 悬浮预览 / 导出 | 待定 |

