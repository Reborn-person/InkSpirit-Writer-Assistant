#!/bin/bash
set -e

PREBUILT_PATH="/opt/aimax/ai-novel-writer/prebuilt"
TARGET_DIR="$PREBUILT_PATH/aimax/AIpous/ai-novel-writer"

echo "Target directory: $TARGET_DIR"

# Check if root .next/static exists
if [ -d "$PREBUILT_PATH/.next/static" ]; then
    echo "Found .next/static in root, copying to target..."
    mkdir -p "$TARGET_DIR/.next/static"
    cp -rf "$PREBUILT_PATH/.next/static"/* "$TARGET_DIR/.next/static/"
    echo "Static assets copied."
else
    echo "WARNING: .next/static NOT found in root!"
    ls -la "$PREBUILT_PATH/.next"
fi

# Restart container
cd /opt/aimax/ai-novel-writer/deploy
docker compose -f docker-compose.yml -f docker-compose.override.yml restart app