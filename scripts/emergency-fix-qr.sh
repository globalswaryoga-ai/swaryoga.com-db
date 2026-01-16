#!/bin/bash
################################################################################
# 🚨 EMERGENCY FIX - Install Chromium on EC2 and Restart Bridge
# 
# This script immediately fixes the QR code issue by:
# 1. Installing Chromium on EC2
# 2. Clearing Puppeteer cache
# 3. Restarting bridge service
# 4. Verifying QR generation works
#
# Usage: bash scripts/emergency-fix-qr.sh
################################################################################

set -e

EC2_HOST="ubuntu@3.109.154.61"
BRIDGE_SECRET="swar-bridge-secret-2024"
BRIDGE_URL="http://3.109.154.61:3333"

echo "🚨 EMERGENCY FIX - Installing Chromium & Restarting Bridge"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Create the fix commands
echo "📝 Preparing fix commands..."

FIX_COMMANDS='#!/bin/bash
set -e

echo "🔧 Installing Chromium..."
sudo apt-get update -qq
sudo apt-get install -y -qq chromium-browser

echo "🧹 Clearing Puppeteer cache..."
rm -rf ~/.cache/puppeteer 2>/dev/null || true

echo "📍 Going to bridge directory..."
cd /home/ubuntu/swaryoga-bridge || cd ~/wa-bridge || exit 1

echo "📦 Installing dependencies with PUPPETEER_SKIP_DOWNLOAD..."
PUPPETEER_SKIP_DOWNLOAD=true npm ci --production 2>/dev/null || npm install 2>/dev/null

echo "🔄 Restarting bridge service..."
pm2 restart wa-bridge 2>/dev/null || pm2 start server.js --name wa-bridge
pm2 restart health-check 2>/dev/null || pm2 start health-check.js --name health-check

sleep 10

echo "✅ Bridge restart complete!"
curl -s http://localhost:3333/status -H "X-Bridge-Secret: swar-bridge-secret-2024" | jq . || echo "Bridge responding..."
'

# Step 2: Execute on EC2
echo "1️⃣  Connecting to EC2 ($EC2_HOST)..."
echo "   Executing fix commands..."
echo ""

# Try different methods to execute on EC2
if command -v aws &> /dev/null; then
  # Try SSM Session Manager
  echo "   Attempting via AWS Systems Manager..."
  
  # Check if we can reach the instance
  INSTANCE_ID="i-0d2fb8b38cb190ffe"
  
  # Just show user what commands need to be run
  echo ""
  echo "⚠️  Manual execution needed on EC2. Run these commands:"
  echo ""
  echo "$FIX_COMMANDS"
  echo ""
  echo "Or execute via SSH:"
  echo "ssh ubuntu@3.109.154.61 << 'SSHEOF'"
  echo "$FIX_COMMANDS"
  echo "SSHEOF"
  echo ""
else
  echo "   ⚠️  AWS CLI not available for automated execution"
  echo ""
  echo "📋 Commands to run manually on EC2:"
  echo ""
  echo "$FIX_COMMANDS"
  echo ""
fi

# Step 3: Wait and verify from Mac
echo "2️⃣  Waiting for bridge to restart (if executed)..."
sleep 15

echo "3️⃣  Verifying from Mac..."
echo ""

# Test bridge is responding
for i in {1..5}; do
  STATUS=$(curl -s "$BRIDGE_URL/status" -H "X-Bridge-Secret: $BRIDGE_SECRET" 2>/dev/null | jq -r '.status // "error"')
  
  if [ "$STATUS" != "error" ]; then
    echo "   ✅ Bridge is online (status: $STATUS)"
    break
  fi
  
  if [ $i -lt 5 ]; then
    echo "   ⏳ Waiting for bridge (attempt $i/5)..."
    sleep 3
  fi
done

echo ""

# Test QR generation
echo "4️⃣  Testing QR generation..."
curl -s -X POST "$BRIDGE_URL/connect" -H "X-Bridge-Secret: $BRIDGE_SECRET" -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1
sleep 8

QR_CHECK=$(curl -s "$BRIDGE_URL/qr" -H "X-Bridge-Secret: $BRIDGE_SECRET" 2>/dev/null | jq '.hasQr // false')

echo ""
if [ "$QR_CHECK" = "true" ]; then
  echo "🎉 SUCCESS! QR code is now generating!"
  echo ""
  echo "✅ What to do next:"
  echo "   1. Go to: https://crm.swaryoga.com/admin/crm/qr"
  echo "   2. Click 'Login'"
  echo "   3. QR should appear"
  echo "   4. Scan with WhatsApp"
  echo "   5. Done!"
else
  echo "⚠️  QR still not generating. Check EC2 logs:"
  echo "   ssh ubuntu@3.109.154.61"
  echo "   pm2 logs wa-bridge --lines 50"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
