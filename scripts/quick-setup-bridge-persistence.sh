#!/bin/bash

# ============================================================
# Quick Setup: Keep WhatsApp QR Bridge Running 24/7
# ============================================================
# This script guides you through setting up bridge persistence
# Run this from your local machine
# ============================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  WhatsApp QR Bridge - 24/7 Persistence Setup           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

EC2_IP="52.91.198.23"
EC2_INSTANCE="i-0cbb6320079b903d8"
EC2_KEY_PATH="deploy/wa-bridge/wa-bridge-key.pem"

# Check if key exists
if [ ! -f "$EC2_KEY_PATH" ]; then
  echo "❌ Error: SSH key not found at $EC2_KEY_PATH"
  echo ""
  echo "You need the SSH key to connect to EC2. Please:"
  echo "  1. Download 'wa-bridge-key.pem' from AWS (EC2 Key Pairs)"
  echo "  2. Save it to: $EC2_KEY_PATH"
  echo "  3. Run: chmod 400 $EC2_KEY_PATH"
  echo "  4. Run this script again"
  echo ""
  exit 1
fi

# Fix key permissions
chmod 400 "$EC2_KEY_PATH"

echo "✅ Found SSH key at: $EC2_KEY_PATH"
echo ""

# Test SSH connection
echo "🔌 Testing SSH connection to EC2..."
if ssh -i "$EC2_KEY_PATH" -o ConnectTimeout=5 ubuntu@$EC2_IP "echo 'Connection OK'" > /dev/null 2>&1; then
  echo "✅ SSH connection successful!"
else
  echo "❌ Cannot connect to EC2 via SSH"
  echo "   IP: $EC2_IP"
  echo "   Check security group allows SSH (port 22)"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "STEP 1: Setup Local EC2 Auto-Recovery"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Running: bash scripts/setup-ec2-auto-recovery.sh"
bash scripts/setup-ec2-auto-recovery.sh

echo ""
echo "═══════════════════════════════════════════════════════"
echo "STEP 2: Install Monitor on EC2 Instance"
echo "═══════════════════════════════════════════════════════"
echo ""

# Copy files to EC2
echo "📦 Copying files to EC2..."

scp -i "$EC2_KEY_PATH" -q /tmp/bridge-monitor.sh ubuntu@$EC2_IP:/tmp/bridge-monitor.sh
scp -i "$EC2_KEY_PATH" -q /tmp/wa-bridge-monitor.service ubuntu@$EC2_IP:/tmp/wa-bridge-monitor.service

echo "✅ Files copied"
echo ""

# Install on EC2
echo "⚙️  Installing systemd service on EC2..."

ssh -i "$EC2_KEY_PATH" ubuntu@$EC2_IP << 'SSH_INSTALL'
set -e

echo "Installing monitor service..."
sudo cp /tmp/bridge-monitor.sh /opt/bridge-monitor.sh
sudo chmod +x /opt/bridge-monitor.sh
sudo cp /tmp/wa-bridge-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wa-bridge-monitor.service
sudo systemctl start wa-bridge-monitor.service

echo "Verifying installation..."
sleep 2
sudo systemctl status wa-bridge-monitor.service --no-pager || true

echo ""
echo "✅ Monitor service installed and started!"
SSH_INSTALL

echo ""
echo "═══════════════════════════════════════════════════════"
echo "STEP 3: Verify Bridge is Running"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "Checking bridge status..."
ssh -i "$EC2_KEY_PATH" ubuntu@$EC2_IP \
  "curl -s -H 'x-bridge-secret: swar-bridge-secret-2024' http://localhost:3333/health 2>/dev/null | head -c 100" || echo "Bridge may be starting..."

echo ""
echo ""
echo "═══════════════════════════════════════════════════════"
echo "STEP 4: Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "✅ WhatsApp QR Bridge is now set to run 24/7!"
echo ""
echo "📋 What was configured:"
echo "   ✓ EC2 auto-recovery (CloudWatch alarm)"
echo "   ✓ Bridge service auto-start on boot"
echo "   ✓ Health monitoring (auto-restart if down)"
echo "   ✓ Local monitoring script"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm run monitor-bridge"
echo "   2. Should show: ✅ Bridge is CONNECTED"
echo "   3. Users can now scan QR anytime"
echo ""
echo "🔧 Useful commands:"
echo "   npm run ec2:status              # Check EC2 instance"
echo "   npm run monitor-bridge          # Monitor bridge health"
echo "   npm run setup-ec2-recovery      # Re-run setup"
echo ""
echo "📚 Full documentation: see EC2_BRIDGE_PERSISTENCE.md"
echo ""
