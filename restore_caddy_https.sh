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