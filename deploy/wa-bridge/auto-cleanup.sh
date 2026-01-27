#!/bin/bash
# Swar Yoga Bridge Auto-Cleanup System v2.0
# Runs every 6 hours to keep disk clean

LOG="/home/ubuntu/cleanup.log"

log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S'): $1" >> "$LOG"
}

FREE_MB=$(df -m / | tail -1 | awk '{print $4}')
USED_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

log "=== Cleanup Check: ${FREE_MB}MB free (${USED_PCT}% used) ==="

# Always clean these (safe)
pm2 flush 2>/dev/null
log "PM2 logs flushed"

# Clean journal (keep 50MB)
sudo journalctl --vacuum-size=50M 2>/dev/null
log "Journal cleaned"

# If disk usage > 50%, do deeper cleaning
if [ "$USED_PCT" -gt 50 ]; then
    log "Deep cleaning (usage > 50%)..."
    
    # Clean apt cache
    sudo apt-get clean 2>/dev/null
    sudo apt-get autoremove -y 2>/dev/null
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null
    
    # Clean old snap versions (keeps only current)
    sudo snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision" 2>/dev/null
        log "Removed old snap: $snapname rev $revision"
    done
    
    # Clean snap cache
    sudo rm -rf /var/lib/snapd/cache/* 2>/dev/null
    
    # Clean /tmp (files older than 1 day)
    sudo find /tmp -type f -atime +1 -delete 2>/dev/null
    
    # Clean old log files
    sudo find /var/log -type f -name '*.gz' -delete 2>/dev/null
    sudo find /var/log -type f -name '*.[0-9]' -delete 2>/dev/null
    sudo find /var/log -type f -name '*.old' -delete 2>/dev/null
    
    # Truncate large logs (> 10MB)
    for logfile in /var/log/syslog /var/log/auth.log /var/log/kern.log; do
        if [ -f "$logfile" ]; then
            SIZE=$(stat -c%s "$logfile" 2>/dev/null || echo 0)
            if [ "$SIZE" -gt 10485760 ]; then
                sudo truncate -s 1M "$logfile" 2>/dev/null
                log "Truncated $logfile"
            fi
        fi
    done
    
    # Clean Chrome crash dumps
    rm -rf /home/ubuntu/.config/chromium/Crash\ Reports/* 2>/dev/null
    rm -rf /tmp/.org.chromium.* 2>/dev/null
    rm -rf /tmp/puppeteer_dev_* 2>/dev/null
    
    # Clean WhatsApp session cache (but not auth!)
    find /home/ubuntu/.wwebjs_auth -name '*.tmp' -delete 2>/dev/null
    find /home/ubuntu/.wwebjs_auth -name 'Cache' -type d -exec rm -rf {} + 2>/dev/null
    find /home/ubuntu/.wwebjs_auth -name 'Code Cache' -type d -exec rm -rf {} + 2>/dev/null
    
    log "Deep cleaning complete"
fi

# Keep cleanup log small (last 500 lines)
if [ -f "$LOG" ]; then
    LINES=$(wc -l < "$LOG")
    if [ "$LINES" -gt 500 ]; then
        tail -200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
    fi
fi

NEW_FREE=$(df -m / | tail -1 | awk '{print $4}')
log "Cleanup done: ${FREE_MB}MB -> ${NEW_FREE}MB (freed $((NEW_FREE - FREE_MB))MB)"
