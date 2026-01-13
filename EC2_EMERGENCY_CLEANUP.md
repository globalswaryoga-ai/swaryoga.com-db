# EC2 Emergency Disk Space Recovery

Run these commands on EC2 in this exact order:

## Step 1: Remove the npm logs directory (it's taking space)
```bash
sudo rm -rf /home/ubuntu/.npm/_logs
sudo rm -rf ~/.npm
```

## Step 2: Check what's using all the disk space
```bash
du -sh /* 2>/dev/null | sort -rh | head -10
```

## Step 3: Common culprits - remove them
```bash
# Remove snap cache
sudo rm -rf /var/lib/snapd/snaps/*

# Remove old packages
sudo apt-get remove -y --purge snapd

# Remove temporary files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Remove Docker data (if not needed)
sudo docker system prune -af 2>/dev/null || true

# Clean journal logs
sudo journalctl --vacuum=50M 2>/dev/null || sudo journalctl --vacuum=time:1d

# Remove all log files
sudo find /var/log -type f -name "*.log" -delete
sudo find /var/log -type f -name "*.1" -delete
sudo find /var/log -type f -name "*.gz" -delete
```

## Step 4: Check space freed
```bash
df -h /
```

## Step 5: If still full, check for old node_modules
```bash
du -sh /home/ubuntu/* 2>/dev/null | sort -rh
find /home/ubuntu -name "node_modules" -type d -exec du -sh {} \; 2>/dev/null | sort -rh
```

## Step 6: Remove old node_modules
```bash
sudo find /home/ubuntu -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null
sudo find /root -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null
```

---

## Nuclear Option (if STILL full):
```bash
# Disable all swap
sudo swapoff -a

# Remove swap file
sudo rm -f /swapfile

# This gives you back ~2GB immediately
```

Then check:
```bash
df -h /
free -h
```

---

## After getting space, verify files exist:
```bash
ls -la /home/ubuntu/wa-bridge/
```

If directory is empty, we'll copy files from your Mac.
