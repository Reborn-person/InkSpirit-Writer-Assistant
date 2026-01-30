# 用户权限与 API 用量控制方案

> 版本: v1 | 日期: 2026-01-26

## 核心目标

收紧 API 开放策略，转型为封闭式服务架构。

**关键变更**：
1. **PROMAX 用户**：保留完整自由度，可自定义 API Key、模型、Provider。
2. **其他用户 (PRO / PRO+ / MAX)**：
   - 禁止修改 API 设置
   - 只能使用平台提供的内置 API 服务
   - 受到严格的用量限制（Token 或 调用次数）

---

## 权限矩阵设计

| 权限点 | PROMAX | PRO | PRO+ | MAX |
|--------|--------|-----|------|-----|
| **自定义 API Key** | ✅ 允许 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 |
| **自定义 Endpoint** | ✅ 允许 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 |
| **切换模型** | ✅ 允许 | ⚠️ 仅限内置列表 | ⚠️ 仅限内置列表 | ⚠️ 仅限内置列表 |
| **API 调用通道** | 直连 OR 代理 | 强制代理 | 强制代理 | 强制代理 |

---

## 技术实现方案

### 1. 前端改造 (Settings Page)

- **状态通过**：从 API 获取当前用户等级。
- **条件渲染**：
  - 如果 `level === 'PROMAX'`：渲染完整的 API 配置表单。
  - 如果 `level !== 'PROMAX'`：
    - 隐藏 API Key / Base URL 输入框。
    - 显示 "当前使用平台托管 API" 标识。
    - 显示用量统计（今日已用 / 剩余额度）。

### 2. 后端代理 (Next.js API Routes)

由于非 PROMAX 用户没有自己的 Key，所有请求必须由后端转发。

**新增 Proxy 路由**：`/api/proxy/chat`, `/api/proxy/image` 等。

**处理流程**：
1. 接收前端请求
2. 验证用户 Session & 等级
3. 检查用户剩余配额（Quota Check）
4. 如果有额度 -> 附上系统的 Master Key -> 转发给上游模型服务商 (如 SiliconFlow)
5. 如果无额度 -> 返回 402 Payment Required

### 3. 数据库变更 (Schema)

需要新增表来记录用户用量。

```prisma
model UserQuota {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  
  // 每日刷新
  dailyTokensUsed  Int      @default(0)
  dailyImageCount  Int      @default(0)
  lastResetDate    DateTime @default(now())
  
  // 总量限制（可选）
  monthlyTokensUsed Int     @default(0)
}
```

### 4. 配额策略 (示例)

| 等级 | 每日 Token | 每日绘图 | 备注 |
|------|-----------|----------|------|
| **PRO** | 50k | 10张 | 基础创作够用 |
| **PRO+**| 200k | 50张 | 深度创作 |
| **MAX** | 1000k | 无限 | 几乎无限 |
| **PROMAX**| 自定义Key | 自定义Key | 走自己的号 |

---

## 迁移策略

1. **现有 Key 处理**：
   - 非 PROMAX 用户的本地存储 Key (`localStorage`) 将失效或被忽略。
   - 建议在 UI 上弹出提示："系统升级，您可以绑定自己的 Key (需升级 PROMAX) 或直接使用平台额度。"

2. **过渡期**：
   - 可设置一个 grace period，允许老用户在一定时间内继续使用本地 Key。
