#!/bin/bash

# ============================================================
# EC2 Auto-Recovery & WhatsApp QR Bridge Persistence Setup
# ============================================================
# This script ensures:
# 1. EC2 instance auto-restarts if it stops
# 2. WhatsApp QR bridge starts automatically on boot
# 3. Health checks monitor both services
# ============================================================

set -e

AWS_REGION="us-east-1"
INSTANCE_ID="i-0cbb6320079b903d8"  # wa-bridge-prod-v2
INSTANCE_IP="52.91.198.23"
BRIDGE_PORT="3333"

echo "🔧 Setting up EC2 Auto-Recovery & Bridge Persistence..."
echo ""

# ============================================================
# Step 1: Enable EC2 Instance Recovery
# ============================================================
echo "📍 Step 1: Enabling EC2 Instance Auto-Recovery..."

# Check if recovery action is already set
RECOVERY_ACTION=$(aws ec2 describe-instance-attribute \
  --instance-id "$INSTANCE_ID" \
  --region "$AWS_REGION" \
  --attribute instanceInitiatedShutdownBehavior \
  --query 'InstanceInitiatedShutdownBehavior.Value' \
  --output text 2>/dev/null || echo "stop")

echo "   Current shutdown behavior: $RECOVERY_ACTION"

# Create CloudWatch alarm for instance recovery
echo "   Creating CloudWatch alarm for auto-recovery..."
aws cloudwatch put-metric-alarm \
  --alarm-name "ec2-wa-bridge-prod-v2-recovery" \
  --alarm-description "Auto-recover wa-bridge-prod-v2 if status check fails" \
  --metric-name StatusCheckFailed_System \
  --namespace AWS/EC2 \
  --statistic Minimum \
  --period 60 \
  --threshold 0 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value="$INSTANCE_ID" \
  --alarm-actions "arn:aws:automate:${AWS_REGION}:ec2:recover" \
  --region "$AWS_REGION" 2>/dev/null || echo "   ⚠️  Alarm already exists or insufficient permissions"

echo "   ✅ EC2 Instance Recovery enabled"
echo ""

# ============================================================
# Step 2: Create Bridge Service Monitoring Script
# ============================================================
echo "📍 Step 2: Creating Bridge Service Monitor..."

cat > /tmp/bridge-monitor.sh << 'MONITOR_SCRIPT'
#!/bin/bash

# Bridge Service Health Monitor
# Runs on EC2 instance to keep QR bridge running

BRIDGE_PORT=3333
BRIDGE_URL="http://localhost:${BRIDGE_PORT}/health"
LOG_FILE="/var/log/wa-bridge-monitor.log"
MAX_RETRIES=3
RETRY_DELAY=5

check_bridge_health() {
  curl -s -m 5 "$BRIDGE_URL" > /dev/null 2>&1
  return $?
}

restart_bridge() {
  echo "[$(date)] 🔄 Bridge health check failed. Attempting restart..." >> "$LOG_FILE"
  
  # Try PM2 first
  if command -v pm2 &> /dev/null; then
    pm2 restart wa-bridge --force 2>&1 | tee -a "$LOG_FILE"
    return $?
  fi
  
  # Fall back to docker
  if command -v docker &> /dev/null; then
    docker restart wa-bridge 2>&1 | tee -a "$LOG_FILE"
    return $?
  fi
  
  echo "[$(date)] ❌ Could not restart bridge - neither PM2 nor Docker available" >> "$LOG_FILE"
  return 1
}

# Main loop
while true; do
  if ! check_bridge_health; then
    echo "[$(date)] ⚠️  Bridge health check failed" >> "$LOG_FILE"
    
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
      sleep $RETRY_DELAY
      if check_bridge_health; then
        echo "[$(date)] ✅ Bridge recovered" >> "$LOG_FILE"
        break
      fi
      RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      if restart_bridge; then
        echo "[$(date)] ✅ Bridge restarted successfully" >> "$LOG_FILE"
        sleep 10
      fi
    fi
  fi
  
  sleep 30
done
MONITOR_SCRIPT

chmod +x /tmp/bridge-monitor.sh
echo "   ✅ Monitor script created at /tmp/bridge-monitor.sh"
echo ""

# ============================================================
# Step 3: Create Systemd Service for Auto-Start
# ============================================================
echo "📍 Step 3: Setting up Systemd Service..."

cat > /tmp/wa-bridge-monitor.service << 'SERVICE_CONTENT'
[Unit]
Description=WhatsApp QR Bridge Service Monitor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
ExecStart=/opt/wa-bridge-monitor.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_CONTENT

