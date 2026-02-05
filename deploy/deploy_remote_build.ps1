<#
.SYNOPSIS
    Deploy to remote server using local docker-compose.exe and SSH (DOCKER_HOST).

.DESCRIPTION
    1. Checks if 'docker-compose.exe' exists in the current directory.
    2. Sets the DOCKER_HOST environment variable.
    3. Runs 'docker-compose up -d --build'.

.PARAMETER RemoteHost
    The SSH connection string (e.g., ssh://user@host).
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$RemoteHost = "ssh://root@154.12.46.13"
)

# 1. Check if 'docker-compose.exe' exists in current dir
if (-not (Test-Path ".\docker-compose.exe")) {
    Write-Error "Error: 'docker-compose.exe' not found in current directory."
    Write-Warning "Please ensure you are running this script from the project root and that it contains docker-compose.exe."
    exit 1
}

# 2. Set DOCKER_HOST env var
$Env:DOCKER_HOST = $RemoteHost
Write-Host "DOCKER_HOST set to: $Env:DOCKER_HOST" -ForegroundColor Cyan

# 3. Run 'docker-compose up -d --build'
# Note: Using -f deploy/docker-compose.yml
$ComposeFile = "deploy/docker-compose.yml"

if (-not (Test-Path $ComposeFile)) {
    Write-Error "Error: '$ComposeFile' not found."
    exit 1
}

Write-Host "Connecting to remote server and building..." -ForegroundColor Cyan
Write-Host "Command: .\docker-compose.exe -f $ComposeFile up -d --build" -ForegroundColor DarkGray

# Execute command
.\docker-compose.exe -f $ComposeFile up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
} else {
    Write-Error "Deployment failed, exit code: $LASTEXITCODE"
}