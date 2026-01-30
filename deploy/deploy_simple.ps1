Write-Host "Start Deploying..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
$RemotePath = "/opt/aimax/ai-novel-writer"
$LocalRoot = Resolve-Path "$PSScriptRoot\.."

Write-Host "1. Staging files..." -ForegroundColor Yellow
# Use system temp directory to avoid file watcher locks
$TempDir = Join-Path $env:TEMP "ai-novel-writer-build"
$ZipFile = "$LocalRoot\deploy_pkg.zip"

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }

# Create temp dir
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Use Robocopy to copy files with exclusions
$excludeDirs = @("node_modules", ".git", ".next", ".cursor", ".idea", ".vscode", "deploy_temp_build")
$excludeFiles = @("deploy_pkg.zip", "deploy_pkg.tar", "dev.db", "*.log")

# Robocopy /S (subdirs) is better than /E (empty) if we don't need empty dirs, but /E is fine.
$roboCmd = "robocopy `"$LocalRoot`" `"$TempDir`" /E /XD $excludeDirs /XF $excludeFiles /MT:8 /R:0 /W:0"
Invoke-Expression $roboCmd | Out-Null

if ($LASTEXITCODE -ge 8) {
    Write-Host "Error: Robocopy failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# Give a moment for file handles to settle
Start-Sleep -Seconds 2

Write-Host "2. Compressing..." -ForegroundColor Yellow
Push-Location $TempDir
Compress-Archive -Path . -DestinationPath $ZipFile -Force
Pop-Location

# Clean temp
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $ZipFile)) {
    Write-Host "Error: Failed to create archive." -ForegroundColor Red
    exit 1
}

Write-Host "3. Uploading archive package..." -ForegroundColor Yellow
scp -P $Port "$ZipFile" "$User@$ServerIP`:$RemotePath/deploy_pkg.zip"

if (Test-Path $ZipFile) { Remove-Item "$ZipFile" -Force }

Write-Host "4. Extracting and Restarting..." -ForegroundColor Yellow
# Using unzip on server, handling subdirectory, AND ensuring .env is in deploy folder, AND fixing DB path
$RemoteCmd = "cd $RemotePath && unzip -o deploy_pkg.zip && rm deploy_pkg.zip && (if [ -d 'ai-novel-writer-build' ]; then echo 'Found subdirectory, moving files...' && cp -rf ai-novel-writer-build/* . && cp -rf ai-novel-writer-build/.* . 2>/dev/null || true && rm -rf ai-novel-writer-build; fi) && cp .env deploy/.env && sed -i 's|DATABASE_URL=.*|DATABASE_URL=\"file:/data/db.sqlite\"|' deploy/.env && cd deploy && docker compose down && docker compose build --no-cache app && docker compose up -d"

ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Done! Deployment Complete." -ForegroundColor Green
