#!/bin/bash
set -e

DEPLOY_PATH="/opt/aimax/ai-novel-writer/deploy"

echo "Updating docker-compose.override.yml..."
cat > "$DEPLOY_PATH/docker-compose.override.yml" <<EOF
services:
  app:
    build:
      context: ../prebuilt
      dockerfile: Dockerfile
    command: node server.js
EOF

echo "Override updated. Restarting..."

cd "$DEPLOY_PATH"
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build app
docker compose logs -f --tail=20 app