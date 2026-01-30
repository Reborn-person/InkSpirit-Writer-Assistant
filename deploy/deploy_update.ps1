Write-Host "Start Deploying..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
$RemotePath = "/opt/aimax/ai-novel-writer"
$LocalRoot = Resolve-Path "$PSScriptRoot\.."

# 1. Archive Files (Tar mode) - 全量打包模式
Write-Host "1. Archiving ALL files locally (excluding node_modules/git/next)..." -ForegroundColor Yellow
$TarFile = "$LocalRoot\deploy_pkg.tar"

# 确保旧包已删除
if (Test-Path $TarFile) { Remove-Item $TarFile -Force }

Set-Location $LocalRoot

# 尝试全量打包，如果失败则回退到指定列表打包
tar -cf "$TarFile" --exclude=".git" --exclude="node_modules" --exclude=".next" --exclude="prisma/dev.db" .

if (-not (Test-Path $TarFile)) {
    Write-Host "Error: Failed to create archive." -ForegroundColor Red
    exit 1
}

# 2. Upload Archive
Write-Host "2. Uploading archive package..." -ForegroundColor Yellow
scp -P $Port "$TarFile" "$User@$ServerIP`:$RemotePath/deploy_pkg.tar"

# Remove local tar after upload
if (Test-Path $TarFile) { Remove-Item "$TarFile" -Force }

# 3. Extract & Restart
Write-Host "3. Extracting and Restarting (Full Refresh)..." -ForegroundColor Yellow
# Commands:
# 1. 进入目录并清理旧代码（保留数据目录）
# 2. 解压全量包
# 3. 执行 Docker 重建
$RemoteCmd = "cd $RemotePath && find . -maxdepth 1 ! -name 'deploy_pkg.tar' ! -name 'data' ! -name 'node_modules' ! -name '.' -exec rm -rf {} + && tar -xf deploy_pkg.tar && rm deploy_pkg.tar && cd deploy && docker compose down && docker compose build --no-cache app && docker compose up -d"

ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Done! Deployment Complete." -ForegroundColor Green
