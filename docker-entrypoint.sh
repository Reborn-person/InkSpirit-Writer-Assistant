#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  npx prisma db push
fi

exec "$@"
