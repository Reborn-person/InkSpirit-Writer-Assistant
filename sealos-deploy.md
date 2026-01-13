# Sealos 部署指南

## 🚀 快速部署到 Sealos

### 📋 应用信息
- **名称**: AI Novel Writer
- **类型**: Next.js Web 应用
- **端口**: 3000
- **运行时**: Node.js 18

### 🛠️ 部署步骤

#### 方法一：使用 Sealos 控制台（推荐）

1. **登录 Sealos 控制台**
   - 访问 [https://cloud.sealos.io](https://cloud.sealos.io)
   - 使用您的账号登录

2. **创建新的应用**
   - 点击「应用管理」→「创建应用」
   - 应用名称：`ai-novel-writer`
   - 镜像地址：使用本项目的 Dockerfile 构建

3. **配置应用参数**
   ```yaml
   镜像: node:18-alpine
   工作目录: /app
   启动命令: npm start
   端口: 3000
   ```

4. **设置环境变量**
   ```env
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_APP_NAME=AI Novel Writer
   NEXT_TELEMETRY_DISABLED=1
   ```

5. **配置资源限制**
   ```yaml
   CPU: 100m (最小) - 500m (最大)
   内存: 256Mi (最小) - 512Mi (最大)
   ```

6. **部署应用**
   - 点击「部署」按钮
   - 等待应用启动完成

#### 方法二：使用 kubectl 命令行

1. **构建 Docker 镜像**
   ```bash
   # 在项目根目录执行
   docker build -t ai-novel-writer:latest .
   ```

2. **推送到镜像仓库**
   ```bash
   # 推送到 Docker Hub（需要登录）
   docker tag ai-novel-writer:latest your-username/ai-novel-writer:latest
   docker push your-username/ai-novel-writer:latest
   ```

3. **应用 Kubernetes 配置**
   ```bash
   # 使用提供的 k8s 配置文件
   kubectl apply -f k8s-deployment.yaml
   ```

### 🔧 环境配置

#### 环境变量
复制 `.env.sealos` 文件中的环境变量到 Sealos 控制台：

```bash
# 生产环境配置
NODE_ENV=production
PORT=3000

# 应用配置
NEXT_PUBLIC_APP_NAME=AI Novel Writer
NEXT_PUBLIC_APP_VERSION=0.1.0

# 构建配置
NEXT_TELEMETRY_DISABLED=1
```

#### 端口配置
- **容器端口**: 3000
- **服务端口**: 80
- **协议**: TCP

### 📁 文件结构
```
ai-novel-writer/
├── Dockerfile              # Docker 镜像构建文件
├── .dockerignore          # Docker 忽略文件
├── k8s-deployment.yaml    # Kubernetes 部署配置
├── .env.sealos           # Sealos 环境变量配置
├── sealos-deploy.md      # 本部署文档
└── ...                   # 其他项目文件
```

### 🌐 访问应用

部署完成后，Sealos 会为您提供一个访问 URL，通常是：

```
https://your-app-name.sealos.run
```

### 🔍 监控和日志

在 Sealos 控制台中，您可以：
- 查看应用状态
- 监控资源使用情况
- 查看实时日志
- 进行扩缩容操作

### 🚨 常见问题

#### 1. 构建失败
- 确保所有依赖都已安装：`npm install`
- 检查 Node.js 版本是否为 18+
- 验证 package.json 中的脚本是否正确

#### 2. 应用启动失败
- 检查端口是否被占用
- 验证环境变量配置
- 查看应用日志获取详细错误信息

#### 3. 访问问题
- 确认服务端口配置正确
- 检查防火墙设置
- 验证域名解析是否正常

### 📞 技术支持

如遇到部署问题，可以：
- 查看 Sealos 官方文档
- 在 Sealos 社区寻求帮助
- 检查应用日志进行故障排查

### 📝 更新说明

每次代码更新后，需要：
1. 重新构建 Docker 镜像
2. 更新 Sealos 应用
3. 验证部署是否成功