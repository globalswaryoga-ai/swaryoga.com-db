#!/bin/bash
# Quick QR Bridge Diagnostic Script
# Run this if QR is not appearing

echo "🔍 WhatsApp QR Bridge Diagnostics"
echo "=================================="
echo ""

# Check if bridge process is running
echo "1️⃣  Checking if bridge is running..."
BRIDGE_PID=$(ps aux | grep "[n]ode.*services/whatsapp-web/index.js" | awk '{print $2}')
if [ -n "$BRIDGE_PID" ]; then
    echo "   ✅ Bridge is running (PID: $BRIDGE_PID)"
else
    echo "   ❌ Bridge is NOT running"
    echo "   💡 Start it with: cd services/whatsapp-web && node index.js"
    exit 1
fi
echo ""

# Check if port 3333 is listening
echo "2️⃣  Checking if port 3333 is listening..."
if lsof -Pi :3333 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ✅ Port 3333 is listening"
else
    echo "   ❌ Port 3333 is NOT listening"
    echo "   💡 The bridge might have failed to start"
    exit 1
fi
echo ""

# Test bridge connectivity
echo "3️⃣  Testing bridge /status endpoint..."
STATUS_RESPONSE=$(curl -s -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/status 2>&1)
if [ $? -eq 0 ]; then
    echo "   ✅ Bridge responds to /status"
    echo "   Response: $STATUS_RESPONSE" | head -c 150
    echo ""
else
    echo "   ❌ Cannot connect to bridge"
    exit 1
fi
echo ""

# Check if QR is available
echo "4️⃣  Checking QR availability..."
HAS_QR=$(echo "$STATUS_RESPONSE" | grep -o '"hasQr":[^,}]*' | cut -d: -f2)
if [ "$HAS_QR" = "true" ]; then
    echo "   ✅ QR code is available"
    
    # Try to fetch QR
    QR_RESPONSE=$(curl -s -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/qr 2>&1)
    QR_LENGTH=${#QR_RESPONSE}
    
    if [ $QR_LENGTH -gt 100 ]; then
        echo "   ✅ QR code fetched successfully ($QR_LENGTH bytes)"
    else
        echo "   ⚠️  QR response is too short ($QR_LENGTH bytes)"
    fi
else
    echo "   ⚠️  No QR code (might be already connected)"
    CONN_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "   Status: $CONN_STATUS"
fi
echo ""

# Check environment variables
echo "5️⃣  Checking environment variables..."
if grep -q "NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL" .env.local 2>/dev/null; then
    echo "   ✅ NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL is set"
else
    echo "   ⚠️  NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL not found in .env.local"
fi

if grep -q "NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET" .env.local 2>/dev/null; then
    echo "   ✅ NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET is set"
else
    echo "   ⚠️  NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET not found in .env.local"
fi
echo ""

# Summary
echo "=================================="
echo "📊 SUMMARY"
echo "=================================="
echo "Bridge Running:  $([ -n "$BRIDGE_PID" ] && echo "✅ YES" || echo "❌ NO")"
echo "Port Listening:  $(lsof -Pi :3333 -sTCP:LISTEN -t >/dev/null 2>&1 && echo "✅ YES" || echo "❌ NO")"
echo "Bridge Responds: $([ -n "$STATUS_RESPONSE" ] && echo "✅ YES" || echo "❌ NO")"
echo "QR Available:    $([ "$HAS_QR" = "true" ] && echo "✅ YES" || echo "⚠️  NO")"
echo ""

if [ "$HAS_QR" = "true" ]; then
    echo "✨ Everything looks good! QR should be visible."
    echo ""
    echo "🌐 Open: http://localhost:3000/admin/crm/qr"
    echo "   The QR modal should auto-open."
else
    CONN_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$CONN_STATUS" = "connected" ]; then
        echo "ℹ️  WhatsApp is already connected. No QR needed."
        echo "   You can start messaging!"
    else
        echo "⚠️  Status: $CONN_STATUS"
        echo "💡 Try clicking 'Connect' button in the UI"
    fi
fi