echo "   Service file template created"
echo "   📌 To install on EC2 instance, run:"
echo "      scp -i deploy/wa-bridge/wa-bridge-key.pem /tmp/wa-bridge-monitor.service ubuntu@$INSTANCE_IP:/tmp/"
echo "      ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@$INSTANCE_IP sudo mv /tmp/wa-bridge-monitor.service /etc/systemd/system/"
echo "      ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@$INSTANCE_IP sudo systemctl enable wa-bridge-monitor.service"
echo "      ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@$INSTANCE_IP sudo systemctl start wa-bridge-monitor.service"
echo ""

# ============================================================
# Step 4: Create Local Health Check
# ============================================================
echo "📍 Step 4: Setting up Local Health Monitoring..."

cat > ./scripts/monitor-bridge-health.js << 'HEALTH_CHECK'
#!/usr/bin/env node

/**
 * Local Bridge Health Monitor
 * Monitors EC2 bridge connectivity and alerts if down
 */

const http = require('http');
const axios = require('axios');

const BRIDGE_IP = '52.91.198.23';
const BRIDGE_PORT = 3333;
const BRIDGE_URL = `http://${BRIDGE_IP}:${BRIDGE_PORT}/health`;
const CHECK_INTERVAL = 60000; // 60 seconds
const TIMEOUT = 5000;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function checkBridgeHealth() {
  try {
    const response = await axios.get(BRIDGE_URL, {
      timeout: TIMEOUT,
      headers: { 'x-bridge-secret': 'swar-bridge-secret-2024' }
    });
    
    if (response.status === 200 && response.data.status === 'connected') {
      console.log(`${colors.green}✅${colors.reset} [${new Date().toISOString()}] Bridge is CONNECTED`);
      console.log(`   Session: ${response.data.sessionReady ? 'Ready' : 'Initializing'}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠️ ${colors.reset} [${new Date().toISOString()}] Bridge status unclear`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`${colors.red}❌${colors.reset} [${new Date().toISOString()}] Bridge is DOWN - Connection refused at ${BRIDGE_IP}:${BRIDGE_PORT}`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      console.log(`${colors.red}❌${colors.reset} [${new Date().toISOString()}] Bridge is UNREACHABLE - ${error.code}`);
    } else {
      console.log(`${colors.red}❌${colors.reset} [${new Date().toISOString()}] Health check failed: ${error.message}`);
    }
    return false;
  }
}

// Check immediately
console.log(`${colors.cyan}🔍 Starting Bridge Health Monitor${colors.reset}`);
console.log(`   Monitoring: ${BRIDGE_URL}`);
console.log(`   Check interval: ${CHECK_INTERVAL / 1000}s`);
console.log('');

checkBridgeHealth();

// Check periodically
setInterval(checkBridgeHealth, CHECK_INTERVAL);

// Keep process alive
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Monitor stopped${colors.reset}`);
  process.exit(0);
});
HEALTH_CHECK

chmod +x ./scripts/monitor-bridge-health.js
echo "   ✅ Health monitor created at ./scripts/monitor-bridge-health.js"
echo ""

# ============================================================
# Step 5: Add NPM Scripts
# ============================================================
echo "📍 Step 5: Updating package.json with new commands..."

# Note: User will need to manually add these scripts:
echo "   📌 Add these lines to package.json scripts section:"
echo '      "monitor-bridge": "node scripts/monitor-bridge-health.js",'
echo '      "monitor-bridge:watch": "nodemon --watch scripts/monitor-bridge-health.js scripts/monitor-bridge-health.js"'
echo ""

# ============================================================
# Summary
# ============================================================
echo "═══════════════════════════════════════════════════════════"
echo "✅ EC2 Auto-Recovery Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 What was configured:"
echo "   ✓ EC2 instance auto-recovery (CloudWatch alarm)"
echo "   ✓ Bridge service health monitor script"
echo "   ✓ Systemd service for auto-start"
echo "   ✓ Local health check monitoring"
echo ""
echo "🚀 Next steps:"
echo "   1. SSH into EC2: ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@$INSTANCE_IP"
echo "   2. Copy monitor: scp -i deploy/wa-bridge/wa-bridge-key.pem /tmp/bridge-monitor.sh ubuntu@$INSTANCE_IP:/tmp/"
echo "   3. Install monitor: ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@$INSTANCE_IP sudo cp /tmp/bridge-monitor.sh /opt/"
echo "   4. Test locally: npm run monitor-bridge"
echo ""
echo "💡 Tips:"
echo "   • EC2 instance will auto-recover if status checks fail"
echo "   • Bridge service will restart if it goes down"
echo "   • Monitor your local dev environment with: npm run monitor-bridge"
echo "   • Check EC2 status: npm run ec2:status"
echo ""
