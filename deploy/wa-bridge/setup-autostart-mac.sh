#!/bin/bash
# WhatsApp Bridge Auto-Start Setup for macOS
# This script sets up the bridge to auto-start on login and persist sessions

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.swaryoga.whatsapp-bridge.plist"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🔧 WhatsApp Bridge Auto-Start Setup"
echo "===================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    exit 1
fi

NODE_PATH=$(which node)
echo "✅ Node.js found at: $NODE_PATH"

# Update plist with correct node path
sed -i '' "s|/usr/local/bin/node|$NODE_PATH|g" "$PLIST_SRC" 2>/dev/null || true

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Stop existing service if running
echo ""
echo "📦 Stopping existing service (if any)..."
launchctl unload "$PLIST_DEST" 2>/dev/null || true

# Copy plist file
echo "📋 Installing launch agent..."
cp "$PLIST_SRC" "$PLIST_DEST"

# Create persistent session directory
mkdir -p "$HOME/.whatsapp-bridge-session"
echo "✅ Session directory: $HOME/.whatsapp-bridge-session"

# Load the service
echo ""
echo "🚀 Starting WhatsApp Bridge service..."
launchctl load "$PLIST_DEST"

sleep 2

# Check if running
if launchctl list | grep -q "com.swaryoga.whatsapp-bridge"; then
    echo ""
    echo "✅ WhatsApp Bridge is now running!"
    echo ""
    echo "📱 To scan QR code, open: http://localhost:3333/qr-page"
    echo ""
    echo "🔄 The bridge will:"
    echo "   • Auto-start when you log in"
    echo "   • Keep your WhatsApp session (no re-scan needed)"
    echo "   • Restart automatically if it crashes"
    echo ""
    echo "📊 Commands:"
    echo "   Check status: launchctl list | grep whatsapp"
    echo "   View logs:    tail -f /tmp/whatsapp-bridge.log"
    echo "   Stop:         launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
    echo "   Start:        launchctl load ~/Library/LaunchAgents/$PLIST_NAME"
else
    echo ""
    echo "⚠️  Service may not have started. Check logs:"
    echo "   tail -f /tmp/whatsapp-bridge-error.log"
fi

echo ""
echo "✨ Setup complete!"
