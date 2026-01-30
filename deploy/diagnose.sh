#!/bin/bash

echo "=== AI Novel Writer Database Diagnostics ==="
echo ""

echo "1. Checking Docker container status..."
docker compose ps
echo ""

echo "2. Checking database file..."
if [ -f "../data/db.sqlite" ]; then
    echo "Database file exists: ../data/db.sqlite"
    ls -lh ../data/db.sqlite
else
    echo "ERROR: Database file not found at ../data/db.sqlite"
fi
echo ""

echo "3. Checking data directory..."
ls -la ../data/
echo ""

echo "4. Checking environment variables..."
docker compose exec app env | grep -E "DATABASE_URL|JWT_SECRET"
echo ""

echo "5. Testing database connection..."
docker compose exec app npx prisma db pull --print
echo ""

echo "6. Checking application logs (last 50 lines)..."
docker compose logs --tail=50 app
echo ""

echo "=== Diagnostics Complete ==="
