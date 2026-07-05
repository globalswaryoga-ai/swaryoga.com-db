#!/bin/bash
# WhatsApp Bridge Quick Startup Script
# Starts the Baileys WhatsApp bridge on port 3333
# Usage: ./start-bridge.sh

set -e

echo "🚀 Starting WhatsApp Bridge..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install it first:${NC}"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check if port 3333 is in use
if lsof -Pi :3333 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3333 already in use. Killing existing process...${NC}"
    lsof -ti:3333 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Find bridge directory
BRIDGE_DIR=""
for dir in \
    "/opt/whatsapp-bridge" \
    "$HOME/whatsapp-bridge" \
    "$HOME/Projects/whatsapp-bridge" \
    "./whatsapp-bridge" \
    "../whatsapp-bridge" \
    "/app/whatsapp-bridge"; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        BRIDGE_DIR="$dir"
        break
    fi
done

if [ -z "$BRIDGE_DIR" ]; then
    echo -e "${RED}❌ WhatsApp bridge not found.${NC}"
    echo ""
    echo "Please clone it:"
    echo "  git clone https://github.com/globalswaryoga-ai/whatsapp-bridge.git"
    echo "  cd whatsapp-bridge"
    echo "  npm install"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Found bridge at: $BRIDGE_DIR${NC}"
echo ""

# Change to bridge directory
cd "$BRIDGE_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check .env
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Update .env with your WhatsApp credentials${NC}"
fi

# Start bridge
echo -e "${GREEN}Starting bridge on http://localhost:3333${NC}"
echo "Press Ctrl+C to stop"
echo ""

# Set environment variables for optimal performance
export NODE_ENV=production
export PORT=3333

# Run with memory optimization
node --max-old-space-size=4096 app.js
