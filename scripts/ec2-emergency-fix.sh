#!/bin/bash
# Swar Yoga EC2 Emergency Recovery Script (v5 - ENOSPC Fix)
# This script reclaims disk space and fixes the corrupted WhatsApp bridge.

echo "🚀 Starting Emergency Recovery..."

# 1. RECLAIM DISK SPACE
echo "🧹 Reclaiming disk space..."
# Truncate PM2 logs (they are often the culprit)
truncate -s 0 ~/.pm2/logs/*.log
# Clean npm cache
npm cache clean --force
# Remove unused packages
sudo apt-get autoremove -y
sudo apt-get clean
# Find and delete any large core dumps or old logs
sudo find /var/log -type f -name "*.gz" -delete
sudo find /var/log -type f -name "*.1" -delete

echo "📊 Current Disk Usage:"
df -h | grep '^/dev/'

# 2. FIX WHATSAPP BRIDGE
echo "📦 Fixing WhatsApp Bridge Dependencies..."
cd ~/swaryoga.com-db/services/whatsapp-web || exit 1

# Delete corrupted node_modules
rm -rf node_modules package-lock.json

# Reinstall dependencies
echo "📥 Installing dependencies (this may take a minute)..."
npm install --no-audit --no-fund

# 3. RESTART BRIDGE
echo "🔄 Restarting WhatsApp Bridge..."
pm2 delete wa-bridge || true
pm2 start index.js --name "wa-bridge" --watch
pm2 save

echo "✅ Recovery Complete! Please check 'pm2 status' and 'pm2 logs wa-bridge'"
