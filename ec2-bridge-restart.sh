#!/bin/bash

# EC2 Bridge Complete Restart & Recovery Script
# Run this on the EC2 instance to fully restore the WhatsApp bridge

set -e

echo "================================"
echo "🔧 EC2 WhatsApp Bridge Restart"
echo "================================"
echo ""

# Check if we're on EC2
if ! grep -q ec2 /sys/hypervisor/uuid 2>/dev/null; then
  echo "⚠️  Not running on EC2 (or hypervisor UUID check failed)"
  echo "Continuing anyway..."
fi

BRIDGE_PATH="/path/to/deploy/wa-bridge"  # UPDATE THIS PATH
BRIDGE_SECRET="${WHATSAPP_BRIDGE_SECRET:-swar-bridge-secret-2024}"
PORT="3333"

echo "📍 Bridge Path: $BRIDGE_PATH"
echo "🔐 Bridge Secret: $BRIDGE_SECRET"
echo "🔌 Port: $PORT"
echo ""

# Step 1: Stop any existing process
echo "Step 1: Stopping existing processes on port $PORT..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
  echo "  Found process on port $PORT (PID: $PID)"
  echo "  Killing process..."
  kill -9 $PID 2>/dev/null || true
  sleep 2
fi

# Check if docker container is running
if docker ps | grep -i whatsapp &>/dev/null; then
  echo "  Found Docker container running"
  CONTAINER=$(docker ps | grep -i whatsapp | awk '{print $1}')
  echo "  Stopping container: $CONTAINER"
  docker stop $CONTAINER 2>/dev/null || true
  docker rm $CONTAINER 2>/dev/null || true
  sleep 2
fi

# Check if PM2 process is running
if pm2 list 2>/dev/null | grep -i bridge &>/dev/null; then
  echo "  Found PM2 process running"
  pm2 stop bridge 2>/dev/null || true
  pm2 delete bridge 2>/dev/null || true
  sleep 2
fi

echo "✅ All existing processes stopped"
echo ""

# Step 2: Verify bridge code is correct
echo "Step 2: Verifying bridge code..."
if [ ! -f "$BRIDGE_PATH/server.js" ]; then
  echo "❌ ERROR: $BRIDGE_PATH/server.js not found!"
  echo "   Update BRIDGE_PATH in this script"
  exit 1
fi

if grep -q "app.get('/chats'" "$BRIDGE_PATH/server.js"; then
  echo "✅ Bridge code includes /chats endpoint"
else
  echo "❌ ERROR: Bridge code missing /chats endpoint"
  echo "   Redeploy the bridge code from deploy/wa-bridge/server.js"
  exit 1
fi

if grep -q "app.get('/health'" "$BRIDGE_PATH/server.js"; then
  echo "✅ Bridge code includes /health endpoint"
else
  echo "❌ ERROR: Bridge code missing /health endpoint"
  exit 1
fi

echo ""

# Step 3: Start the bridge
echo "Step 3: Starting bridge service..."
cd "$BRIDGE_PATH"

# Check for docker-compose.yml
if [ -f "docker-compose.yml" ]; then
  echo "  Using Docker Compose..."
  docker-compose down 2>/dev/null || true
  sleep 2
  docker-compose up -d
  echo "✅ Docker container started"
  sleep 5
else
  echo "  docker-compose.yml not found"
  echo "  Using PM2 to start Node.js..."
  
  if [ -f "package.json" ]; then
    npm install --production 2>/dev/null || true
  fi
  
  pm2 start server.js --name bridge --env production
  pm2 save
  echo "✅ Node.js bridge started via PM2"
  sleep 3
fi

echo ""

# Step 4: Verify bridge is running
echo "Step 4: Verifying bridge is running..."
sleep 2

# Check if port is listening
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "✅ Port $PORT is listening"
else
  echo "⚠️  Port $PORT is not listening yet, waiting..."
  sleep 5
fi

echo ""

# Step 5: Test endpoints
echo "Step 5: Testing endpoints..."

# Test /health endpoint
echo "  Testing /health..."
HEALTH_RESPONSE=$(curl -s -m 5 -H "x-bridge-secret: $BRIDGE_SECRET" http://localhost:$PORT/health)
if echo "$HEALTH_RESPONSE" | grep -q '"ok"'; then
  echo "  ✅ /health endpoint working"
  echo "     Response: $HEALTH_RESPONSE"
else
  echo "  ❌ /health endpoint failed"
  echo "     Response: $HEALTH_RESPONSE"
fi

# Test /chats endpoint
echo "  Testing /chats..."
CHATS_RESPONSE=$(curl -s -m 5 -H "x-bridge-secret: $BRIDGE_SECRET" http://localhost:$PORT/chats)
if echo "$CHATS_RESPONSE" | grep -q '"chats"'; then
  echo "  ✅ /chats endpoint working"
  CHAT_COUNT=$(echo "$CHATS_RESPONSE" | grep -o '"id"' | wc -l)
  echo "     Found $CHAT_COUNT chats"
else
  echo "  ⚠️  /chats endpoint returned: $CHATS_RESPONSE"
fi

echo ""

# Step 6: Show logs
echo "Step 6: Recent logs..."
if command -v docker &> /dev/null && docker ps | grep -i whatsapp &>/dev/null; then
  CONTAINER=$(docker ps | grep -i whatsapp | awk '{print $1}')
  echo "  Docker logs (last 20 lines):"
  docker logs --tail 20 $CONTAINER 2>/dev/null || true
elif command -v pm2 &> /dev/null; then
  echo "  PM2 logs (last 10 lines):"
  pm2 logs bridge --lines 10 --nostream 2>/dev/null || true
fi

echo ""
echo "================================"
echo "✅ EC2 Bridge Restart Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Check bridge logs: docker logs <id> or pm2 logs bridge"
echo "2. From your Mac, run: ./test-bridge-health.sh"
echo "3. Refresh QR page in browser"
echo "4. Messages should now appear in real-time"
echo ""
