Write-Host "Start Deploying..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
$RemotePath = "/opt/aimax/ai-novel-writer"
$TarFile = "C:\Users\Administrator\Desktop\deploy_pkg.tar"

Write-Host "1. Creating archive..." -ForegroundColor Yellow

if (Test-Path $TarFile) { Remove-Item $TarFile -Force }

$LocalRoot = $PSScriptRoot + "\.."
Set-Location $LocalRoot

& tar -cf "$TarFile" --exclude=".git" --exclude="node_modules" --exclude=".next" --exclude="prisma/dev.db" --exclude="*.tar" --exclude="*.zip" .

if (-not (Test-Path $TarFile)) {
    Write-Host "Error: Failed to create archive." -ForegroundColor Red
    exit 1
}

Write-Host "2. Uploading archive package..." -ForegroundColor Yellow
& scp -P $Port "$TarFile" "$User@$ServerIP`:$RemotePath/deploy_pkg.tar"

if (Test-Path $TarFile) { Remove-Item "$TarFile" -Force }

Write-Host "3. Extracting and Restarting..." -ForegroundColor Yellow
$RemoteCmd = "cd $RemotePath && find . -maxdepth 1 ! -name 'deploy_pkg.tar' ! -name 'data' ! -name 'node_modules' ! -name '.' -exec rm -rf {} + 2>/dev/null; tar -xf deploy_pkg.tar && rm deploy_pkg.tar && cd deploy && docker compose down && docker compose build --no-cache app && docker compose up -d"

& ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Done! Deployment Complete." -ForegroundColor Green
