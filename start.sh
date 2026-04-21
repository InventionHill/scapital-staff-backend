#!/bin/sh

echo "🚀 Starting Production Boot Sequence..."

echo "🔍 Checking for pending database migrations..."
yarn prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully."
else
  echo "⚠️ Migration failed or skipped. Continuing startup..."
fi

echo "🌐 Starting Application Server..."
yarn start:prod