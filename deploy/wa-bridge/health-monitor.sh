#!/bin/bash

# ============================================================
# WhatsApp Bridge - Continuous Health Monitor & Auto-Restart
# ============================================================
# This script continuously monitors the bridge and restarts
# it if it becomes unresponsive or crashes
# 
# Install as: /opt/wa-bridge/health-monitor.sh
# Run with: systemd timer or cron every 5 minutes

set -e

BRIDGE_IP="127.0.0.1"
BRIDGE_PORT="3333"
BRIDGE_URL="http://${BRIDGE_IP}:${BRIDGE_PORT}/health"
LOG_FILE="/var/log/wa-bridge/health-monitor.log"
MAX_CONSECUTIVE_FAILURES=3
TIMEOUT=5

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

# Check if bridge is responding
check_bridge_health() {
  RESPONSE=$(curl -s -m $TIMEOUT "$BRIDGE_URL" 2>&1 || echo "FAILED")
  
  if echo "$RESPONSE" | grep -q "status"; then
    return 0  # Bridge is healthy
  else
    return 1  # Bridge is down
  fi
}

# Restart the bridge service
restart_bridge() {
  log_warn "Bridge is DOWN. Attempting restart..."
  
  # Try systemd restart first
  if systemctl is-active --quiet wa-bridge; then
    log "Restarting via systemd..."
    sudo systemctl restart wa-bridge
    sleep 5
  fi
  
  # If that didn't work, try docker
  if ! check_bridge_health; then
    log "Restarting via docker..."
    docker restart wa-bridge 2>&1 | tee -a "$LOG_FILE"
    sleep 5
  fi
  
  # Check if it came back online
  if check_bridge_health; then
    log_success "Bridge restarted successfully"
    return 0
  else
    log_error "Bridge failed to restart"
    return 1
  fi
}

# Get the current failure count from a state file
get_failure_count() {
  STATE_FILE="/tmp/wa-bridge-failures"
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo 0
  fi
}

# Update failure count
set_failure_count() {
  echo "$1" > /tmp/wa-bridge-failures
}

# Reset failure count on success
reset_failure_count() {
  rm -f /tmp/wa-bridge-failures
}

# ============================================================
# Main Logic
# ============================================================

log "Starting health check..."

if check_bridge_health; then
  # Bridge is healthy
  log_success "Bridge is healthy"
  reset_failure_count
  exit 0
else
  # Bridge is down
  FAILURES=$(get_failure_count)
  FAILURES=$((FAILURES + 1))
  set_failure_count "$FAILURES"
  
  log_warn "Bridge health check failed (attempt $FAILURES/$MAX_CONSECUTIVE_FAILURES)"
  
  if [ $FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
    # Too many failures, restart
    if restart_bridge; then
      reset_failure_count
      exit 0
    else
      log_error "Failed to restart bridge after $FAILURES attempts"
      exit 1
    fi
  else
    # Wait and retry next cycle
    exit 1
  fi
fi
