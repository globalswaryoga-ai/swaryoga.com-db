# EC2 CRITICAL DISK SPACE RECOVERY - NUCLEAR OPTIONS

## The disk is 100% full. Use these aggressive deletion commands:

### Step 1: Delete everything in temp directories
```bash
sudo rm -rf /tmp/* /var/tmp/* /var/cache/*
```

### Step 2: Delete old logs (safe to delete)
```bash
sudo rm -rf /var/log/*.log
sudo rm -rf /var/log/*/*.log  
sudo rm -rf /var/log/*/*/*.log
sudo find /var/log -type f -delete 2>/dev/null
```

### Step 3: Find and show largest files/dirs
```bash
du -sh /* 2>/dev/null | sort -rh | head -15
```

### Step 4: If swap exists, delete it (gains 2GB)
```bash
sudo swapoff -a 2>/dev/null
sudo rm -f /swapfile
```

### Step 5: Delete Docker/container data if not needed
```bash
sudo rm -rf /var/lib/docker/* 2>/dev/null
sudo rm -rf /var/lib/containerd/* 2>/dev/null
```

### Step 6: Delete snap cache
```bash
sudo rm -rf /var/lib/snapd/* 2>/dev/null
sudo rm -rf /snap/* 2>/dev/null
```

### Step 7: Check space again
```bash
df -h /
```

### Step 8: List home directory sizes
```bash
du -sh /home/* 2>/dev/null | sort -rh
```

### Step 9: If home is huge, find large files
```bash
find /home -type f -size +100M 2>/dev/null -exec ls -lh {} \;
```

### Step 10: Check if wa-bridge directory exists and has files
```bash
ls -lah /home/ubuntu/wa-bridge/ 2>/dev/null || echo "Directory empty or doesn't exist"
```

---

## After getting space, verify:

```bash
df -h /
```

You should have at least 500MB free.

---

## If you still can't get space:

The instance might be too small (6.8GB total is tiny). You may need to:
1. Stop the instance
2. Expand the root volume in AWS (add more GB)
3. Reboot
4. Then run cleanup again

OR create a new larger EC2 instance.

---

## Once you have space (500MB+), tell me:

1. Current disk space: `df -h /`
2. What's in wa-bridge: `ls -la /home/ubuntu/wa-bridge/`
3. Then we'll `npm install` and start the bridge
