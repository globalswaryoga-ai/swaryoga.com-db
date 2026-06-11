#!/bin/bash

# Bridge Restart Script
# Connects to the VPS and restarts the WhatsApp bridge

set -e

VPS_IP="${VPS_IP:-5.223.65.159}"
VPS_USER="${VPS_USER:-root}"
KEY_PATH="${EC2_KEY_PATH:-.ssh/wa-bridge-key.pem}"

echo "🔧 Bridge Restart Script"
echo "========================"
echo "VPS IP: $VPS_IP"
echo "User: $VPS_USER"
echo "Key: $KEY_PATH"
echo ""

# Check if key exists
if [ ! -f "$HOME/$KEY_PATH" ]; then
  echo "❌ SSH key not found at: $HOME/$KEY_PATH"
  echo "Please ensure the key file exists or update EC2_KEY_PATH in .env.local"
  exit 1
fi

echo "🔐 Connecting to VPS..."
echo ""

# Run commands on VPS
ssh -i "$HOME/$KEY_PATH" "$VPS_USER@$VPS_IP" bash << 'EOF'
  echo "📋 Checking bridge service status..."
  echo ""
  
  # Check if PM2 is installed
  if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found, installing..."
    npm install -g pm2
  fi
  
  echo "📊 PM2 Status:"
  pm2 status 2>/dev/null || echo "No PM2 processes"
  echo ""
  
  # Try to stop the bridge gracefully
  echo "⏹️  Stopping bridge service..."
  pm2 stop wa-baileys 2>/dev/null || pm2 kill || true
  sleep 2
  
  # Check if process is still running
  echo "🧹 Cleaning up old processes..."
  pkill -f "wa-baileys" || true
  pkill -f "node.*index.js" || true
  sleep 2
  
  echo ""
  echo "🚀 Starting bridge service..."
  
  # Navigate to bridge directory and start
  if [ -d "/root/wa-bridge" ]; then
    cd /root/wa-bridge
    echo "Found bridge at /root/wa-bridge"
  elif [ -d "/opt/wa-bridge" ]; then
    cd /opt/wa-bridge
    echo "Found bridge at /opt/wa-bridge"
  elif [ -d "/home/wa-bridge" ]; then
    cd /home/wa-bridge
    echo "Found bridge at /home/wa-bridge"
  else
    echo "⚠️  Bridge directory not found, trying current directory"
    pwd
  fi
  
  # Start with PM2
  pm2 start index.js --name wa-baileys --instances 1 --max-memory-restart 1G
  sleep 3
  
  echo ""
  echo "✅ Bridge started!"
  pm2 status
  echo ""
  
  echo "🔍 Checking if bridge is responding..."
  curl -s http://localhost:3333/status | head -c 200 || echo "Still initializing..."
EOF

echo ""
echo "================================"
echo "Bridge restart attempted!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Wait 10-15 seconds for bridge to initialize"
echo "2. Reload the QR page in your browser"
echo "3. Run the diagnostic again: node check-qr-chat-issue.js"
echo ""
