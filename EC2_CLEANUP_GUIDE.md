# EC2 Auto-Cleanup System - Monitoring & Manual Commands

## System Overview
- **Script Location**: `/usr/local/bin/ec2-auto-cleanup`
- **Cron Configuration**: `/etc/cron.d/ec2-auto-cleanup`
- **Log File**: `/var/log/ec2-auto-cleanup.log`
- **Schedule**: 0 2 * * * (Daily at 2:00 AM UTC)

## Quick Commands

### Check Current Disk Usage
```bash
df -h /
# Expected: Should be < 85%
```

### Check Available Memory
```bash
free -h
# Should show available memory in Gi/Mi
```

### View Cleanup Logs
```bash
tail -50 /var/log/ec2-auto-cleanup.log

# Or follow in real-time
tail -f /var/log/ec2-auto-cleanup.log
```

### Verify Cron Job is Active
```bash
sudo cat /etc/cron.d/ec2-auto-cleanup

# Check cron logs (recent activity)
sudo journalctl -u cron -n 20

# Or check system logs
grep CRON /var/log/syslog | tail -10
```

### Run Cleanup Manually (Emergency)
```bash
sudo /usr/local/bin/ec2-auto-cleanup
```

---

## What Gets Cleaned

### Daily (when script runs):
1. **npm cache** - Development package manager cache
2. **apt cache** - System package manager cache
3. **Temp files** - `/tmp` and `/var/tmp` (files older than 3 days)
4. **PM2 logs** - Process manager logs (older than 7 days)
5. **System logs** - `/var/log` (files older than 14 days)
6. **Docker** - Unused images, containers (if Docker installed)
7. **Build artifacts** - `.next`, `.cache` directories

### Typical Space Freed Per Run
- **npm cache**: 50-200 MB
- **apt cache**: 100-500 MB
- **temp files**: 10-100 MB
- **logs**: 50-300 MB
- **Total**: 200-1000+ MB per cleanup

---

## Monitoring & Alerts

### Disk Usage Thresholds
- ✅ **Normal**: < 75%
- ⚠️  **Monitor**: 75-85%
- 🚨 **Alert**: > 85% (script will log warning)

### Check Which Directories Use Most Space
```bash
# Top 10 directories by size
sudo du -aSh / 2>/dev/null | sort -rh | head -10

# Focus on home directory
du -aSh /home/ubuntu 2>/dev/null | sort -rh | head -10

# Check Node modules
du -aSh /home/ubuntu/bridge/deploy/wa-bridge/node_modules 2>/dev/null | tail -1
```

### Monitor a Specific Directory
```bash
# Watch bridge directory
du -sh /home/ubuntu/bridge

# Watch build artifacts
du -sh /home/ubuntu/bridge/.next
du -sh /home/ubuntu/bridge/node_modules
```

---

## Troubleshooting

### Issue: Disk Still Filling Up Despite Cleanup
**Solutions**:
1. Check for large log files
   ```bash
   find /home/ubuntu -name "*.log" -size +100M
   ```

2. Check Node modules for duplicate installations
   ```bash
   du -aSh /home/ubuntu/bridge/node_modules | sort -rh | head -20
   ```

3. Check Docker images (if installed)
   ```bash
   docker images --size | sort -k7 -hr
   ```

4. Increase cleanup frequency (edit cron)
   ```bash
   # Change from daily to twice daily
   sudo nano /etc/cron.d/ec2-auto-cleanup
   # Change "0 2 * * *" to "0 2,14 * * *" (2 AM and 2 PM)
   ```

### Issue: Cleanup Script Doesn't Run
**Check**:
1. Cron is enabled
   ```bash
   sudo service cron status
   ```

2. Script has correct permissions
   ```bash
   ls -l /usr/local/bin/ec2-auto-cleanup
   # Should show: -rwxr-xr-x
   ```

3. Check cron error logs
   ```bash
   sudo journalctl -u cron --since="2 hours ago"
   ```

### Issue: Permission Denied
**Solution**:
```bash
sudo chmod +x /usr/local/bin/ec2-auto-cleanup
```

---

## Advanced: Custom Cleanup

### Add Custom Cleanup Location
Edit the script and add before the final log:
```bash
# Example: Add custom directory cleanup
find /home/ubuntu/bridge/your-directory -name "*.tmp" -delete
echo "  ✓ Custom directory cleaned" >> "$LOG_FILE"
```

### Modify Cleanup Frequency
```bash
# Edit cron configuration
sudo nano /etc/cron.d/ec2-auto-cleanup

# Examples:
# 0 2 * * *        = Daily at 2:00 AM
# 0 */6 * * *      = Every 6 hours
# 0 2,14 * * *     = Twice daily (2 AM, 2 PM)
# */30 * * * *     = Every 30 minutes
```

### Add Email Alerts on High Disk Usage
```bash
# Add to cron configuration
0 * * * * [ $(df / | tail -1 | awk '{print $5}' | sed 's/%//') -gt 85 ] && mail -s "EC2 Disk Alert" admin@email.com < /var/log/ec2-auto-cleanup.log
```

---

## Performance Impact

### Cleanup Duration
- **Typical run time**: 2-5 minutes
- **Off-peak time**: Scheduled at 2:00 AM to minimize impact

### Resource Usage
- **CPU**: Low (file operations)
- **Memory**: Minimal
- **Disk I/O**: Medium during cleanup

---

## Best Practices

1. **Monitor Regularly**
   - Check logs weekly
   - Review disk usage trend
   - Set calendar reminder to check monthly

2. **Prevent Bloat**
   - Don't store large files in `/home/ubuntu`
   - Use external storage (S3, EBS) for backups
   - Keep build artifacts minimal

3. **Update Script**
   - Review cleanup script quarterly
   - Add new directories as project grows
   - Adjust retention periods as needed

4. **Document Changes**
   - Keep track of any modifications
   - Test manual cleanup before relying on cron
   - Keep backup of original script

---

## Emergency: Force Immediate Large Cleanup
```bash
# CAUTION: This removes more aggressively
sudo sh -c '
  apt-get clean
  apt-get autoclean
  apt-get autoremove -y
  npm cache clean --force
  find /tmp -type f -delete
  find /var/tmp -type f -delete
  find /var/log -name "*.log" -delete
  df -h /
'
```

---

## Support Commands

### Get System Info
```bash
uname -a
df -h
free -h
ps aux | grep -E "node|npm|pm2"
```

### Check Port Usage
```bash
lsof -i :3333  # WhatsApp bridge
lsof -i :3000  # Next.js app (if running)
```

### View Running Processes
```bash
pm2 list
pm2 status
```
