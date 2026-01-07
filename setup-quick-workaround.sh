#!/usr/bin/env bash

# Quick fix for Meta Incoming & QR Button issues
# This script sets up a mock bridge service so you can continue working

set -e

echo "🔧 Setting up quick workaround for Meta/QR issues..."
echo ""

# 1. Create mock endpoints for testing
echo "📝 Creating mock WhatsApp bridge service..."

# Create a simple mock server script
cat > /tmp/mock-wa-bridge.js << 'EOF'
/**
 * Mock WhatsApp Bridge Service
 * Allows you to work without the real bridge
 * This is for DEVELOPMENT ONLY
 */

const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Mock QR status
  if (req.url === '/api/status' || req.url === '/api/status?') {
    res.writeHead(200);
    res.end(JSON.stringify({
      authenticated: false,
      connecting: false,
      hasQR: true,
      qr: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      qrImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      account: 'mock-account',
      connectedClients: 0,
      message: 'Mock WhatsApp Bridge - Ready for scanning QR code'
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.BRIDGE_PORT || 9090;
server.listen(PORT, () => {
  console.log(`✅ Mock WhatsApp Bridge running on http://localhost:${PORT}`);
  console.log(`   Use WHATSAPP_BRIDGE_HTTP_URL=http://localhost:${PORT}`);
});
EOF

# 2. Create env template
echo ""
echo "📋 Creating .env.local configuration..."

cat > /tmp/whatsapp-env-setup.sh << 'EOF'
#!/bin/bash
# Add these to your .env.local file

echo ""
echo "Add the following to .env.local:"
echo "================================================"
echo ""
echo "# WhatsApp Bridge Configuration"
echo "WHATSAPP_BRIDGE_HTTP_URL=http://localhost:9090"
echo "# Or use: https://wa-bridge.swaryoga.com"
echo ""
echo "# Enable Meta Features"
echo "NEXT_PUBLIC_ENABLE_META_WHATSAPP=true"
echo ""
echo "================================================"
echo ""
EOF

chmod +x /tmp/whatsapp-env-setup.sh

# 3. Start mock bridge in background
echo ""
echo "🚀 Starting mock WhatsApp bridge service..."
echo "   This will allow QR/Meta features to work for testing"
echo ""

# Kill any existing mock bridge
pkill -f "mock-wa-bridge" || true
sleep 1

# Start the mock bridge
BRIDGE_PORT=9090 node /tmp/mock-wa-bridge.js > /tmp/mock-bridge.log 2>&1 &
BRIDGE_PID=$!

sleep 1

# Verify it's running
if ps -p $BRIDGE_PID > /dev/null; then
  echo "✅ Mock bridge started (PID: $BRIDGE_PID)"
  echo "   Log: /tmp/mock-bridge.log"
else
  echo "❌ Failed to start mock bridge"
  cat /tmp/mock-bridge.log
  exit 1
fi

# 4. Show instructions
echo ""
echo "════════════════════════════════════════════════"
echo "✨ QUICK WORKAROUND SETUP COMPLETE"
echo "════════════════════════════════════════════════"
echo ""
echo "📌 NEXT STEPS TO CONTINUE YOUR WORK:"
echo ""
echo "1️⃣  Add to your .env.local file:"
echo "   WHATSAPP_BRIDGE_HTTP_URL=http://localhost:9090"
echo "   NEXT_PUBLIC_ENABLE_META_WHATSAPP=true"
echo ""
echo "2️⃣  Restart your app:"
echo "   npm run dev"
echo ""
echo "3️⃣  Now you can access:"
echo "   • QR Login: http://localhost:3000/admin/crm/whatsapp/qr-login"
echo "   • Meta Chat: http://localhost:3000/admin/crm/whatsapp-meta"
echo ""
echo "⚠️  IMPORTANT: This is a MOCK bridge for development"
echo "    For production, configure the real WhatsApp bridge"
echo ""
echo "════════════════════════════════════════════════"
echo ""

EOF

chmod +x /tmp/mock-wa-bridge.js
bash /tmp/whatsapp-env-setup.sh
