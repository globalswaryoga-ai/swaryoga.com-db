#!/bin/bash

# Health Check & Server Auto-Restart Script
# Monitors server health every 10 minutes and auto-restarts if unhealthy
# Usage: ./server-health-check.sh

LOG_FILE="./logs/health-check.log"
HEALTH_CHECK_URL="http://localhost:4000/api/health"
RESTART_INTERVAL=600  # 10 minutes in seconds
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=30   # Wait 30 seconds between restart attempts

# Ensure logs directory exists
mkdir -p ./logs

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local message="$1"
  echo "[${timestamp}] ${message}" | tee -a "$LOG_FILE"
}

# Function to check if server is running and healthy
check_server_health() {
  log_message "${BLUE}🔍 Checking server health...${NC}"
  
  # First check if process is running
  if ! pgrep -f "node.*server" > /dev/null; then
    log_message "${RED}❌ Backend process is not running${NC}"
    return 1
  fi
  
  # Check if port 4000 is listening
  if ! lsof -i :4000 > /dev/null 2>&1; then
    log_message "${RED}❌ Port 4000 is not listening${NC}"
    return 1
  fi
  
  # Try health check endpoint (if available)
  local response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" --connect-timeout 3 --max-time 5 2>/dev/null)
  
  if [ "$response" = "200" ]; then
    log_message "${GREEN}✅ Server is healthy (HTTP 200)${NC}"
    return 0
  elif [ -z "$response" ]; then
    # Health endpoint might not exist, but port is listening - server is likely running
    log_message "${YELLOW}⚠️  Health endpoint not responding, but port is listening${NC}"
    return 0
  else
    log_message "${RED}❌ Health check failed (HTTP $response)${NC}"
    return 1
  fi
}

# Function to restart the server
restart_server() {
  local attempt=1
  
  while [ $attempt -le $MAX_RESTART_ATTEMPTS ]; do
    log_message "${YELLOW}🔄 Restarting server (attempt $attempt/$MAX_RESTART_ATTEMPTS)...${NC}"
    
    # Kill existing processes
    pkill -f "node.*server" || true
    sleep 2
    
    # Restart via PM2
    if pm2 restart swar-backend > /dev/null 2>&1; then
      sleep 5
      
      # Verify restart was successful
      if check_server_health; then
        log_message "${GREEN}✅ Server successfully restarted${NC}"
        return 0
      fi
    fi
    
    log_message "${YELLOW}⏳ Waiting ${RESTART_COOLDOWN}s before retry...${NC}"
    sleep $RESTART_COOLDOWN
    attempt=$((attempt + 1))
  done
  
  log_message "${RED}❌ Failed to restart server after $MAX_RESTART_ATTEMPTS attempts${NC}"
  return 1
}

# Function to send alert (can be extended to email, Slack, etc.)
send_alert() {
  local message="$1"
  log_message "${RED}🚨 ALERT: ${message}${NC}"
  
  # Future: Add email notification
  # echo "$message" | mail -s "Swar Yoga Server Alert" admin@example.com
}

# Main monitoring loop
main() {
  log_message "${BLUE}=== Server Health Check Started ===${NC}"
  log_message "Health check interval: ${RESTART_INTERVAL}s (10 minutes)"
  log_message "Max restart attempts: $MAX_RESTART_ATTEMPTS"
  log_message "Restart cooldown: ${RESTART_COOLDOWN}s"
  
  while true; do
    sleep $RESTART_INTERVAL
    
    if ! check_server_health; then
      log_message "${RED}Server health check failed!${NC}"
      
      if ! restart_server; then
        send_alert "Server failed to restart after multiple attempts"
      fi
    else
      log_message "${GREEN}Server health check passed${NC}"
    fi
    
    # Log current stats
    local pid=$(pgrep -f "node.*server" | head -1)
    if [ ! -z "$pid" ]; then
      local memory=$(ps -p $pid -o %mem= | tr -d ' ')
      local cpu=$(ps -p $cpu -o %cpu= | tr -d ' ')
      log_message "📊 Server stats - PID: $pid, Memory: ${memory}%"
    fi
  done
}

# Trap signals for graceful shutdown
trap 'log_message "${BLUE}Health check stopped${NC}"; exit 0' SIGINT SIGTERM

# Start monitoring
main
