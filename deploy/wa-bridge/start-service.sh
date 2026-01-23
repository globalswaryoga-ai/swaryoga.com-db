#!/bin/bash
set -e

# ============================================================
# WhatsApp Bridge Service - Main Startup Script
# ============================================================
# This script is called by systemd to start the bridge
# It ensures proper initialization and health

SERVICE_NAME="wa-bridge"
LOG_FILE="/var/log/wa-bridge/service.log"
LOG_DIR="/var/log/wa-bridge"
WORK_DIR="/home/ubuntu/swaryoga-wa-bridge"
PORT="${PORT:-3333}"
HEALTH_CHECK_TIMEOUT=30
HEALTH_CHECK_INTERVAL=5

# Ensure log directory exists
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Logging function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════════════"
log "Starting WhatsApp QR Bridge Service"
log "═══════════════════════════════════════════════════════"

# Change to working directory
if [ -d "$WORK_DIR" ]; then
  cd "$WORK_DIR"
  log "Working directory: $WORK_DIR"
else
  log "ERROR: Working directory not found: $WORK_DIR"
  exit 1
fi

# Function to start bridge via docker-compose
start_with_docker_compose() {
  log "Starting bridge via docker-compose..."
  
  if [ ! -f "docker-compose.yml" ]; then
    log "ERROR: docker-compose.yml not found"
    return 1
  fi
  
  docker-compose down 2>/dev/null || true
  sleep 2
  docker-compose up -d 2>&1 | tee -a "$LOG_FILE"
  
  if [ $? -eq 0 ]; then
    log "✅ docker-compose started successfully"
    return 0
  else
    log "ERROR: docker-compose failed"
    return 1
  fi
}

# Function to start bridge via docker run
start_with_docker_run() {
  log "Starting bridge via docker run..."
  
  # Stop and remove old container
  docker stop wa-bridge 2>/dev/null || true
  docker rm wa-bridge 2>/dev/null || true
  sleep 2
  
  # Start new container
  docker run -d \
    --name wa-bridge \
    --restart unless-stopped \
    -p 3333:3333 \
    -v ~/.wwebjs_auth:/app/.wwebjs_auth \
    -e PORT=3333 \
    -e WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024 \
    -e NODE_ENV=production \
    --memory="1.5g" \
    --cpus="0.7" \
    wa-bridge:latest >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    log "✅ docker run started successfully"
    return 0
  else
    log "ERROR: docker run failed"
    return 1
  fi
}

# Function to start bridge via PM2
start_with_pm2() {
  log "Starting bridge via PM2..."
  
  if ! command -v pm2 &> /dev/null; then
    log "ERROR: PM2 not installed"
    return 1
  fi
  
  pm2 delete wa-bridge 2>/dev/null || true
  sleep 2
  pm2 start server.js --name wa-bridge --max-memory-restart 1G 2>&1 | tee -a "$LOG_FILE"
  
  if [ $? -eq 0 ]; then
    log "✅ PM2 started successfully"
    pm2 save
    return 0
  else
    log "ERROR: PM2 start failed"
    return 1
  fi
}

# Try to start the service
log "Attempting to start bridge service..."

if start_with_docker_compose; then
  START_METHOD="docker-compose"
elif start_with_docker_run; then
  START_METHOD="docker-run"
elif start_with_pm2; then
  START_METHOD="pm2"
else
  log "ERROR: All startup methods failed"
  exit 1
fi

log "✅ Started with: $START_METHOD"
log ""

# Wait for bridge to respond
log "Waiting for bridge to come online..."
ATTEMPTS=0
MAX_ATTEMPTS=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  
  if curl -s -m 2 http://localhost:$PORT/health 2>/dev/null | grep -q "status"; then
    log "✅ Bridge is ONLINE and responding"
    log "═══════════════════════════════════════════════════════"
    exit 0
  fi
  
  echo "  Waiting... ($ATTEMPTS/$MAX_ATTEMPTS)" >> "$LOG_FILE"
  sleep $HEALTH_CHECK_INTERVAL
done

log "⚠️  Bridge started but not yet responding (may still be initializing)"
log "═══════════════════════════════════════════════════════"
exit 0
