#!/bin/bash

# Bobo Bird Tracker — Demo Server Startup Script
# Usage: ./startup.sh

set -e

PORT=3000
URL="http://localhost:$PORT"

echo "🐦 Bobo Bird Tracker — Starting demo server..."

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Running npm install..."
  npm install
fi

# Ensure .env.local exists for demo mode
if [ ! -f ".env.local" ]; then
  echo "📝 Creating .env.local for demo mode..."
  cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
EOF
fi

# Kill any existing process on port 3000
PID=$(lsof -ti:$PORT 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "🔪 Killing existing process on port $PORT (PID: $PID)..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

echo "🚀 Starting dev server on $URL ..."
echo ""
echo "   Demo mode: active (localStorage)"
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
