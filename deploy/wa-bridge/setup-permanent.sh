#!/bin/bash

# ============================================================
# WhatsApp Bridge - Permanent Setup on EC2
# ============================================================
# This script sets up the bridge to run 24/7 permanently
# with automatic restart on crash and instance recovery
#
# Run this ONCE on EC2 instance:
#   bash /home/ubuntu/swaryoga.com-db/deploy/wa-bridge/setup-permanent.sh

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   WhatsApp QR Bridge - Permanent Setup                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Verify running on EC2
if [ "$EUID" -ne 0 ]; then 
  echo "❌ This script must be run with sudo"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  exit 1
fi

# ============================================================
# Step 1: Create directories
# ============================================================
echo "Step 1: Creating directories..."

mkdir -p /opt/wa-bridge
mkdir -p /var/log/wa-bridge
mkdir -p /home/ubuntu/.wwebjs_auth

chmod 755 /opt/wa-bridge
chmod 755 /var/log/wa-bridge
chmod 755 /home/ubuntu/.wwebjs_auth

chown ubuntu:ubuntu /home/ubuntu/.wwebjs_auth
chown ubuntu:ubuntu /var/log/wa-bridge

echo "✅ Directories created"
echo ""

# ============================================================
# Step 2: Copy service scripts
# ============================================================
echo "Step 2: Installing service scripts..."

SCRIPT_DIR="/home/ubuntu/swaryoga.com-db/deploy/wa-bridge"

if [ -f "$SCRIPT_DIR/start-service.sh" ]; then
  cp "$SCRIPT_DIR/start-service.sh" /opt/wa-bridge/
  chmod +x /opt/wa-bridge/start-service.sh
  echo "  ✅ start-service.sh installed"
else
  echo "  ⚠️  start-service.sh not found"
fi

if [ -f "$SCRIPT_DIR/pre-start-check.sh" ]; then
  cp "$SCRIPT_DIR/pre-start-check.sh" /opt/wa-bridge/
  chmod +x /opt/wa-bridge/pre-start-check.sh
  echo "  ✅ pre-start-check.sh installed"
else
  echo "  ⚠️  pre-start-check.sh not found"
fi

if [ -f "$SCRIPT_DIR/health-monitor.sh" ]; then
  cp "$SCRIPT_DIR/health-monitor.sh" /opt/wa-bridge/
  chmod +x /opt/wa-bridge/health-monitor.sh
  echo "  ✅ health-monitor.sh installed"
else
  echo "  ⚠️  health-monitor.sh not found"
fi

echo ""

# ============================================================
# Step 3: Install systemd service
# ============================================================
echo "Step 3: Installing systemd service..."

if [ -f "$SCRIPT_DIR/wa-bridge.service" ]; then
  cp "$SCRIPT_DIR/wa-bridge.service" /etc/systemd/system/
  chmod 644 /etc/systemd/system/wa-bridge.service
  echo "  ✅ wa-bridge.service installed"
else
  echo "  ⚠️  wa-bridge.service not found"
fi

# Reload systemd
systemctl daemon-reload
echo "  ✅ systemd reloaded"

# Enable service
systemctl enable wa-bridge
echo "  ✅ wa-bridge service enabled on boot"

echo ""

# ============================================================
# Step 4: Install health check timer
# ============================================================
echo "Step 4: Installing health check timer..."

cat > /etc/systemd/system/wa-bridge-health.timer << 'TIMER_EOF'
[Unit]
Description=WhatsApp Bridge Health Check Timer
Requires=wa-bridge-health.service

[Timer]
# Run every 5 minutes
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
TIMER_EOF

cat > /etc/systemd/system/wa-bridge-health.service << 'SERVICE_EOF'
[Unit]
Description=WhatsApp Bridge Health Check
After=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/wa-bridge/health-monitor.sh
User=ubuntu
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

chmod 644 /etc/systemd/system/wa-bridge-health.timer
chmod 644 /etc/systemd/system/wa-bridge-health.service

systemctl daemon-reload
systemctl enable wa-bridge-health.timer
systemctl start wa-bridge-health.timer

echo "  ✅ Health check timer installed (runs every 5 minutes)"
echo ""

# ============================================================
# Step 5: Start the service
# ============================================================
echo "Step 5: Starting the bridge service..."

systemctl start wa-bridge
sleep 5

# Check if it's running
if systemctl is-active --quiet wa-bridge; then
  echo "  ✅ wa-bridge service is RUNNING"
else
  echo "  ⚠️  Service started but may be initializing"
fi

echo ""

# ============================================================
# Step 6: Verify bridge is responding
# ============================================================
echo "Step 6: Verifying bridge is responding..."

for i in {1..6}; do
  if curl -s -m 2 http://localhost:3333/health 2>&1 | grep -q "status"; then
    echo "  ✅ Bridge is responding on port 3333"
    echo "  ✅ Bridge is FULLY OPERATIONAL"
    break
  elif [ $i -lt 6 ]; then
    echo "  ⏳ Waiting for bridge to respond... ($i/6)"
    sleep 5
  else
    echo "  ⚠️  Bridge not yet responding (may be initializing)"
  fi
done

echo ""

# ============================================================
# Step 7: Display status
# ============================================================
echo "Step 7: Service status..."
echo ""

echo "Systemd service status:"
systemctl status wa-bridge --no-pager | head -10
echo ""

echo "Health check timer:"
systemctl status wa-bridge-health.timer --no-pager | head -5
echo ""

# ============================================================
# Completion
# ============================================================
echo "╔════════════════════════════════════════════════════════╗"
echo "║            ✅ SETUP COMPLETE                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "✨ Your WhatsApp QR Bridge is now permanently installed!"
echo ""
echo "📋 What was configured:"
echo "   ✓ Systemd service (auto-start on boot)"
echo "   ✓ Health monitor (checks every 5 minutes)"
echo "   ✓ Auto-restart on crash"
echo "   ✓ Memory and CPU limits"
echo "   ✓ Persistent session storage"
echo ""
echo "🔧 Management commands:"
echo "   systemctl start wa-bridge       # Start bridge"
echo "   systemctl stop wa-bridge        # Stop bridge"
echo "   systemctl restart wa-bridge     # Restart bridge"
echo "   systemctl status wa-bridge      # Check status"
echo "   journalctl -u wa-bridge -f      # View logs (live)"
echo "   curl http://localhost:3333/health  # Health check"
echo ""
echo "📊 Monitoring:"
echo "   - Health checks run every 5 minutes"
echo "   - Auto-restart on 3 consecutive failures"
echo "   - Logs in: /var/log/wa-bridge/service.log"
echo ""
echo "🚀 Bridge will automatically:"
echo "   ✓ Start on EC2 boot"
echo "   ✓ Restart if it crashes"
echo "   ✓ Recover from memory issues"
echo "   ✓ Maintain WhatsApp session"
echo ""
echo "⚠️  NEXT STEPS on your local machine:"
echo "   1. npm run monitor-bridge"
echo "   2. Should show: ✅ Bridge is CONNECTED"
echo ""
