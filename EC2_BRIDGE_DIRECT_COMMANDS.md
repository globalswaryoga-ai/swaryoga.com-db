# EC2 Bridge Restart - Direct Commands

## Quick Start (Copy & Paste These Commands)

### Step 1: SSH to EC2
```bash
ssh -i your-key.pem ec2-user@52.91.198.23
```

### Step 2: Stop Existing Service

```bash
# Kill any process on port 3333
sudo lsof -ti:3333 | xargs sudo kill -9 2>/dev/null || true

# Stop Docker container if running
docker ps | grep whatsapp && docker stop $(docker ps | grep whatsapp | awk '{print $1}') || true

# Stop PM2 process if running
pm2 stop bridge 2>/dev/null || true
pm2 delete bridge 2>/dev/null || true

# Wait
sleep 2
```

### Step 3: Navigate to Bridge Directory

```bash
# Find the bridge location (usually one of these)
cd ~/deploy/wa-bridge
# OR
cd /opt/deploy/wa-bridge
# OR
cd /home/ec2-user/swaryoga.com-db/deploy/wa-bridge
```

**Verify you're in the right place:**
```bash
ls -la server.js  # Should show the file exists
```

### Step 4A: Start with Docker (Preferred)

```bash
# Clean up old containers
docker-compose down 2>/dev/null || true
sleep 2

# Start fresh
docker-compose up -d

# Check logs
docker logs -f $(docker ps | grep whatsapp | awk '{print $1}')
```

### Step 4B: Start with PM2 (Alternative)

```bash
# Install dependencies
npm install --production

# Start the bridge
pm2 start server.js --name bridge --env production
pm2 save

# Monitor logs
pm2 logs bridge
```

### Step 5: Test It Works (On EC2)

```bash
# Test /health endpoint
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/health

# Should return:
# {"ok": true, "port": 3333}
```

### Step 6: Test from Your Mac

```bash
# Exit EC2 first (Ctrl+D or type exit)
exit

# Then run from your Mac
cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
./test-bridge-health.sh http://52.91.198.23:3333 swar-bridge-secret-2024

# All tests should show ✅
```

---

## Troubleshooting

### Check if bridge is running
```bash
docker ps  # for Docker
# or
pm2 list   # for PM2
```

### View logs
```bash
# Docker
docker logs -f $(docker ps | grep whatsapp | awk '{print $1}')

# PM2
pm2 logs bridge
```

### Check port 3333
```bash
sudo netstat -tlnp | grep 3333
# or
sudo lsof -i :3333
```

### Restart Everything
```bash
# Nuclear option - kill everything
sudo killall node
docker-compose down
pm2 kill

# Wait and restart
sleep 5
docker-compose up -d  # or pm2 start server.js --name bridge
```

### Check environment variables
```bash
env | grep WHATSAPP
# Should see:
# WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
# WHATSAPP_BRIDGE_HTTP_URL=http://52.91.198.23:3333
```

---

## Success Criteria

After restart, verify:

✅ `/health` returns `{"ok": true, "port": 3333}`
✅ `/chats` returns chat list with status 200
✅ `/status` returns connection status
✅ `/qr` returns QR code if not connected
✅ No "Cannot GET" errors
✅ No 404 responses

---

## If It Still Fails

1. **Check auth session**: `.wwebjs_auth` directory may be corrupted
   ```bash
   rm -rf /tmp/.wwebjs_auth
   # Will need to scan QR code again
   ```

2. **Check disk space**: WhatsApp cache needs space
   ```bash
   df -h
   ```

3. **Check memory**: Browser automation is memory-intensive
   ```bash
   free -h
   ```

4. **Reinstall dependencies**: Bridge code may need updates
   ```bash
   cd deploy/wa-bridge
   npm install  # not --production, full install
   npm start
   ```

---

## After Restart

1. **From your Mac**: Run `./test-bridge-health.sh`
2. **In Browser**: Refresh QR page - should load chats
3. **Send Test Message**: From QR interface
4. **Verify**: Message appears immediately (not in cache)

---

## Keep Bridge Running

To prevent it from stopping again:

**Option 1: Docker Auto-Restart**
```bash
# Edit docker-compose.yml
restart_policy:
  condition: unless-stopped
```

**Option 2: PM2 Startup**
```bash
pm2 startup
pm2 save
```

**Option 3: Monitor with Watchdog**
```bash
# See bridge-watchdog.js in repo
node bridge-watchdog.js &
```

