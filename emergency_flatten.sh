#!/bin/bash
set -e

BASE_DIR="/opt/aimax/ai-novel-writer/prebuilt"
DEEP_DIR="$BASE_DIR/aimax/AIpous/ai-novel-writer"

echo "Base Dir: $BASE_DIR"
echo "Deep Dir: $DEEP_DIR"

cd "$BASE_DIR"

# 1. Check if deep directory exists
if [ -d "$DEEP_DIR" ]; then
    echo "Deep nesting found. Moving files to root..."
    
    # Move specific important folders first to avoid "Directory not empty" issues if possible
    # But cp -rf is safer for merging
    
    # Copy everything from deep dir to root, overwriting existing
    cp -rf "$DEEP_DIR"/* .
    
    # Also look for hidden files like .next (cp * usually skips hidden files in bash unless configured)
    if [ -d "$DEEP_DIR/.next" ]; then
        echo "Moving .next..."
        rm -rf .next # Remove partial/broken .next in root
        cp -rf "$DEEP_DIR/.next" .
    fi
    
    # Clean up the deep nest
    rm -rf aimax
    echo "Files moved to root. Deep nest removed."
else
    echo "Deep directory not found. Assuming already flat or different structure."
    ls -la
fi

# 2. Verify structure
if [ ! -f "server.js" ]; then
    echo "CRITICAL ERROR: server.js not found in root after flatten!"
    find . -maxdepth 3 -name server.js
    exit 1
fi

if [ ! -d ".next" ]; then
    echo "CRITICAL ERROR: .next directory not found in root!"
    exit 1
fi

if [ ! -d "public" ]; then
    echo "WARNING: public directory not found in root!"
fi

# 3. Rewrite Dockerfile to be dead simple
echo "Rewriting Dockerfile..."
cat > Dockerfile <<EOF
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install dependencies for Prisma (OpenSSL)
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy ALL files from the flattened prebuilt directory to /app
COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["node", "server.js"]
EOF

echo "Dockerfile updated."

# 4. Deploy
cd /opt/aimax/ai-novel-writer/deploy
echo "Restarting service..."
docker compose -f docker-compose.yml -f docker-compose.override.yml down
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build app
docker compose logs -f --tail=20 app