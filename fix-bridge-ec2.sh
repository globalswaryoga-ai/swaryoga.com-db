#!/bin/bash

###############################################################################
# EC2 Bridge Diagnosis & Fix Script
# Repairs WhatsApp bridge connectivity issues on EC2
###############################################################################

set -e

BRIDGE_URL="http://3.109.154.61:3333"
BRIDGE_SECRET="swar-bridge-secret-2024"
EC2_IP="3.109.154.61"
EC2_USER="ubuntu"
EC2_KEY="$HOME/.ssh/ec2-key.pem"  # Update if different path

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     WhatsApp Bridge EC2 Diagnosis & Fix                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Check if EC2 is reachable
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Test EC2 Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test if bridge is reachable
echo "Testing bridge HTTP connectivity..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Bridge-Secret: $BRIDGE_SECRET" "$BRIDGE_URL/status")

if [ "$STATUS" = "200" ]; then
  echo "✅ Bridge is HTTP-reachable (Status: $STATUS)"
else
  echo "❌ Bridge not responding (Status: $STATUS)"
  echo "   This means EC2 is down, bridge server stopped, or network issue"
  echo ""
  echo "EMERGENCY ACTION NEEDED:"
  echo "   1. Log into EC2 console"
  echo "   2. Start EC2 instance if stopped"
  echo "   3. Run: pm2 restart wa-bridge"
  exit 1
fi

# 2. Check bridge status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Check Bridge Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

STATUS_JSON=$(curl -s -H "X-Bridge-Secret: $BRIDGE_SECRET" "$BRIDGE_URL/status")
echo "Bridge Status JSON:"
echo "$STATUS_JSON" | jq . 2>/dev/null || echo "$STATUS_JSON"

SESSION_READY=$(echo "$STATUS_JSON" | jq -r '.sessionReady' 2>/dev/null || echo "unknown")
HAS_QR=$(echo "$STATUS_JSON" | jq -r '.hasQr' 2>/dev/null || echo "unknown")
STATUS=$(echo "$STATUS_JSON" | jq -r '.status' 2>/dev/null || echo "unknown")
CHAT_COUNT=$(echo "$STATUS_JSON" | jq -r '.chatCount' 2>/dev/null || echo "unknown")

echo ""
echo "Status Summary:"
echo "  sessionReady: $SESSION_READY"
echo "  hasQr:       $HAS_QR"
echo "  status:      $STATUS"
echo "  chatCount:   $CHAT_COUNT"

# 3. Determine what's wrong
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Diagnose Problem"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$SESSION_READY" = "true" ]; then
  echo "✅ WhatsApp is CONNECTED - Everything looks good!"
  echo ""
  echo "If messages are still not working:"
  echo "   1. Check /messages endpoint works: curl $BRIDGE_URL/chats"
  echo "   2. Send test message: curl -X POST $BRIDGE_URL/send -d '{...}'"
  echo "   3. Check MongoDB has recent messages"
  exit 0
fi

if [ "$HAS_QR" = "true" ]; then
  echo "⚠️  QR Code Available - User needs to scan it"
  echo ""
  echo "Next Steps:"
  echo "   1. Get QR code: curl $BRIDGE_URL/qr"
  echo "   2. User scans it in WhatsApp QR page"
  echo "   3. Wait for sessionReady: true"
  exit 0
fi

echo "❌ PROBLEM: WhatsApp client not initialized"
echo ""
echo "Likely causes:"
echo "   1. Chrome/Chromium not installed on EC2"
echo "   2. WhatsApp session corrupted (_wwebjs_auth folder)"
echo "   3. Browser crashed during initialization"
echo "   4. Permission denied to /dev/shm or other resources"
echo ""

# 4. Try to fix
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Attempting Fixes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we can SSH
if [ ! -f "$EC2_KEY" ]; then
  echo "⚠️  SSH key not found at $EC2_KEY"
  echo ""
  echo "Manual SSH commands:"
  echo "   ssh -i /path/to/key.pem ubuntu@$EC2_IP"
  echo "   pm2 logs wa-bridge --tail 50"
  exit 1
