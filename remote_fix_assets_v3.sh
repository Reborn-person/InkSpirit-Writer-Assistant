#!/bin/bash
set -e

PREBUILT_PATH="/opt/aimax/ai-novel-writer/prebuilt"
TARGET_DIR="$PREBUILT_PATH/aimax/AIpous/ai-novel-writer"
NESTED_PATH="$PREBUILT_PATH/ai-novel-writer-prebuilt"

echo "Target directory: $TARGET_DIR"

# It seems the previous flattening script might have failed or been incomplete
# or we have a double nesting situation.

if [ -d "$NESTED_PATH" ]; then
    echo "Found nested path: $NESTED_PATH"
    
    # Check for .next/static in nested path
    if [ -d "$NESTED_PATH/.next/static" ]; then
        echo "Found .next/static in nested path, copying to target..."
        mkdir -p "$TARGET_DIR/.next/static"
        cp -rf "$NESTED_PATH/.next/static"/* "$TARGET_DIR/.next/static/"
        echo "Static assets copied."
    fi
    
    # Also ensure public is there
    if [ -d "$NESTED_PATH/public" ]; then
        echo "Found public in nested path, copying to target..."
        mkdir -p "$TARGET_DIR/public"
        cp -rf "$NESTED_PATH/public"/* "$TARGET_DIR/public/"
    fi
else
    # Try to find where static folder is
    STATIC_LOC=$(find "$PREBUILT_PATH" -name static -type d | grep ".next/static" | head -n 1)
    if [ ! -z "$STATIC_LOC" ]; then
        echo "Found static folder at: $STATIC_LOC"
        mkdir -p "$TARGET_DIR/.next/static"
        cp -rf "$STATIC_LOC"/* "$TARGET_DIR/.next/static/"
        echo "Static assets copied from search result."
    else
        echo "ERROR: Could not find static assets folder anywhere!"
        find "$PREBUILT_PATH" -maxdepth 3
    fi
fi

# Restart container
cd /opt/aimax/ai-novel-writer/deploy
docker compose -f docker-compose.yml -f docker-compose.override.yml restart app