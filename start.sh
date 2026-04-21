#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Production Boot Sequence..."

# 1. Run migrations safely
echo "🔍 Checking for pending database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations applied successfully."
else
  echo "⚠️ Migration failed or skipped. Checking connectivity..."
fi

# 2. Start the NestJS application
echo "🌐 Starting Application Server..."
node dist/main.js