#!/bin/bash
################################################################################
# Fix WhatsApp Bridge - Install Chromium and Restart
# 
# Usage (from your Mac): 
#   bash scripts/fix-bridge-chromium.sh
#
# This script will:
# 1. SSH into EC2
# 2. Install Chromium system-wide
# 3. Clear Puppeteer cache
# 4. Reinstall bridge dependencies
# 5. Restart bridge via PM2
# 6. Verify QR generation works
################################################################################

set -e

EC2_HOST="ubuntu@3.109.154.61"
BRIDGE_SECRET="swar-bridge-secret-2024"
BRIDGE_URL="http://3.109.154.61:3333"

echo "🔧 WhatsApp Bridge - Chromium Installation & Fix"
echo "================================================="
echo ""

# Check if we can reach EC2
echo "1️⃣  Checking EC2 connectivity..."
if curl -s --connect-timeout 3 "$BRIDGE_URL/status" -H "X-Bridge-Secret: $BRIDGE_SECRET" > /dev/null 2>&1; then
  echo "   ✅ EC2 bridge is reachable"
else
  echo "   ⚠️  Cannot reach EC2 bridge at $BRIDGE_URL"
  echo "   Make sure EC2 instance is running"
  exit 1
fi

echo ""
echo "2️⃣  Accessing EC2 instance..."
echo "   Hostname: $EC2_HOST"
echo ""

# List of fixes to apply on EC2
read -r -d '' EC2_COMMANDS << 'EOF' || true
#!/bin/bash
set -e

echo "🔧 Starting bridge fixes on EC2..."

# 1. Install Chromium
echo "Installing Chromium..."
sudo apt-get update -qq
sudo apt-get install -y -qq chromium-browser
echo "✅ Chromium installed"

# 2. Clear Puppeteer cache
echo "Clearing Puppeteer cache..."
rm -rf ~/.cache/puppeteer
echo "✅ Cache cleared"

# 3. Go to bridge directory
cd /home/ubuntu/swaryoga-bridge || cd ~/wa-bridge || exit 1

# 4. Reinstall dependencies with PUPPETEER_SKIP_DOWNLOAD=true
echo "Reinstalling bridge dependencies..."
PUPPETEER_SKIP_DOWNLOAD=true npm ci
echo "✅ Dependencies installed"

# 5. Restart PM2
echo "Restarting bridge service..."
pm2 restart wa-bridge 2>/dev/null || pm2 start server.js --name wa-bridge
sleep 10

# 6. Test status
echo "Testing bridge status..."
curl -s http://localhost:3333/status -H "X-Bridge-Secret: swar-bridge-secret-2024" | jq . || true

# 7. Call /connect to trigger QR generation
echo "Triggering QR generation..."
curl -s -X POST http://localhost:3333/connect -H "X-Bridge-Secret: swar-bridge-secret-2024" -H "Content-Type: application/json" -d '{}' | jq . || true

echo "✅ All fixes applied!"
EOF

# Execute on EC2
echo "3️⃣  Running fixes on EC2..."
echo "$EC2_COMMANDS" | ssh -o ConnectTimeout=10 "$EC2_HOST" bash

echo ""
echo "4️⃣  Waiting for bridge initialization..."
sleep 5

# Test from Mac
echo "5️⃣  Testing from Mac..."
QR_STATUS=$(curl -s "$BRIDGE_URL/qr" -H "X-Bridge-Secret: $BRIDGE_SECRET" 2>/dev/null | jq '.hasQr // false' 2>/dev/null)

if [ "$QR_STATUS" = "true" ]; then
  echo "   ✅ QR IS AVAILABLE!"
  echo ""
  echo "🎉 SUCCESS! QR code should now appear in:"
  echo "   https://crm.swaryoga.com/admin/crm/qr"
else
  echo "   ⚠️  QR not available yet"
  echo ""
  echo "Next steps:"
  echo "1. Refresh the QR page in browser (Cmd+R)"
  echo "2. Click 'Login' button again"
  echo "3. If still stuck, check EC2 bridge logs:"
  echo "   ssh $EC2_HOST"
  echo "   pm2 logs wa-bridge --lines 50"
fi

echo ""
echo "✅ Bridge fix complete!"
