#!/bin/bash
# Swar Yoga EC2 WhatsApp Bridge Fixer

echo "🚀 Starting Surgical Repair for WhatsApp Bridge..."

# 1. EMERGENCY DISK CLEANUP
echo "🧹 Cleaning disk space..."
sudo journalctl --vacuum-time=1s
rm -rf ~/swaryoga.com-db/.next
rm -rf ~/swaryoga.com-db/node_modules
rm -rf ~/.npm/_cacache
sudo apt-get clean
sudo apt-get autoremove -y

echo "📦 Removing broken Puppeteer browser cache (often incomplete after ENOSPC)..."
rm -rf ~/.cache/puppeteer/*

# 2. UBUNTU 24.04 LIBRARIES & SECURITY
echo "🛠 Fixing Ubuntu 24.04 't64' libraries..."
sudo apt-get update
sudo apt-get install -y libasound2t64 libatk1.0-0 libatk-bridge2.0-0 libnss3 libdrm2 libgbm1
sudo ln -sf /usr/lib/x86_64-linux-gnu/libasound.so.2t64 /usr/lib/x86_64-linux-gnu/libasound.so.2
sudo ln -sf /usr/lib/x86_64-linux-gnu/libatk-1.0.so.0t64 /usr/lib/x86_64-linux-gnu/libatk-1.0.so.0

echo "🔓 Unlocking AppArmor sandbox restriction..."
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0

# 3. INSTALL A SYSTEM BROWSER (smaller + faster on tiny disks)
echo "🌐 Installing system Chromium (recommended on small EC2 disks)..."
sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium

echo "✅ Chromium path (if installed):"
command -v chromium-browser || true
command -v chromium || true

echo "✅ Repair complete! Checking disk space:"
df -h /

echo "Done. Now run: node index.js"
