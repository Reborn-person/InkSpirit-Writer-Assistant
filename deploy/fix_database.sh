#!/bin/bash

echo "=== Fixing Database Issues ==="
echo ""

echo "1. Stopping containers..."
docker compose down
echo ""

echo "2. Creating data directory if not exists..."
mkdir -p ../data
echo ""

echo "3. Checking .env file..."
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    echo "Generated new JWT_SECRET"
else
    echo ".env file exists"
fi
echo ""

echo "4. Starting containers..."
docker compose up -d
echo ""

echo "5. Waiting for containers to be ready..."
sleep 10
echo ""

echo "6. Running database migrations..."
docker compose exec app npx prisma db push
echo ""

echo "7. Checking container status..."
docker compose ps
echo ""

echo "8. Viewing recent logs..."
docker compose logs --tail=20 app
echo ""

echo "=== Fix Complete ==="
echo "Please test the application now."
