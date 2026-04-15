#!/bin/sh

echo "🚀 Container starting..."

echo "⏳ Waiting for DB..."
sleep 5

echo "📦 Running migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "❌ Migration failed. Stopping app."
  exit 1
fi

echo "✅ Migration success"

echo "🔥 Starting app..."
node dist/main.js