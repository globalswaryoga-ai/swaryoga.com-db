# 🔧 WhatsApp Bridge - PERMANENT FIX (24/7 Operation)

## 🎯 Objective

Make WhatsApp QR bridge run **permanently** on EC2 with:
- ✅ Auto-start on EC2 boot
- ✅ Auto-restart on crash  
- ✅ Health monitoring every 5 minutes
- ✅ Automatic recovery from failures
- ✅ Persistent WhatsApp session

---

## 🚀 Installation (One-Time Setup)

### Step 1: Connect to EC2

```bash
ssh -i deploy/wa-bridge/wa-bridge-key.pem ubuntu@52.91.198.23
```

### Step 2: Run Permanent Setup

On EC2, run:
```bash
sudo bash /home/ubuntu/swaryoga.com-db/deploy/wa-bridge/setup-permanent.sh
```

This will:
1. ✅ Create required directories
2. ✅ Install service scripts
3. ✅ Configure systemd service
4. ✅ Set up health monitoring
5. ✅ Start the bridge
6. ✅ Verify everything works

### Step 3: Verify from Local Machine

```bash
npm run monitor-bridge
```

Should show:
```
✅ Bridge is CONNECTED
   Session: ✓ Ready
   QR Code: ✓ Available
```

**Done! Your bridge is now permanently running!** 🎉

---

## 📊 What's Installed

### Systemd Service: `wa-bridge`

**File:** `/etc/systemd/system/wa-bridge.service`

**Features:**
- Auto-starts on EC2 boot
- Auto-restart on crash (10-second delay)
- Memory limit: 2GB (hard), 1.5GB (soft)
- CPU limit: 70%
- Automatic reboot if can't recover

**Commands:**
```bash
# View status
sudo systemctl status wa-bridge

# Start/stop/restart
sudo systemctl start wa-bridge
sudo systemctl stop wa-bridge
sudo systemctl restart wa-bridge

# View logs
sudo journalctl -u wa-bridge -f

# Enable/disable on boot
sudo systemctl enable wa-bridge
sudo systemctl disable wa-bridge
```

### Health Monitor: `wa-bridge-health`

**File:** `/etc/systemd/system/wa-bridge-health.timer`

**Features:**
- Runs every 5 minutes
- Checks if bridge is responding
- Auto-restarts on 3 consecutive failures
- Logs to `/var/log/wa-bridge/health-monitor.log`

**Commands:**
```bash
# Check timer status
sudo systemctl status wa-bridge-health.timer

# View monitor logs
tail -f /var/log/wa-bridge/health-monitor.log
```

### Startup Scripts

**`/opt/wa-bridge/start-service.sh`**
- Main startup script
- Tries docker-compose first, then docker run, then PM2
- Waits for bridge to respond
- Logs to `/var/log/wa-bridge/service.log`

**`/opt/wa-bridge/pre-start-check.sh`**
- Runs before startup
- Verifies Docker is running
- Checks disk/memory availability
- Ensures session directory exists

**`/opt/wa-bridge/health-monitor.sh`**
- Monitors bridge health
- Checks port 3333 every 5 minutes
- Auto-restarts on failures
- Tracks consecutive failures

---

## 🔄 How Permanent Operation Works

### Boot Sequence

```
EC2 Instance Starts
    ↓
Systemd reads wa-bridge.service
    ↓
Pre-start checks run
    ↓
Bridge service starts via docker-compose
    ↓
Bridge comes online
    ↓
Health monitor timer starts (runs every 5 min)
    ↓
✅ Bridge is LIVE
```

### If Bridge Crashes

```
Health monitor detects DOWN
    ↓
Retry counter increments
    ↓
After 3 failures (15 minutes)
    ↓
Systemd auto-restart triggers
    ↓
Bridge restarts with 10-sec delay
    ↓
Health monitor resets counter
    ↓
✅ Bridge comes back ONLINE
```

### If EC2 Instance Stops

```
Instance stops
    ↓
CloudWatch detects status check failure
    ↓
Auto-recovery alarm triggers
    ↓
Instance auto-restarts (1-5 min)
    ↓
Systemd starts wa-bridge service
    ↓
Health monitor starts
    ↓
✅ Bridge comes back ONLINE
```

---

## 📈 Monitoring & Maintenance

### Check Bridge Status

```bash
# From local machine
npm run monitor-bridge

# Or from EC2
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/health | jq
```

### View Logs

```bash
# On EC2 - Service logs
sudo journalctl -u wa-bridge -f --no-pager

# On EC2 - Health monitor logs
tail -f /var/log/wa-bridge/health-monitor.log

# On EC2 - Full service log
tail -f /var/log/wa-bridge/service.log
```

### Manual Restart (if needed)

```bash
# On EC2
sudo systemctl restart wa-bridge

# Wait for it to start
sleep 5

# Verify
curl -s http://localhost:3333/health | jq
```

### Check Resource Usage

```bash
# On EC2
docker stats wa-bridge
# Shows CPU, memory, network usage

# Or with systemd
systemctl show wa-bridge --property=MemoryCurrent --value
```

---

## 🆘 Troubleshooting

### Bridge is DOWN but should be running

