#!/bin/bash
# =============================================================================
# DISK AUTO-CLEAN - Triggers cleanup when disk usage reaches 50%
# Run as background daemon or via cron every 5 minutes
# =============================================================================

THRESHOLD=50
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/auto-cleanup.sh"
LOG_FILE="$HOME/disk-auto-clean.log"

# Get current disk usage percentage
USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

# Log timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if above threshold
if [ "$USAGE" -ge "$THRESHOLD" ]; then
    log "⚠️ Disk at ${USAGE}% (threshold: ${THRESHOLD}%) - Starting cleanup..."
    
    # Run cleanup
    if [ -x "$CLEANUP_SCRIPT" ]; then
        "$CLEANUP_SCRIPT" >> "$LOG_FILE" 2>&1
        
        # Check new usage
        NEW_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
        FREED=$((USAGE - NEW_USAGE))
        log "✅ Cleanup complete. Usage: ${NEW_USAGE}% (freed ${FREED}%)"
    else
        log "❌ Cleanup script not found: $CLEANUP_SCRIPT"
    fi
else
    # Only log every hour to avoid spam (check if last log was recent)
    LAST_OK=$(grep "Disk OK" "$LOG_FILE" 2>/dev/null | tail -1 | cut -d']' -f1 | tr -d '[')
    if [ -z "$LAST_OK" ] || [ $(($(date +%s) - $(date -j -f "%Y-%m-%d %H:%M:%S" "$LAST_OK" +%s 2>/dev/null || echo 0))) -gt 3600 ]; then
        log "✓ Disk OK at ${USAGE}%"
    fi
fi
