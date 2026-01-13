#!/bin/bash
# Quick fix for WhatsApp QR on production domain
# This script sets up ngrok tunnel and updates environment

set -e

echo "🚀 WhatsApp QR Production Domain Fix"
echo "===================================="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Install with: brew install ngrok"
    exit 1
fi

echo "✅ ngrok found at: $(which ngrok)"
echo ""

# Check if bridge is running locally
echo "🔍 Checking if bridge is running at localhost:3333..."
if curl -s http://localhost:3333/status -H "x-bridge-secret: swar-bridge-secret-2024" > /dev/null 2>&1; then
    echo "✅ Bridge is running locally"
else
    echo "⚠️  Bridge might not be running. Start it with: npm run dev:bridge (or equivalent)"
fi

echo ""
echo "🌐 Starting ngrok tunnel..."
echo "   This will expose localhost:3333 to the internet"
echo ""
echo "Run this command in a new terminal:"
echo ""
echo "  ngrok http 3333 --subdomain=swar-yoga-bridge"
echo ""
echo "Then copy the HTTPS URL (e.g., https://swar-yoga-bridge.ngrok.io)"
echo ""

# Prompt user for ngrok URL
read -p "Enter your ngrok HTTPS URL (e.g., https://swar-yoga-bridge.ngrok.io): " NGROK_URL

if [ -z "$NGROK_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

echo ""
echo "📝 Updating .env.local..."
echo ""

# Create backup
cp .env.local .env.local.backup
echo "✅ Backup created: .env.local.backup"

# Update the environment variables
# Using sed with pipe to handle the | character properly
sed -i.tmp "s|NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=.*|NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=$NGROK_URL|" .env.local
sed -i.tmp "s|WHATSAPP_BRIDGE_HTTP_URL=.*|WHATSAPP_BRIDGE_HTTP_URL=$NGROK_URL|" .env.local
rm .env.local.tmp

echo "✅ Updated environment variables:"
echo "   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=$NGROK_URL"
echo "   WHATSAPP_BRIDGE_HTTP_URL=$NGROK_URL"
echo ""

echo "🔄 Restarting Next.js dev server..."
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Stop the dev server (Ctrl+C in the npm run dev terminal)"
echo "   2. Run: npm run dev -- --port 3020"
echo "   3. Visit: https://crm.swaryoga.com/admin/crm/qr"
echo "   4. Click 'Login (QR)' - QR code should appear! ✅"
echo ""

echo "Done! The configuration is ready."
