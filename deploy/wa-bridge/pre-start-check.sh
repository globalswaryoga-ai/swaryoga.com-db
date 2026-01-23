#!/bin/bash
set -e

# ============================================================
# Pre-Start Health Check
# ============================================================
# Verifies all prerequisites before starting the bridge

LOG_FILE="/var/log/wa-bridge/service.log"
WORK_DIR="/home/ubuntu/swaryoga-wa-bridge"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" 2>&1
}

log "Running pre-start checks..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
  log "ERROR: Docker daemon is not running"
  exit 1
fi

log "✓ Docker daemon is running"

# Check if working directory exists
if [ ! -d "$WORK_DIR" ]; then
  log "ERROR: Working directory not found: $WORK_DIR"
  exit 1
fi

log "✓ Working directory exists"

# Check disk space
AVAILABLE_SPACE=$(df -BG "$WORK_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 5 ]; then
  log "WARNING: Less than 5GB disk space available ($AVAILABLE_SPACE GB)"
fi

log "✓ Sufficient disk space available ($AVAILABLE_SPACE GB)"

# Ensure session directory exists
SESSION_DIR="/home/ubuntu/.wwebjs_auth"
mkdir -p "$SESSION_DIR"
chmod 755 "$SESSION_DIR"

log "✓ Session directory is ready"

# Check memory availability
AVAILABLE_MEM=$(free -h | awk 'NR==2 {print $7}')
log "✓ Available memory: $AVAILABLE_MEM"

log "All pre-start checks passed"
exit 0
