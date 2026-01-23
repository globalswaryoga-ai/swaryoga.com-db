#!/bin/bash

# ============================================================
# WhatsApp Bridge - Emergency Repair Guide
# ============================================================
# The bridge is currently DOWN on EC2 (52.91.198.23:3333)
# This guide helps you fix it
# ============================================================

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  WhatsApp QR Bridge - Emergency Repair                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EC2_IP="52.91.198.23"
EC2_KEY="deploy/wa-bridge/wa-bridge-key.pem"

# Check if SSH key exists
if [ ! -f "$EC2_KEY" ]; then
  echo -e "${RED}❌ SSH key not found at: $EC2_KEY${NC}"
  echo ""
  echo "📋 Steps to fix:"
  echo "  1. Go to AWS Console → EC2 → Key Pairs"
  echo "  2. Find and download 'wa-bridge-key.pem'"
  echo "  3. Save it to: $EC2_KEY"
  echo "  4. Run: chmod 400 $EC2_KEY"
  echo "  5. Run this script again"
  echo ""
  exit 1
fi

chmod 400 "$EC2_KEY"
echo -e "${GREEN}✅ SSH key found${NC}"
echo ""

# Try to connect and diagnose
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo "Connecting to EC2 instance..."
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if we can connect
if ! ssh -i "$EC2_KEY" -o ConnectTimeout=5 ubuntu@$EC2_IP "echo 'Connection OK'" > /dev/null 2>&1; then
  echo -e "${RED}❌ Cannot connect to EC2${NC}"
  echo "   IP: $EC2_IP"
  echo "   Key: $EC2_KEY"
  echo ""
  echo "Check:"
  echo "  - Security group allows SSH (port 22)"
  echo "  - EC2 instance is running"
  echo "  - SSH key is correct"
  exit 1
fi

echo -e "${GREEN}✅ Connected to EC2${NC}"
echo ""

# Check bridge status
echo "Checking bridge status..."
BRIDGE_STATUS=$(ssh -i "$EC2_KEY" ubuntu@$EC2_IP "curl -s -m 2 http://localhost:3333/health 2>&1 | head -c 100" 2>/dev/null)

if echo "$BRIDGE_STATUS" | grep -q "status"; then
  echo -e "${GREEN}✅ Bridge is responding${NC}"
  echo "   Response: $BRIDGE_STATUS"
  exit 0
else
  echo -e "${RED}❌ Bridge is NOT responding${NC}"
  echo "   Response: $BRIDGE_STATUS"
  echo ""
fi

# Check Docker status
echo ""
echo "Checking Docker containers..."
DOCKER_STATUS=$(ssh -i "$EC2_KEY" ubuntu@$EC2_IP "docker ps | grep wa-bridge" 2>/dev/null)

if [ -z "$DOCKER_STATUS" ]; then
  echo -e "${YELLOW}⚠️  Bridge container is NOT running${NC}"
  echo ""
  echo "Attempting to restart..."
  
  ssh -i "$EC2_KEY" ubuntu@$EC2_IP << 'SSH_REPAIR'
set -e

echo "Stopping any existing containers..."
docker stop wa-bridge 2>/dev/null || true
docker rm wa-bridge 2>/dev/null || true

echo "Starting bridge container..."
cd /home/ubuntu/swaryoga-wa-bridge || cd /opt/wa-bridge || cd ~

# Try docker-compose first
if [ -f docker-compose.yml ]; then
  echo "Using docker-compose..."
  docker-compose down 2>/dev/null || true
  docker-compose up -d
  echo "✅ Bridge started with docker-compose"
elif [ -f start.sh ]; then
  echo "Using start.sh script..."
  bash start.sh &
  sleep 5
  echo "✅ Bridge started with script"
else
  echo "Starting bridge manually..."
  nohup docker run -d \
    --name wa-bridge \
    --restart always \
    -p 3333:3333 \
    -v ~/.wwebjs_auth:/app/.wwebjs_auth \
    -e PORT=3333 \
    -e WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024 \
    wa-bridge:latest > /dev/null 2>&1
  echo "✅ Bridge started with docker run"
fi

echo ""
echo "Waiting 10 seconds for bridge to start..."
sleep 10

echo "Checking bridge health..."
if curl -s -m 2 http://localhost:3333/health 2>&1 | grep -q "status"; then
  echo "✅ Bridge is now responding!"
else
  echo "⏳ Bridge is starting, may take a moment..."
fi
SSH_REPAIR

else
  echo -e "${GREEN}✅ Bridge container is running${NC}"
  echo "   $DOCKER_STATUS"
  echo ""
  
  echo "Checking container logs..."
  LOGS=$(ssh -i "$EC2_KEY" ubuntu@$EC2_IP "docker logs wa-bridge --tail 20" 2>/dev/null)
  echo "$LOGS" | tail -10
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Final verification
echo "Verifying bridge is now online..."
FINAL_CHECK=$(ssh -i "$EC2_KEY" ubuntu@$EC2_IP "curl -s -m 5 http://localhost:3333/health 2>&1" 2>/dev/null)

if echo "$FINAL_CHECK" | grep -q "status"; then
  echo -e "${GREEN}✅ Bridge is FULLY OPERATIONAL!${NC}"
  echo ""
  echo "Response:"
  echo "$FINAL_CHECK" | jq . 2>/dev/null || echo "$FINAL_CHECK"
else
  echo -e "${YELLOW}⏳ Bridge is recovering, check status in 30 seconds${NC}"
  echo "   Run: npm run monitor-bridge"
fi

echo ""
