#!/bin/bash
# EC2 Auto-cleanup Script - Modern System for Freeing Disk Space
# Removes cache, temp files, and old build artifacts
# Schedule: Run daily via cron (e.g., 2:00 AM)
# Setup: Copy to /usr/local/bin/ec2-auto-cleanup and add cron: 0 2 * * * /usr/local/bin/ec2-auto-cleanup

LOG_FILE="/var/log/ec2-auto-cleanup.log"

# Log function
log_action() {
    local TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log_action "=== EC2 Auto Cleanup Started ==="

# 1. Clean npm cache
log_action "Cleaning npm cache..."
NPM_SPACE=$(du -sh ~/.npm 2>/dev/null | cut -f1 || echo "0")
npm cache clean --force 2>/dev/null
log_action "  ✓ Removed npm cache: $NPM_SPACE"

# 2. Clean Node.js package manager cache (yarn)
if command -v yarn &> /dev/null; then
    log_action "Cleaning yarn cache..."
    YARN_SPACE=$(du -sh ~/.cache/yarn 2>/dev/null | cut -f1 || echo "0")
    yarn cache clean 2>/dev/null
    log_action "  ✓ Removed yarn cache: $YARN_SPACE"
fi

# 3. Remove old PM2 logs (keep last 7 days)
if command -v pm2 &> /dev/null; then
    log_action "Cleaning PM2 old logs..."
    find ~/.pm2/logs -name "*.log" -mtime +7 -delete 2>/dev/null
    log_action "  ✓ Removed PM2 logs older than 7 days"
fi

# 4. Clean system temp files (keep last 3 days)
log_action "Cleaning system temp files..."
BEFORE_TMP=$(du -sh /tmp 2>/dev/null | cut -f1 || echo "0")
find /tmp -type f -atime +3 -delete 2>/dev/null
find /var/tmp -type f -atime +3 -delete 2>/dev/null
AFTER_TMP=$(du -sh /tmp 2>/dev/null | cut -f1 || echo "0")
log_action "  ✓ /tmp before: $BEFORE_TMP, after: $AFTER_TMP"

# 5. Clean apt cache
log_action "Cleaning apt cache..."
apt-get clean 2>/dev/null
apt-get autoclean 2>/dev/null
apt-get autoremove -y 2>/dev/null >/dev/null
log_action "  ✓ Cleaned apt cache and removed unused packages"

# 6. Clean Docker system (if installed)
if command -v docker &> /dev/null; then
    log_action "Cleaning Docker..."
    docker system prune -f 2>/dev/null >/dev/null
    log_action "  ✓ Cleaned Docker images, containers, and volumes"
fi

# 7. Clean Node/Next.js build artifacts
log_action "Cleaning Next.js and Node.js build artifacts..."
if [ -d "/home/ubuntu/bridge/.next" ]; then
    RM_SIZE=$(du -sh /home/ubuntu/bridge/.next 2>/dev/null | cut -f1 || echo "0")
    rm -rf /home/ubuntu/bridge/.next
    log_action "  ✓ Removed .next build: $RM_SIZE"
fi

# Clean node_modules temporary build cache
find /home/ubuntu/bridge -name ".cache" -type d -exec rm -rf {} + 2>/dev/null
log_action "  ✓ Removed build caches"

# 8. Clean old log files (keep 14 days)
log_action "Cleaning old log files..."
find /var/log -name "*.log" -type f -mtime +14 -exec rm -f {} \; 2>/dev/null
find /home/ubuntu -name "*.log" -type f -mtime +14 -exec rm -f {} \; 2>/dev/null
log_action "  ✓ Removed log files older than 14 days"

# 9. Show disk space stats
log_action "=== Disk Space Report ==="
DISK_USAGE=$(df -h / | tail -1)
log_action "Root partition: $DISK_USAGE"

DISK_PERCENT=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
log_action "Disk Usage: ${DISK_PERCENT}%"

# Alert if disk is above 85%
if [ "${DISK_PERCENT}" -gt 85 ]; then
    log_action "⚠️  WARNING: Disk usage is above 85% - Manual intervention may be needed"
fi

# Show memory usage
FREE_MEM=$(free -h | grep Mem | awk '{print $7}')
log_action "Available Memory: $FREE_MEM"

log_action "=== EC2 Auto Cleanup Completed Successfully ==="
log_action ""

exit 0
