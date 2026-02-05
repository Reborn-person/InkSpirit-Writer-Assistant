Write-Host "Start Deployment (Local Build -> Remote Run) with Prisma Fix..." -ForegroundColor Green

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

# Copy standalone build
Write-Host "   Copying standalone build..."
Copy-Item "$LocalRoot\.next\standalone\*" "$TempDir" -Recurse -Force

# FLATTEN STRUCTURE LOCALLY
$NestedPath = "$TempDir\aimax\AIpous\ai-novel-writer"
if (Test-Path $NestedPath) {
    Write-Host "   Flattening directory structure..."
    Copy-Item "$NestedPath\*" "$TempDir" -Recurse -Force
    Remove-Item "$TempDir\aimax" -Recurse -Force
}

# Copy Prisma Engines (Critical Fix)
Write-Host "   Copying Prisma engines..."
$PrismaClientDir = "$TempDir\node_modules\.prisma\client"
if (-not (Test-Path $PrismaClientDir)) {
    New-Item -ItemType Directory -Path $PrismaClientDir -Force | Out-Null
}
Copy-Item "$LocalRoot\node_modules\.prisma\client\*" "$PrismaClientDir" -Recurse -Force

# Copy static assets
Write-Host "   Copying static assets..."
New-Item -ItemType Directory -Path "$TempDir\.next\static" -Force | Out-Null
Copy-Item "$LocalRoot\.next\static\*" "$TempDir\.next\static" -Recurse -Force
Copy-Item "$LocalRoot\public" "$TempDir\public" -Recurse -Force

# Copy Prisma schema and other configs
Write-Host "   Copying config files..."
Copy-Item "$LocalRoot\prisma" "$TempDir\prisma" -Recurse -Force
Copy-Item "$LocalRoot\docker-entrypoint.sh" "$TempDir\docker-entrypoint.sh" -Force

# Create Dockerfile
$DockerfileContent = @"
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY . .

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["node", "server.js"]
"@
Set-Content -Path "$TempDir\Dockerfile" -Value $DockerfileContent -Encoding UTF8 -NoNewline
# Convert line endings
(Get-Content "$TempDir\Dockerfile" -Raw) -replace "`r`n", "`n" | Set-Content "$TempDir\Dockerfile" -NoNewline

Write-Host "2. Compressing..." -ForegroundColor Yellow
Push-Location $TempDir
Compress-Archive -Path . -DestinationPath $ZipFile -Force
Pop-Location

# Clean temp
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "3. Uploading artifacts..." -ForegroundColor Yellow
scp -P $Port "$ZipFile" "$User@$ServerIP`:$RemotePath/deploy_prebuilt.zip"

Write-Host "4. Restarting Server..." -ForegroundColor Yellow
# We need to make sure we clean up the old prebuilt directory before unzipping
$RemoteCmd = "cd $RemotePath && rm -rf prebuilt && unzip -o deploy_prebuilt.zip -d prebuilt && cp .env deploy/.env && sed -i 's|DATABASE_URL=.*|DATABASE_URL=`"file:/data/db.sqlite`"|' deploy/.env && cd deploy && cp ../prebuilt/Dockerfile Dockerfile.prebuilt && echo 'services:' > docker-compose.override.yml && echo '  app:' >> docker-compose.override.yml && echo '    build:' >> docker-compose.override.yml && echo '      context: ../prebuilt' >> docker-compose.override.yml && echo '      dockerfile: Dockerfile' >> docker-compose.override.yml && echo '    command: node server.js' >> docker-compose.override.yml && docker compose down && docker compose up -d --build app && docker compose logs -f --tail=20 app"

ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Done!" -ForegroundColor Green
