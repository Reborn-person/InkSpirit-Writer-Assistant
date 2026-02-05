Write-Host "Start Deployment (Local Build -> Remote Run)..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
$RemotePath = "/opt/aimax/ai-novel-writer"
$LocalRoot = Resolve-Path "$PSScriptRoot\.."

Write-Host "1. Staging files..." -ForegroundColor Yellow
$TempDir = Join-Path $env:TEMP "ai-novel-writer-prebuilt"
$ZipFile = "$LocalRoot\deploy_prebuilt.zip"

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }

New-Item -ItemType Directory -Path $TempDir | Out-Null
New-Item -ItemType Directory -Path "$TempDir\.next" | Out-Null

# Copy standalone build
Write-Host "   Copying standalone build..."
Copy-Item "$LocalRoot\.next\standalone\*" "$TempDir" -Recurse -Force

# Copy static assets (Required for standalone)
Write-Host "   Copying static assets..."
New-Item -ItemType Directory -Path "$TempDir\.next\static" | Out-Null
Copy-Item "$LocalRoot\.next\static\*" "$TempDir\.next\static" -Recurse -Force
Copy-Item "$LocalRoot\public" "$TempDir\public" -Recurse -Force

# Copy Prisma and Config
Write-Host "   Copying config files..."
Copy-Item "$LocalRoot\prisma" "$TempDir\prisma" -Recurse -Force
Copy-Item "$LocalRoot\docker-entrypoint.sh" "$TempDir\docker-entrypoint.sh" -Force
Copy-Item "$LocalRoot\deploy\Dockerfile.prebuilt" "$TempDir\Dockerfile" -Force

Write-Host "2. Compressing..." -ForegroundColor Yellow
Push-Location $TempDir
Compress-Archive -Path . -DestinationPath $ZipFile -Force
Pop-Location

# Clean temp
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "3. Uploading artifacts..." -ForegroundColor Yellow
scp -P $Port "$ZipFile" "$User@$ServerIP`:$RemotePath/deploy_prebuilt.zip"

Write-Host "4. Restarting Server..." -ForegroundColor Yellow
$RemoteCmd = "cd $RemotePath && unzip -o deploy_prebuilt.zip -d prebuilt && cp .env deploy/.env && sed -i 's|DATABASE_URL=.*|DATABASE_URL=`"file:/data/db.sqlite`"|' deploy/.env && cd deploy && cp ../prebuilt/Dockerfile Dockerfile.prebuilt && docker compose -f docker-compose.yml -f docker-compose.override.yml down 2>/dev/null || docker compose down && echo 'Creating override...' && echo 'services:' > docker-compose.override.yml && echo '  app:' >> docker-compose.override.yml && echo '    build:' >> docker-compose.override.yml && echo '      context: ../prebuilt' >> docker-compose.override.yml && echo '      dockerfile: Dockerfile' >> docker-compose.override.yml && echo '    command: node server.js' >> docker-compose.override.yml && docker compose up -d --build app && docker compose logs -f --tail=20 app"

ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Done!" -ForegroundColor Green
