Write-Host "Starting Caddy Reverse Proxy..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"

# We just need to bring up Caddy. Docker Compose handles the dependency on 'app' automatically if we bring up the whole stack,
# or we can explicitly start caddy. 
# Since app is already running, 'docker compose up -d caddy' will just start caddy and leave app running (or recreate it if config changed).
# To be safe and clean, let's just 'up -d' everything.

$RemoteCmd = "cd /opt/aimax/ai-novel-writer/deploy && docker compose up -d caddy && docker compose ps && echo '--- Caddy Logs ---' && docker compose logs --tail=20 caddy"

ssh -p $Port $User@$ServerIP $RemoteCmd

Write-Host "Caddy started. Please check the website." -ForegroundColor Green
