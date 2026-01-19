#!/bin/bash

# Bridge Health & Diagnostics Script
# Tests connectivity and endpoints on the WhatsApp bridge

BRIDGE_URL="${1:-http://52.91.198.23:3333}"
BRIDGE_SECRET="${2:-swar-bridge-secret-2024}"
TIMEOUT=10

echo "🔍 WhatsApp Bridge Diagnostics"
echo "================================"
echo "Bridge URL: $BRIDGE_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Test 1: Basic connectivity
echo "📡 Test 1: Basic Connectivity"
if curl -s -m $TIMEOUT "$BRIDGE_URL/" &>/dev/null; then
  echo "✅ Bridge is responding"
else
  echo "❌ Bridge is not responding (connection failed or timeout)"
  exit 1
fi
echo ""

# Test 2: Health endpoint
echo "💚 Test 2: Health Endpoint (/health)"
HEALTH=$(curl -s -m $TIMEOUT -H "x-bridge-secret: $BRIDGE_SECRET" "$BRIDGE_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Health check passed"
  echo "   Response: $HEALTH"
else
  echo "❌ Health endpoint not working"
  echo "   Response: $HEALTH"
fi
echo ""

# Test 3: QR endpoint
echo "📱 Test 3: QR Code Endpoint (/qr)"
QR_STATUS=$(curl -s -m $TIMEOUT -w "\n%{http_code}" -H "x-bridge-secret: $BRIDGE_SECRET" "$BRIDGE_URL/qr" | tail -1)
if [ "$QR_STATUS" = "200" ]; then
  echo "✅ QR endpoint available"
else
  echo "⚠️  QR endpoint returned HTTP $QR_STATUS"
fi
echo ""

# Test 4: Status endpoint
echo "📊 Test 4: Status Endpoint (/status)"
STATUS=$(curl -s -m $TIMEOUT -H "x-bridge-secret: $BRIDGE_SECRET" "$BRIDGE_URL/status")
if echo "$STATUS" | grep -q "connected\|ready\|loading\|disconnected"; then
  echo "✅ Status endpoint available"
  echo "   Response: $STATUS"
else
  echo "⚠️  Status endpoint returned: $STATUS"
fi
echo ""

# Test 5: Chats endpoint
echo "💬 Test 5: Chats Endpoint (/chats)"
CHATS_STATUS=$(curl -s -m $TIMEOUT -w "\n%{http_code}" -H "x-bridge-secret: $BRIDGE_SECRET" "$BRIDGE_URL/chats" | tail -1)
CHATS=$(curl -s -m $TIMEOUT -H "x-bridge-secret: $BRIDGE_SECRET" "$BRIDGE_URL/chats")
if [ "$CHATS_STATUS" = "200" ]; then
  echo "✅ Chats endpoint available"
  if echo "$CHATS" | grep -q "chats"; then
    COUNT=$(echo "$CHATS" | grep -o '"id"' | wc -l)
    echo "   Found $COUNT chats"
  else
    echo "   Response: $CHATS"
  fi
else
  echo "❌ Chats endpoint returned HTTP $CHATS_STATUS"
  echo "   Response: $CHATS"
fi
echo ""

# Test 6: Messages endpoint (requires a chat ID)
echo "📨 Test 6: Messages Endpoint (/messages/:chatId)"
echo "   (Requires a valid chat ID - skipping generic test)"
echo "   To test: curl -H 'x-bridge-secret: $BRIDGE_SECRET' '$BRIDGE_URL/messages/CHAT_ID_HERE'"
echo ""

# Summary
echo "================================"
echo "✅ If all tests passed, the bridge is working correctly"
echo "❌ If tests failed, the bridge service may need to be restarted"
echo ""
echo "To restart the bridge:"
echo "  Option A (Docker): cd deploy/wa-bridge && docker-compose down && docker-compose up -d"
echo "  Option B (PM2):    pm2 restart bridge && pm2 save"
echo ""
