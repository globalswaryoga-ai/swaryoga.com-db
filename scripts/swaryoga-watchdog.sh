#!/bin/bash
# ==============================================================================
# Swar Yoga VPS Self-Healing & Auto-Repair Watchdog
# Monitors swaryoga.com Next.js production server on Contabo VPS
# Automatically heals and restores PM2 if down, unresponsive, or CSS fails.
# ==============================================================================

LOG_FILE="/var/log/swaryoga-watchdog.log"
APP_DIR="/var/www/swaryoga"
PORT=3000
SITE_URL="http://127.0.0.1:${PORT}"
PUBLIC_URL="https://swaryoga.com"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 1. Check if PM2 swaryoga process is online using node for robust JSON parsing
PM2_STATUS=$(node -e '
  try {
    const { execSync } = require("child_process");
    const list = JSON.parse(execSync("pm2 jlist").toString());
    const proc = list.find(p => p.name === "swaryoga");
    process.stdout.write(proc && proc.pm2_env ? proc.pm2_env.status : "unknown");
  } catch (e) {
    process.stdout.write("error");
  }
' 2>/dev/null)

if [ "$PM2_STATUS" != "online" ]; then
  log "⚠️ PM2 process 'swaryoga' status is '$PM2_STATUS'. Attempting restart..."
  cd "$APP_DIR" && pm2 restart swaryoga >> "$LOG_FILE" 2>&1
  sleep 4
fi

# 2. Check local HTTP port response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 6 "${SITE_URL}/")

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "304" ]; then
  log "⚠️ Local health check returned HTTP $HTTP_CODE. Reloading swaryoga..."
  cd "$APP_DIR" && pm2 reload swaryoga >> "$LOG_FILE" 2>&1
  sleep 4
  HTTP_RETRY=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "${SITE_URL}/")
  if [ "$HTTP_RETRY" = "200" ]; then
    log "✅ Auto-repair successful! Site restored to HTTP 200."
  else
    log "🚨 Failed to restore on reload. Trying full restart..."
    cd "$APP_DIR" && pm2 restart swaryoga >> "$LOG_FILE" 2>&1
  fi
fi

# 3. Check public stylesheet response to ensure CSS is never 404 / broken
CSS_PATH=$(curl -s --max-time 5 "${SITE_URL}/" | grep -o '/_next/static/css/[^" ]*\.css' | head -n 1)
if [ -n "$CSS_PATH" ]; then
  CSS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${SITE_URL}${CSS_PATH}")
  if [ "$CSS_CODE" = "404" ] || [ "$CSS_CODE" = "400" ]; then
    log "⚠️ CSS asset $CSS_PATH returned $CSS_CODE. Triggering reload to sync bundles..."
    cd "$APP_DIR" && pm2 reload swaryoga >> "$LOG_FILE" 2>&1
  fi
fi
