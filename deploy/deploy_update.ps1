Write-Host "Start Deploying..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
$RemotePath = "/opt/aimax/ai-novel-writer"
$LocalRoot = Resolve-Path "$PSScriptRoot\.."

# 1. Archive Files (Tar mode) - 全量打包模式
Write-Host "1. Archiving ALL files locally (excluding node_modules/git/next)..." -ForegroundColor Yellow

# 使用当前目录下的临时文件，但确保文件名不冲突
$TarFile = "$LocalRoot\aimax_deploy_temp.tar"

# 确保旧包已删除
if (Test-Path $TarFile) { Remove-Item $TarFile -Force }

Set-Location $LocalRoot

# 尝试全量打包
# 注意：排除自己 $TarFile
try {
    # 显式指定 tar.exe，防止路径问题
    # 使用相对路径排除
    tar -cf "aimax_deploy_temp.tar" --exclude="aimax_deploy_temp.tar" --exclude=".git" --exclude="node_modules" --exclude=".next" --exclude="prisma/dev.db" * 2>$null
} catch {
    Write-Host "Warning: Tar command encountered issues." -ForegroundColor Yellow
}

if (-not (Test-Path $TarFile)) {
    Write-Host "Error: Failed to create archive at $TarFile" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $TarFile).Length
if ($fileSize -lt 1024) {
    Write-Host "Error: Archive is too small ($fileSize bytes), something went wrong." -ForegroundColor Red
    exit 1
}

Write-Host "Archive created successfully: $TarFile ($([math]::Round($fileSize/1MB, 2)) MB)" -ForegroundColor Green

# 2. Upload Archive
Write-Host "2. Uploading archive package..." -ForegroundColor Yellow
scp -P $Port -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TarFile" "$User@$ServerIP`:$RemotePath/deploy_pkg.tar"

# Fail fast if upload failed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: SCP upload failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# Remove local tar after upload
if (Test-Path $TarFile) { Remove-Item "$TarFile" -Force }

# 3. Extract & Restart
Write-Host "3. Extracting and Restarting (Full Refresh)..." -ForegroundColor Yellow
# Commands:
# 1. 进入目录并清理旧代码（保留数据目录）
# 2. 解压全量包
# 3. 执行 Docker 重建
$RemoteCmd = "cd $RemotePath && find . -maxdepth 1 ! -name 'deploy_pkg.tar' ! -name 'data' ! -name 'node_modules' ! -name 'prisma' ! -name '.env' ! -name '.' -exec rm -rf {} + && tar -xf deploy_pkg.tar && rm deploy_pkg.tar && cd deploy && docker compose down && docker compose build --no-cache app && docker compose up -d"
$RemoteCmd = "cd $RemotePath && find . -maxdepth 1 ! -name 'deploy_pkg.tar' ! -name 'data' ! -name 'node_modules' ! -name 'prisma' ! -name '.env' ! -name '.' -exec rm -rf {} + && tar -xf deploy_pkg.tar && rm deploy_pkg.tar && if [ -f .env ]; then cp -f .env deploy/.env; fi && cd deploy && docker compose down && docker compose build --no-cache app && docker compose up -d"

ssh -p $Port -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $User@$ServerIP $RemoteCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: SSH remote deploy failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "Done! Deployment Complete." -ForegroundColor Green
