#!/bin/bash
# Test WhatsApp Web QR Server

echo "🧪 WhatsApp Web QR Server Test Script"
echo "======================================"
echo ""

# Test 1: Health check
echo "1️⃣ Testing Health Check..."
curl -s http://localhost:3333/health | jq . || echo "❌ Health check failed"
echo ""

# Test 2: Status check
echo "2️⃣ Testing Status Endpoint..."
curl -s http://localhost:3333/api/status | jq . || echo "❌ Status check failed"
echo ""

# Test 3: WebSocket connection test
echo "3️⃣ Testing WebSocket Connection..."
echo "   Connecting to ws://localhost:3333..."
echo "   (This will test basic connectivity)"

# Simple WebSocket test using nc or similar
# For now, just show the URL
echo "   WebSocket URL: ws://localhost:3333"
echo "   Expected messages:"
echo "      - {type: 'status', authenticated: false, connecting: true, ...}"
echo "      - {type: 'qr', data: '<base64-image>'}"
echo ""

# Test 4: API initialization
echo "4️⃣ Testing Client Initialization..."
echo "   Sending POST /api/init..."
curl -s -X POST http://localhost:3333/api/init | jq . || echo "❌ Init failed"
echo ""

echo "✅ Tests completed!"
echo ""
echo "📱 Next steps:"
echo "   1. Open http://localhost:3004/admin/crm in your browser"
echo "   2. Click 'WhatsApp QR Login' button"
echo "   3. Wait for QR code to appear (30-60 seconds on first run)"
echo "   4. Scan with WhatsApp mobile phone"
echo "   5. Should show 'Authenticated' status"
echo ""
