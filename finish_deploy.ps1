$ServerIP = "154.12.46.13"
$User = "root"
Write-Host "Manually completing deployment..." -ForegroundColor Yellow
$Cmd = "cd /opt/aimax/ai-novel-writer/deploy && docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build app && docker compose logs -f --tail=20 app"
ssh -p 22 $User@$ServerIP $Cmd
