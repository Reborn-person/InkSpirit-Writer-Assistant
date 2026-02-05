# 部署错误日志与反思 (DEPLOY_MISTAKES.md)

## 1. 数据库丢失风险
**错误描述**：部署脚本中的清理命令 (`rm -rf`) 没有排除 `prisma` 目录，且 Docker 容器没有正确映射宿主机上的 SQLite 数据库文件。
**后果**：应用启动时找不到旧数据库，自动创建了新库，导致用户数据看似丢失（实际上文件还在，只是没连上）。
**修正方案**：
- 清理命令必须显式排除数据目录：`! -name 'prisma' ! -name 'data'`。
- `docker-compose.yml` 必须使用绝对路径或正确相对路径映射数据库：`- ../data/db.sqlite:/app/prisma/dev.db`。

## 2. 环境变量加载失败
**错误描述**：`.env` 文件位于项目根目录，但 `docker-compose.yml` 在 `deploy` 子目录运行，无法自动读取上级目录的环境变量。
**后果**：应用启动时缺失 `JWT_SECRET` 和 `DATABASE_URL`，导致登录失败和数据库连接错误。
**修正方案**：在启动 Docker 前，必须将 `.env` 复制到 `deploy` 目录，或在 compose 文件中指定 `env_file` 路径。

## 3. 功能未更新 (构建中断)
**错误描述**：通过 SSH 执行 `docker compose build` 时，因网络波动或超时导致连接断开，构建进程被终止。随后仅执行了 `up -d`，使用的是旧镜像。
**后果**：代码已上传，但运行的仍是旧版本应用，新功能（如下载按钮）未生效。
**修正方案**：
- 显式执行构建命令并确保完成。
- 对于长时间任务，应使用 `nohup` 或 `screen`，或者分步执行。

## 4. Windows 打包问题
**错误描述**：在 Windows 上使用 `tar` 打包当前目录 (`.`) 时，容易遇到文件锁冲突（Permission denied），导致压缩包不完整。
**修正方案**：
- 使用 `*` 通配符代替 `.`。
- 将压缩包生成到系统临时目录，或在命令中显式排除压缩包自身。

---
**下次部署检查清单：**
- [ ] 确认 `deploy_update.ps1` 中的排除列表包含数据库和密钥。
- [ ] 确认 `docker-compose.yml` 的 Volume 映射正确指向宿主机真实数据路径。
- [ ] 部署后必须显式执行 `docker compose build --no-cache` 并等待其成功完成。
- [ ] 检查服务器日志确认环境变量 (`DATABASE_URL`, `JWT_SECRET`) 已正确加载。
