#!/bin/bash

# WhatsApp Bridge QR Fix & Deployment Instructions
# This script helps diagnose and fix the "QR not available" issue

set -e

BRIDGE_URL="http://3.109.154.61:3333"
BRIDGE_SECRET="swar-bridge-secret-2024"
EC2_USER="ubuntu"
EC2_HOST="3.109.154.61"
PROJECT_DIR="/home/ubuntu/swaryoga-bridge"

echo "🔧 WhatsApp Bridge QR Fix & Diagnostics"
echo "========================================"
echo ""

# Step 1: Test current bridge status
echo "1️⃣  Testing current bridge status..."
echo "   Bridge URL: $BRIDGE_URL"
echo ""

RESPONSE=$(curl -s -H "X-Bridge-Secret: $BRIDGE_SECRET" "$BRIDGE_URL/status" || echo "{}")
echo "   Response: $RESPONSE"
echo ""

HAS_QR=$(echo "$RESPONSE" | grep -o '"hasQr":[^,}]*' | cut -d: -f2)
QR_VALUE=$(echo "$RESPONSE" | grep -o '"qr":[^,}]*' | cut -d: -f2)
STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)

echo "   Bridge Status: $STATUS"
echo "   Has QR: $HAS_QR"
echo "   QR Value: ${QR_VALUE:0:40}..."
echo ""

if [ "$HAS_QR" = "true" ]; then
    echo "✅ QR code is available!"
    exit 0
else
    echo "❌ QR code is missing"
    echo ""
fi

# Step 2: Try to trigger QR generation
echo "2️⃣  Attempting to trigger QR generation..."
echo "   Calling POST /connect..."
echo ""

CONNECT_RESPONSE=$(curl -s -X POST -H "X-Bridge-Secret: $BRIDGE_SECRET" "$BRIDGE_URL/connect")
echo "   Response: $CONNECT_RESPONSE"
echo ""

# Step 3: Wait and check again
echo "3️⃣  Waiting 4 seconds for QR generation..."
sleep 4
echo ""

echo "4️⃣  Checking bridge status again..."
RESPONSE2=$(curl -s -H "X-Bridge-Secret: $BRIDGE_SECRET" "$BRIDGE_URL/status")
HAS_QR2=$(echo "$RESPONSE2" | grep -o '"hasQr":[^,}]*' | cut -d: -f2)

if [ "$HAS_QR2" = "true" ]; then
    echo "✅ QR code is now available!"
    echo "   Full response: $RESPONSE2"
    exit 0
else
    echo "❌ QR code still missing after /connect"
    echo "   Response: $RESPONSE2"
    echo ""
    echo "⚠️  Bridge server may need to be restarted"
    echo ""
fi

# Step 3: Instructions to deploy the fix to EC2
echo "5️⃣  Deploying updated bridge code to EC2..."
echo ""
echo "Instructions:"
echo "  1. SSH into EC2:"
echo "     ssh -i your-key.pem $EC2_USER@$EC2_HOST"
echo ""
echo "  2. Deploy latest code:"
echo "     cd $PROJECT_DIR"
echo "     git pull origin main"
echo ""
echo "  3. Restart the bridge:"
echo "     pm2 restart wa-bridge"
echo "     # OR if using node directly:"
echo "     # pkill -f 'node.*server.js'"
echo "     # node server.js &"
echo ""
echo "  4. Check logs:"
echo "     pm2 logs wa-bridge --tail 30"
echo "     # OR:"
echo "     # tail -f /tmp/wa-bridge.log"
echo ""
echo "  5. Verify QR is now working:"
echo "     curl -H 'X-Bridge-Secret: $BRIDGE_SECRET' http://localhost:3333/status | jq ."
echo ""

echo "🎯 Next steps:"
echo "   1. Deploy the fix to EC2 (see instructions above)"
echo "   2. Verify QR appears in Admin CRM panel"
echo "   3. If still not working, check EC2 logs (step 4 above)"
echo ""