fi

echo "📡 Connecting to EC2 for diagnostics..."
echo ""

# SSH into EC2 and run diagnostics
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_IP" '
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ON EC2 SERVER"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Check if Chrome is installed
  echo "Checking Chrome installation..."
  if command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium found: $(which chromium-browser)"
  elif command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome found: $(which google-chrome)"
  else
    echo "❌ NO CHROME FOUND - This is the problem!"
    echo ""
    echo "Installing Chromium..."
    sudo apt-get update -qq
    sudo apt-get install -y chromium-browser
    echo "✅ Chromium installed"
  fi
  
  echo ""
  echo "Checking bridge process..."
  if pm2 info wa-bridge &> /dev/null; then
    echo "✅ Process 'wa-bridge' exists"
    pm2 info wa-bridge | grep -E "status|restart|memory|cpu" || echo "(Could not get details)"
  else
    echo "❌ Process 'wa-bridge' not found in pm2"
    echo "   Available processes:"
    pm2 list | grep -v "│" || echo "(no processes)"
  fi
  
  echo ""
  echo "Checking bridge logs (last 20 lines)..."
  echo "───────────────────────────────────────"
  pm2 logs wa-bridge --nostream --lines 20 2>/dev/null || echo "(Could not retrieve logs)"
  echo "───────────────────────────────────────"
  echo ""
  
  echo "Checking .wwebjs_auth directory..."
  BRIDGE_DIR="/home/ubuntu/swaryoga-bridge"
  if [ -d "$BRIDGE_DIR/.wwebjs_auth" ]; then
    SIZE=$(du -sh "$BRIDGE_DIR/.wwebjs_auth" 2>/dev/null | cut -f1)
    FILES=$(find "$BRIDGE_DIR/.wwebjs_auth" -type f 2>/dev/null | wc -l)
    echo "✅ Session cache exists: $SIZE ($FILES files)"
    echo ""
    echo "   Clearing corrupted session (this will require re-scanning QR)..."
    rm -rf "$BRIDGE_DIR/.wwebjs_auth"
    echo "   ✅ Cleared"
  else
    echo "⚠️  No session cache found (first run)"
  fi
  
  echo ""
  echo "Restarting bridge..."
  pm2 restart wa-bridge
  sleep 3
  echo "✅ Bridge restarted"
' 2>&1

# 5. Wait and check status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Post-Restart Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Waiting 5 seconds for bridge to reinitialize..."
sleep 5

NEW_STATUS=$(curl -s -H "X-Bridge-Secret: $BRIDGE_SECRET" "$BRIDGE_URL/status")
echo "New Status:"
echo "$NEW_STATUS" | jq . 2>/dev/null || echo "$NEW_STATUS"

NEW_HAS_QR=$(echo "$NEW_STATUS" | jq -r '.hasQr' 2>/dev/null || echo "unknown")

if [ "$NEW_HAS_QR" = "true" ]; then
  echo ""
  echo "✅ QR Code Generated!"
  echo ""
  echo "   Next steps:"
  echo "   1. Go to: https://crm.swaryoga.com/admin/crm/qr"
  echo "   2. Click 'Connect' button"
  echo "   3. Scan the QR code with your phone"
  echo "   4. Wait for 'Connected' status"
  echo ""
else
  echo ""
  echo "⚠️  QR Code not yet generated"
  echo ""
  echo "   This could mean:"
  echo "   1. Chrome still initializing (wait 10-15 seconds)"
  echo "   2. Chrome crashed (check EC2 logs with: ssh ubuntu@$EC2_IP pm2 logs wa-bridge)"
  echo "   3. Resource issue (EC2 might need more memory/disk)"
  echo ""
  echo "   Try manual trigger:"
  echo "   curl -X POST -H 'X-Bridge-Secret: $BRIDGE_SECRET' $BRIDGE_URL/connect"
fi

echo ""
echo "✅ Diagnostics complete!"
