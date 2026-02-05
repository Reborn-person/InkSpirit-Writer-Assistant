#!/bin/bash
set -e

DEPLOY_PATH="/opt/aimax/ai-novel-writer/deploy"

echo "Updating Caddyfile to HTTP mode..."
# We configure Caddy to listen on port 80 for any hostname
# This bypasses the SSL requirement which is failing due to DNS issues
cat > "$DEPLOY_PATH/Caddyfile" <<EOF
:80 {
    reverse_proxy app:3000
}
EOF

echo "Caddyfile updated."

cd "$DEPLOY_PATH"
echo "Restarting Caddy..."
docker compose restart caddy
docker compose logs --tail=20 caddy