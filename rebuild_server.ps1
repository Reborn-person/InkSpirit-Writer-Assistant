$ServerIP = "154.12.46.13"
$User = "root"
Write-Host "Connecting to server to rebuild application..." -ForegroundColor Yellow
ssh -p 22 $User@$ServerIP "cd /opt/aimax/ai-novel-writer/deploy && docker compose up -d --build app && docker compose logs -f --tail=50 app"
