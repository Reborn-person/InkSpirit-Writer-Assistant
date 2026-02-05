#!/bin/bash
set -e

DEPLOY_PATH="/opt/aimax/ai-novel-writer/deploy"
PREBUILT_PATH="/opt/aimax/ai-novel-writer/prebuilt"

# 1. Force overwrite Dockerfile with correct content
echo "Overwriting Dockerfile..."
cat > "$PREBUILT_PATH/Dockerfile" <<EOF
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy everything from build context (which is prebuilt folder) to /app
COPY . .

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

# Placeholder
CMD ["node", "server.js"]
EOF

# 2. Find server.js relative path
SERVER_JS=$(find "$PREBUILT_PATH" -name server.js | head -n 1)
if [ -z "$SERVER_JS" ]; then
    echo "Error: server.js not found in $PREBUILT_PATH"
    find "$PREBUILT_PATH" -maxdepth 2
    exit 1
fi

REL_PATH=${SERVER_JS#$PREBUILT_PATH/}
echo "Server path: $REL_PATH"

# 3. Update CMD in Dockerfile
sed -i "s|CMD \[\"node\", \"server.js\"\]|CMD \[\"node\", \"$REL_PATH\"\]|" "$PREBUILT_PATH/Dockerfile"

# 4. Verify Dockerfile content
echo "--- Dockerfile Content ---"
cat "$PREBUILT_PATH/Dockerfile"
echo "--------------------------"

# 5. Deploy
cd "$DEPLOY_PATH"
echo "Starting deployment..."
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build app
docker compose logs -f --tail=20 app