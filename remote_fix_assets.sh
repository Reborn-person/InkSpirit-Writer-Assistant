#!/bin/bash
set -e

PREBUILT_PATH="/opt/aimax/ai-novel-writer/prebuilt"
TARGET_DIR="$PREBUILT_PATH/aimax/AIpous/ai-novel-writer"

echo "Target directory: $TARGET_DIR"

# Move .next folder
# Note: standalone output might already have .next folder, but it's minimal.
# We need to merge or overwrite with the static assets we copied to root.

# Check if .next exists in root
if [ -d "$PREBUILT_PATH/.next" ]; then
    echo "Found .next in root, moving/merging to target..."
    mkdir -p "$TARGET_DIR/.next"
    cp -rf "$PREBUILT_PATH/.next"/* "$TARGET_DIR/.next/"
    # Don't delete root .next yet, just in case
fi

# Check if public exists in root
if [ -d "$PREBUILT_PATH/public" ]; then
    echo "Found public in root, moving/merging to target..."
    mkdir -p "$TARGET_DIR/public"
    cp -rf "$PREBUILT_PATH/public"/* "$TARGET_DIR/public/"
fi

# Also check for Prisma
if [ -d "$PREBUILT_PATH/prisma" ]; then
    echo "Found prisma in root, moving/merging to target..."
    mkdir -p "$TARGET_DIR/prisma"
    cp -rf "$PREBUILT_PATH/prisma"/* "$TARGET_DIR/prisma/"
fi

# Also check for package.json
if [ -f "$PREBUILT_PATH/package.json" ]; then
    echo "Found package.json in root, copying to target..."
    cp -f "$PREBUILT_PATH/package.json" "$TARGET_DIR/"
fi

echo "File structure adjusted."

# Restart container
cd /opt/aimax/ai-novel-writer/deploy
docker compose -f docker-compose.yml -f docker-compose.override.yml restart app