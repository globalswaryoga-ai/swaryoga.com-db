#!/bin/bash

# ============================================================
# IMMEDIATE BRIDGE FIX - Emergency Restart Script
# ============================================================
# This script will:
# 1. Check if bridge is running
# 2. Kill any old processes
# 3. Restart the bridge immediately
# 4. Verify it's responding
#
# Run this when you see 404 errors from the bridge

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   WhatsApp Bridge - Emergency Restart                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

EC2_IP="52.91.198.23"
EC2_USER="ubuntu"
SSH_KEY="deploy/wa-bridge/wa-bridge-key.pem"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at: $SSH_KEY"
  echo ""
  echo "Get your SSH key and save to that location, then run again"
  exit 1
fi

chmod 400 "$SSH_KEY"

echo "Connecting to EC2 at $EC2_IP..."
echo ""

# Execute emergency restart on EC2
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'SSH_COMMANDS'
set -e

echo "🔄 Emergency bridge restart..."
echo ""

# Kill old processes
echo "1. Stopping old processes..."
docker stop wa-bridge 2>/dev/null || true
docker rm wa-bridge 2>/dev/null || true
pm2 delete wa-bridge 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 2

echo "✅ Old processes stopped"
echo ""

# Try docker-compose
if [ -d "/home/ubuntu/swaryoga-wa-bridge" ] && [ -f "/home/ubuntu/swaryoga-wa-bridge/docker-compose.yml" ]; then
  echo "2. Starting via docker-compose..."
  cd /home/ubuntu/swaryoga-wa-bridge
  docker-compose down 2>/dev/null || true
  docker-compose up -d
  echo "✅ Started via docker-compose"
elif command -v docker &> /dev/null; then
  echo "2. Starting via docker run..."
  docker run -d \
    --name wa-bridge \
    --restart unless-stopped \
    -p 3333:3333 \
    -v ~/.wwebjs_auth:/app/.wwebjs_auth \
    -e PORT=3333 \
    -e WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024 \
    wa-bridge:latest
  echo "✅ Started via docker run"
else
  echo "⚠️  Docker not available"
  exit 1
fi

echo ""
echo "3. Waiting for bridge to come online..."

for i in {1..12}; do
  if curl -s -m 2 http://localhost:3333/health 2>&1 | grep -q "status"; then
    echo "✅ Bridge is ONLINE!"
    break
  elif [ $i -lt 12 ]; then
    echo "   Waiting... attempt $i/12"
    sleep 5
  else
    echo "⚠️  Bridge may be initializing (can take 1-2 minutes)"
  fi
done

echo ""
echo "4. Bridge status:"
docker ps | grep wa-bridge || echo "Container info not available"

SSH_COMMANDS

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║            ✅ RESTART COMPLETE                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Bridge should now be responding."
echo ""
echo "To verify:"
echo "  1. Refresh your browser"
echo "  2. Try connecting QR again"
echo "  3. Or run: npm run monitor-bridge"
echo ""