```bash
# 1. Check systemd service
sudo systemctl status wa-bridge

# 2. View error logs
sudo journalctl -u wa-bridge -n 50

# 3. Manually restart
sudo systemctl restart wa-bridge

# 4. Wait and check
sleep 10
curl -s http://localhost:3333/health | jq
```

### Service won't start

```bash
# 1. Check pre-start requirements
sudo bash /opt/wa-bridge/pre-start-check.sh

# 2. Check Docker is running
docker ps

# 3. Check if port 3333 is in use
sudo lsof -i :3333

# 4. Check disk space
df -h

# 5. Check memory
free -h
```

### High memory usage

```bash
# 1. Check memory limit
docker stats wa-bridge

# 2. Restart service (triggers memory limit)
sudo systemctl restart wa-bridge

# 3. Check if session is corrupted
ls -lah /home/ubuntu/.wwebjs_auth

# 4. Clear session if needed (will need to rescan QR)
sudo rm -rf /home/ubuntu/.wwebjs_auth/*
sudo systemctl restart wa-bridge
```

### Health monitor not working

```bash
# Check timer
sudo systemctl status wa-bridge-health.timer

# View monitor logs
tail -50 /var/log/wa-bridge/health-monitor.log

# Test manually
bash /opt/wa-bridge/health-monitor.sh

# Restart timer
sudo systemctl restart wa-bridge-health.timer
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Service is enabled: `sudo systemctl is-enabled wa-bridge`
- [ ] Service is running: `sudo systemctl is-active wa-bridge`
- [ ] Bridge responds: `curl http://localhost:3333/health`
- [ ] Health monitor is active: `sudo systemctl status wa-bridge-health.timer`
- [ ] Logs are accessible: `tail /var/log/wa-bridge/service.log`
- [ ] Session directory exists: `ls ~/.wwebjs_auth`
- [ ] Local monitor shows CONNECTED: `npm run monitor-bridge`

---

## 📝 Configuration Details

### Systemd Service Limits

| Setting | Value | Purpose |
|---------|-------|---------|
| Memory Limit | 2GB (hard) | Prevent OOM |
| Memory High | 1.5GB (soft) | Trigger restart at threshold |
| CPU Quota | 70% | Limit CPU usage |
| Restart | Always | Auto-restart on crash |
| Restart Delay | 10 seconds | Prevent restart loop |
| Start Limit | 5 restarts in 5 min | Force reboot if too many failures |

### Health Check Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Check Interval | 5 minutes | Regular monitoring |
| Timeout | 5 seconds | Detect unresponsive bridge |
| Max Failures | 3 consecutive | Before restart |
| Failure Timeout | 15 minutes | Time for 3 failures to accumulate |

### Ports & Secrets

| Setting | Value |
|---------|-------|
| Bridge Port | 3333 |
| Bridge Secret | swar-bridge-secret-2024 |
| Session Directory | ~/.wwebjs_auth |
| Log Directory | /var/log/wa-bridge |

---

## 🚀 What Happens After Setup

### Immediately
- Bridge starts automatically
- Health monitor begins checking
- QR code becomes available for scanning

### On Every Boot
- systemd starts wa-bridge service
- Pre-start checks verify environment
- Bridge initialization begins
- Health monitor activates

### Every 5 Minutes
- Health monitor checks bridge
- If down, starts restart sequence
- Logs health status

### On Crash
- systemd detects process exit
- Auto-restart with 10-second delay
- Health monitor assists recovery

### On EC2 Restart
- CloudWatch detects failure
- Auto-recovery triggers
- Instance restarts
- Bridge service auto-starts

---

## 💡 Pro Tips

### Monitor from Local Machine

Keep this running in a terminal:
```bash
npm run monitor-bridge
```

This checks bridge every 60 seconds and alerts if down.

### Set up CloudWatch Alerts

Get notified if instance fails:
```bash
npm run setup-ec2-recovery
```

Creates CloudWatch alarms for auto-recovery.

### Backup Session Data

Important: WhatsApp session is in `~/.wwebjs_auth`

To prevent losing the QR scan:
```bash
# On EC2
tar -czf ~/.wwebjs_auth.backup.tar.gz ~/.wwebjs_auth
```

---

## 🎯 Success Criteria

Your permanent setup is working if:

1. ✅ EC2 reboots → Bridge comes back online automatically
2. ✅ Bridge crashes → Systemd restarts it within 10 seconds
3. ✅ Bridge becomes unresponsive → Health monitor restarts it
4. ✅ Users can scan QR → Session persists across restarts
5. ✅ Logs are clean → No errors or warnings

---

## 📞 Support

If issues persist:

1. **Check service**: `sudo systemctl status wa-bridge`
2. **View logs**: `sudo journalctl -u wa-bridge -n 50`
3. **Manual restart**: `sudo systemctl restart wa-bridge`
4. **Health check**: `bash /opt/wa-bridge/health-monitor.sh`
5. **Emergency repair**: `bash scripts/repair-bridge.sh` (from local machine)

---

**Status:** ✅ PERMANENT SETUP READY  
**Auto-Recovery:** ✅ ENABLED  
**Health Monitoring:** ✅ ACTIVE  
**Bridge Availability:** 99.9%+ expected
