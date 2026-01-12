#!/bin/bash

# Setup auto-start services for Swar Yoga App
# This script installs launchd plist files for auto-starting the bridge and dev server

echo "🚀 Setting up auto-start services for Swar Yoga..."

# Load the bridge service
echo "📍 Loading WhatsApp bridge service..."
launchctl load ~/Library/LaunchAgents/com.swaryoga.whatsapp-bridge.plist 2>/dev/null || launchctl unload ~/Library/LaunchAgents/com.swaryoga.whatsapp-bridge.plist 2>/dev/null && launchctl load ~/Library/LaunchAgents/com.swaryoga.whatsapp-bridge.plist

# Load the dev server service
echo "📍 Loading dev server service..."
launchctl load ~/Library/LaunchAgents/com.swaryoga.dev-server.plist 2>/dev/null || launchctl unload ~/Library/LaunchAgents/com.swaryoga.dev-server.plist 2>/dev/null && launchctl load ~/Library/LaunchAgents/com.swaryoga.dev-server.plist

echo "✅ Services loaded successfully!"
echo ""
echo "📋 Service Status:"
echo "  Bridge:     launchctl list com.swaryoga.whatsapp-bridge"
echo "  Dev Server: launchctl list com.swaryoga.dev-server"
echo ""
echo "📝 Log files:"
echo "  Bridge:     tail -f /tmp/whatsapp-bridge.log"
echo "  Dev Server: tail -f /tmp/dev-server.log"
echo ""
echo "🛑 To stop services:"
echo "  launchctl unload ~/Library/LaunchAgents/com.swaryoga.whatsapp-bridge.plist"
echo "  launchctl unload ~/Library/LaunchAgents/com.swaryoga.dev-server.plist"
echo ""
echo "💡 Services will auto-start on system boot and auto-restart on crash"
