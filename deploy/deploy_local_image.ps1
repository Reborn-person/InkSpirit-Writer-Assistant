# ---------------------------------------------------------
# 本地构建 + 镜像上传部署脚本
# 解决服务器 npm ci 内存不足的问题
# ---------------------------------------------------------

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
# 注意：这里改为你的实际远程路径
$RemotePath = "/opt/aimax/ai-novel-writer" 

# 1. 本地构建 Docker 镜像
Write-Host "1. Building Docker Image Locally (This may take time)..." -ForegroundColor Yellow
$LocalRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $LocalRoot

# 使用 docker buildx 构建以确保兼容性 (如果本地是 Mac/Arm，必须指定 --platform linux/amd64)
# 如果本地也是 Windows/Intel，可以直接 docker build
docker build --platform linux/amd64 -t ai-novel-writer:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Local Docker Build Failed" -ForegroundColor Red
    exit 1
}

# 2. 导出镜像为文件
Write-Host "2. Saving Image to File (compressing)..." -ForegroundColor Yellow
$ImageFile = "$PSScriptRoot\image_payload.tar"
# 保存镜像
docker save -o $ImageFile ai-novel-writer:latest

# 3. 上传镜像和 docker-compose.yml
Write-Host "3. Uploading Image to Server..." -ForegroundColor Yellow
# 先上传 docker-compose.yml (确保配置最新)
scp -P $Port "$PSScriptRoot\docker-compose.yml" "$User@$ServerIP`:$RemotePath/deploy/docker-compose.yml"
# 上传镜像包
scp -P $Port $ImageFile "$User@$ServerIP`:$RemotePath/image_payload.tar"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Upload Failed" -ForegroundColor Red
    exit 1
}

# 清理本地大文件
Remove-Item $ImageFile -Force

# 4. 服务器端执行：加载镜像并重启
Write-Host "4. Loading Image on Server and Restarting..." -ForegroundColor Yellow

$RemoteCmd = "
cd $RemotePath && \
echo '-> Loading Docker Image...' && \
docker load -i image_payload.tar && \
rm image_payload.tar && \
cd deploy && \
echo '-> Restarting Containers...' && \
# 修改 docker-compose.yml 确保它使用我们刚上传的镜像，而不是尝试构建
# 这一步很关键：我们需要覆盖 build 指令，强制使用 image
export COMPOSE_FILE=docker-compose.yml && \
docker compose down && \
# 这里的 trick 是：如果 docker-compose.yml 里有 build，up 可能会触发 build。
# 我们显式指定 image 名称启动，或者依赖 docker compose 的智能行为
docker compose up -d --no-build
"

ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Done! Deployment Complete via Local Build." -ForegroundColor Green