Write-Host "Restoring Caddy to HTTPS mode..." -ForegroundColor Green

$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"

$LocalScriptPath = ".\restore_caddy_https.sh"

$RemoteScriptContent = @'
#!/bin/bash
set -e

DEPLOY_PATH="/opt/aimax/ai-novel-writer/deploy"

echo "Restoring Caddyfile to HTTPS mode..."
cat > "$DEPLOY_PATH/Caddyfile" <<EOF
www.inkspirit.top {
  reverse_proxy app:3000
}

inkspirit.top {
  redir https://www.inkspirit.top{uri} permanent
}
EOF

echo "Caddyfile updated."

cd "$DEPLOY_PATH"
echo "Restarting Caddy..."
docker compose restart caddy
docker compose logs -f --tail=20 caddy
'@

Set-Content -Path $LocalScriptPath -Value $RemoteScriptContent -Encoding UTF8 -NoNewline
(Get-Content $LocalScriptPath -Raw) -replace "`r`n", "`n" | Set-Content $LocalScriptPath -NoNewline

Write-Host "Uploading script..."
scp -P $Port $LocalScriptPath "$User@$ServerIP`:/tmp/restore_caddy_https.sh"

Write-Host "Executing script..."
ssh -p $Port $User@$ServerIP "sed -i 's/\r$//' /tmp/restore_caddy_https.sh && chmod +x /tmp/restore_caddy_https.sh && /tmp/restore_caddy_https.sh"
