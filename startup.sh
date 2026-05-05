#!/bin/bash

# Bobo Bird Tracker — Local Development Startup Script
# Usage: ./startup.sh [options]
#
# Options:
#   --demo       Force demo mode (ignores real Supabase credentials)
#   --clean      Clear localStorage demo data before starting
#   --help       Show this help message

set -e

PORT=3000
URL="http://localhost:$PORT"
DEMO_MODE=false
CLEAN_DEMO=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --demo)
      DEMO_MODE=true
      shift
      ;;
    --clean)
      CLEAN_DEMO=true
      shift
      ;;
    --help)
      echo "🐦 Bobo Bird Tracker — Startup Script"
      echo ""
      echo "Usage: ./startup.sh [options]"
      echo ""
      echo "Options:"
      echo "  --demo       Force demo mode (localStorage, no Supabase needed)"
      echo "  --clean      Clear demo data from localStorage before starting"
      echo "  --help       Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./startup.sh              # Start with current .env.local settings"
      echo "  ./startup.sh --demo       # Force demo mode"
      echo "  ./startup.sh --clean      # Clear demo data and start"
      exit 0
      ;;
  esac
done

echo "🐦 Bobo Bird Tracker — Starting local dev server..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "⚠️  Node.js $(node -v) detected. Node.js 18+ is recommended."
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Running npm install..."
  npm install
  echo ""
fi

# Handle .env.local
if [ "$DEMO_MODE" = true ]; then
  echo "🔧 Demo mode requested. Creating .env.local with placeholders..."
  cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_DEMO=true
EOF
  echo "   ✓ .env.local configured for demo mode"
  echo ""
fi

if [ ! -f ".env.local" ]; then
  echo "📝 .env.local not found. Creating from .env.local.example..."
  if [ -f ".env.local.example" ]; then
    cp .env.local.example .env.local
    echo "   ⚠️  Please edit .env.local and fill in your real credentials:"
    echo "      - NEXT_PUBLIC_SUPABASE_URL"
    echo "      - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "      - SUPABASE_SERVICE_ROLE_KEY (for API routes)"
    echo "      - TELEGRAM_BOT_TOKEN (for Telegram auth)"
    echo ""
    echo "   Or run with --demo to skip Supabase setup."
    echo ""
    exit 1
  else
    echo "   ❌ .env.local.example not found. Cannot create .env.local"
    exit 1
  fi
fi

# Check if we're in demo mode
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2- | tr -d ' ' || true)
if [ -z "$SUPABASE_URL" ] || echo "$SUPABASE_URL" | grep -q "placeholder"; then
  DEMO_MODE=true
fi

# Show mode info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$DEMO_MODE" = true ]; then
  echo "  Mode:    🎮 DEMO (localStorage)"
  echo "  Birds:   Stored in browser localStorage"
  echo "  Auth:    Demo user (no login required)"
else
  echo "  Mode:    🚀 REAL (Supabase)"
  echo "  URL:     $SUPABASE_URL"
  echo "  Birds:   Stored in PostgreSQL"
  echo "  Auth:    Email / Telegram"
fi
echo "  Local:   $URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean demo data if requested
if [ "$CLEAN_DEMO" = true ] && [ "$DEMO_MODE" = true ]; then
  echo "🧹 Clearing demo data from localStorage..."
  # We can't directly clear localStorage from bash, but we can tell the user
  echo "   Open the app in your browser and run in DevTools Console:"
  echo "   localStorage.clear(); location.reload();"
  echo ""
fi

# Validate critical env vars in real mode
if [ "$DEMO_MODE" = false ]; then
  MISSING=()
  
  if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local || grep -q "NEXT_PUBLIC_SUPABASE_URL=.*placeholder" .env.local; then
    MISSING+=("NEXT_PUBLIC_SUPABASE_URL")
  fi
  
  if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local || grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=.*placeholder" .env.local; then
    MISSING+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  fi
  
  if ! grep -q "NEXT_PUBLIC_APP_URL=" .env.local; then
    MISSING+=("NEXT_PUBLIC_APP_URL")
  fi
  
  if [ ${#MISSING[@]} -gt 0 ]; then
    echo "⚠️  Missing or placeholder values in .env.local:"
    for var in "${MISSING[@]}"; do
      echo "   - $var"
    done
    echo ""
    echo "   The app may fall back to demo mode."
    echo "   Edit .env.local with real values or run: ./startup.sh --demo"
    echo ""
  fi
fi

# Kill any existing process on port 3000
PID=$(lsof -ti:$PORT 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "🔪 Killing existing process on port $PORT (PID: $PID)..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

echo "🚀 Starting dev server..."
echo ""
echo "   Local:    $URL"
echo "   Network:  $(hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
