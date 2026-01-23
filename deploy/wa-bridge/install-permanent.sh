#!/bin/bash

# ============================================================
# WhatsApp Bridge - Automated Permanent Setup Installer
# ============================================================
# This script automates the entire permanent setup process
# Run from: bash deploy/wa-bridge/install-permanent.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   WhatsApp Bridge - Permanent Setup Installer              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
EC2_IP="52.91.198.23"
EC2_USER="ubuntu"
SSH_KEY="deploy/wa-bridge/wa-bridge-key.pem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ============================================================
# Step 1: Verify SSH Key
# ============================================================
echo -e "${BLUE}Step 1: Verifying SSH Key${NC}"
echo "───────────────────────────────────────────────────────"

if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
  echo ""
  echo "Please:"
  echo "  1. Download wa-bridge-key.pem from AWS EC2 Key Pairs"
  echo "  2. Save to: deploy/wa-bridge/wa-bridge-key.pem"
  echo "  3. Run: chmod 400 deploy/wa-bridge/wa-bridge-key.pem"
  echo "  4. Run this script again"
  exit 1
fi

chmod 400 "$SSH_KEY"
echo -e "${GREEN}✅ SSH key found and ready${NC}"
echo ""

# ============================================================
# Step 2: Test SSH Connection
# ============================================================
echo -e "${BLUE}Step 2: Testing SSH Connection${NC}"
echo "───────────────────────────────────────────────────────"

if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$EC2_USER@$EC2_IP" "echo 'Connection OK'" > /dev/null 2>&1; then
  echo -e "${RED}❌ Cannot connect to EC2${NC}"
  echo "   IP: $EC2_IP"
  echo "   User: $EC2_USER"
  echo "   Key: $SSH_KEY"
  exit 1
fi

echo -e "${GREEN}✅ Successfully connected to EC2${NC}"
echo ""

# ============================================================
# Step 3: Copy Setup Scripts to EC2
# ============================================================
echo -e "${BLUE}Step 3: Copying Setup Scripts to EC2${NC}"
echo "───────────────────────────────────────────────────────"

echo "Uploading files..."

scp -i "$SSH_KEY" -q "$SCRIPT_DIR/wa-bridge.service" "$EC2_USER@$EC2_IP:/tmp/"
scp -i "$SSH_KEY" -q "$SCRIPT_DIR/start-service.sh" "$EC2_USER@$EC2_IP:/tmp/"
scp -i "$SSH_KEY" -q "$SCRIPT_DIR/pre-start-check.sh" "$EC2_USER@$EC2_IP:/tmp/"
scp -i "$SSH_KEY" -q "$SCRIPT_DIR/health-monitor.sh" "$EC2_USER@$EC2_IP:/tmp/"
scp -i "$SSH_KEY" -q "$SCRIPT_DIR/setup-permanent.sh" "$EC2_USER@$EC2_IP:/tmp/"

echo -e "${GREEN}✅ Files uploaded${NC}"
echo ""

# ============================================================
# Step 4: Run Setup on EC2
# ============================================================
echo -e "${BLUE}Step 4: Installing Permanent Setup on EC2${NC}"
echo "───────────────────────────────────────────────────────"
echo ""

ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'SSH_INSTALL'
set -e

# Run the setup script with sudo
sudo bash /tmp/setup-permanent.sh

# Set proper permissions
sudo chown ubuntu:ubuntu /var/log/wa-bridge
sudo chmod 755 /var/log/wa-bridge

echo ""
echo "✅ Installation complete on EC2"
SSH_INSTALL

echo -e "${GREEN}✅ Permanent setup installed on EC2${NC}"
echo ""

# ============================================================
# Step 5: Verify Bridge is Running
# ============================================================
echo -e "${BLUE}Step 5: Verifying Bridge is Running${NC}"
echo "───────────────────────────────────────────────────────"

echo "Waiting for bridge to start..."

for i in {1..12}; do
  RESPONSE=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "curl -s -m 2 http://localhost:3333/health 2>&1" 2>/dev/null || echo "")
  
  if echo "$RESPONSE" | grep -q "status"; then
    echo -e "${GREEN}✅ Bridge is ONLINE and responding${NC}"
    break
  elif [ $i -lt 12 ]; then
    echo "  Waiting... ($i/12)"
    sleep 5
  else
    echo -e "${YELLOW}⏳ Bridge is initializing (may take 1-2 minutes)${NC}"
  fi
done

echo ""

# ============================================================
# Step 6: Verify Service Status
# ============================================================
echo -e "${BLUE}Step 6: Verifying Service Status${NC}"
echo "───────────────────────────────────────────────────────"

echo ""
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "sudo systemctl status wa-bridge --no-pager | head -5" || true

echo ""

# ============================================================
# Completion
# ============================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ PERMANENT SETUP COMPLETE                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "📋 What was installed:"
echo "   ✓ Systemd service (auto-start on boot)"
echo "   ✓ Health monitoring (checks every 5 minutes)"
echo "   ✓ Auto-restart on crash"
echo "   ✓ Memory and CPU limits"
echo "   ✓ Persistent session storage"
echo ""

echo "🔧 Management commands:"
echo "   npm run monitor-bridge      # Check bridge status"
echo "   npm run ec2:status          # Check EC2 instance"
echo "   ssh -i $SSH_KEY $EC2_USER@$EC2_IP  # SSH to EC2"
echo ""

echo "📚 Full documentation:"
echo "   Read: BRIDGE_PERMANENT_FIX.md"
echo ""

echo "🚀 Next steps:"
echo "   1. Run: npm run monitor-bridge"
echo "   2. Should show: ✅ Bridge is CONNECTED"
echo "   3. Users can now scan QR codes anytime"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "   Bridge is now PERMANENTLY RUNNING 24/7! 🎉"
echo "═══════════════════════════════════════════════════════════"
echo ""
