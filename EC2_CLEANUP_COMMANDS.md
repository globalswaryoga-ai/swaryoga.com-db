# EC2 Cleanup Commands - Run These Now on EC2

## Run these commands in order on your EC2 SSH session:

```bash
# 1. Check current disk space
echo "=== BEFORE ==="
df -h /

# 2. Clean npm cache
npm cache clean --force

# 3. Clean apt cache  
sudo apt-get clean
sudo apt-get autoclean

# 4. Remove old log files
sudo rm -rf /var/log/*.log /var/log/*/*.log

# 5. Check freed space
echo -e "\n=== AFTER ==="
df -h /

# 6. Verify wa-bridge directory
ls -la /home/ubuntu/ | grep wa-bridge

# 7. List contents if it exists
ls -la /home/ubuntu/wa-bridge/ 2>/dev/null || echo "Directory empty or not ready"
```

---

## After cleanup, run:

```bash
cd /home/ubuntu/wa-bridge
npm install
```

---

## If disk is still full:

```bash
# Find what's taking space
du -sh /home/ubuntu/* | sort -rh
du -sh /var/* | sort -rh
du -sh /opt/* 2>/dev/null | sort -rh

# Remove old node_modules if they exist
sudo find /home -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null
```

---

## Copy-paste friendly commands:

```bash
npm cache clean --force && sudo apt-get clean && sudo apt-get autoclean && sudo rm -rf /var/log/*.log /var/log/*/*.log && df -h /
```

This runs all cleanup in one go.
