# EC2 WhatsApp Bridge Setup Checklist

## Current Status
- **EC2 IP**: `3.80.11.153`
- **Bridge Domain**: `wa-bridge.swaryoga.com`
- **SSH Access**: ❌ CURRENTLY BLOCKED (port 22 timeout)
- **HTTP Bridge**: ❌ NOT RESPONDING
- **Deployment Method**: Need to check what's currently on EC2

---

## What EC2 Instance NEEDS

### 1. **System Requirements**
- [ ] Node.js v18+ installed
- [ ] npm or yarn package manager
- [ ] Chrome/Chromium browser (for WhatsApp Web.js)
- [ ] Git (optional, but helpful)

### 2. **Bridge Code Files** (in `/home/ec2-user/wa-bridge/`)
- [ ] `server.js` - Main bridge server (323 lines)
- [ ] `package.json` - Dependencies definition
- [ ] `.env` - Environment variables configured
- [ ] `node_modules/` - Installed dependencies
- [ ] `.wwebjs_auth/` - WhatsApp session storage (created after first run)

### 3. **Environment Variables** (in `.env` file)
```bash
# Critical variables needed:
WHATSAPP_WEB_ALLOWED_ORIGINS=https://crm.swaryoga.com,https://swaryoga.com,https://www.swaryoga.com
NEXT_BASE_URL=https://crm.swaryoga.com
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_CLIENT_ID=crm-whatsapp-session
PORT=3333
CHROME_PATH=/usr/bin/google-chrome
```

### 4. **Dependencies** (from package.json)
```json
{
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "qrcode": "^1.5.4",
  "whatsapp-web.js": "^1.34.4"
}
```

### 5. **Bridge Process Running**
- [ ] Node server running on port 3333
- [ ] Process manager (pm2, systemd, or docker) keeping it alive
- [ ] Logs accessible for debugging

### 6. **Reverse Proxy** (if using Nginx)
- [ ] Nginx configured to forward `wa-bridge.swaryoga.com` → `localhost:3333`
- [ ] SSL certificate configured
- [ ] CORS headers properly set

---

## What We Need to Check

### Step 1: Access EC2
**Option A: AWS Console**
- Go to EC2 Dashboard
- Find instance with IP `3.80.11.153`
- Check if instance is "running" or "stopped"
- Click "Connect" → "Session Manager" (if available)

**Option B: SSH (when port 22 is open)**
```bash
ssh -i ~/Downloads/wa-bridge-key-2.pem ec2-user@3.80.11.153
```

**Option C: EC2 Instance Connect (if available)**
- Use AWS Console "Connect" button
- Opens browser-based terminal

### Step 2: Once Connected, Run These Checks
```bash
# Check Node.js
node --version
npm --version

# Check if bridge directory exists
ls -la /home/ec2-user/wa-bridge/

# Check if process is running
ps aux | grep "node.*server.js"

# Check listening ports
netstat -tlnp | grep 3333

# Check Chrome/Chromium
which google-chrome
which chromium-browser

# Check logs (if using pm2 or systemd)
pm2 logs
journalctl -u wa-bridge -n 50
```

### Step 3: If Bridge is Missing/Not Running
```bash
# Create directory
mkdir -p /home/ec2-user/wa-bridge

# Copy files from Mac to EC2
# (On your Mac, run this)
scp -i ~/Downloads/wa-bridge-key-2.pem -r deploy/wa-bridge/* ec2-user@3.80.11.153:/home/ec2-user/wa-bridge/

# Then SSH and run
ssh -i ~/Downloads/wa-bridge-key-2.pem ec2-user@3.80.11.153

# Inside EC2:
cd /home/ec2-user/wa-bridge
npm install
node server.js
```

### Step 4: If Bridge Needs to Start Automatically
```bash
# Option A: Using pm2 (recommended)
npm install -g pm2
pm2 start server.js --name wa-bridge
pm2 startup
pm2 save

# Option B: Using systemd
sudo nano /etc/systemd/system/wa-bridge.service
# [Add service config below]
sudo systemctl enable wa-bridge
sudo systemctl start wa-bridge

# Option C: Using Docker
docker-compose up -d
```

### Step 5: Verify Bridge is Working
```bash
# From Mac, test the endpoint
curl -H "x-bridge-secret: swar-bridge-secret-2024" https://wa-bridge.swaryoga.com/status

# Should return QR code status
```

---

## Systemd Service Config (if needed)
```ini
[Unit]
Description=WhatsApp Web Bridge
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/wa-bridge
ExecStart=/usr/bin/node /home/ec2-user/wa-bridge/server.js
Restart=always
RestartSec=10
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="CHROME_PATH=/usr/bin/google-chrome"

[Install]
WantedBy=multi-user.target
```

---

## Files Ready on Your Mac
```
/Users/mohankalburgi/swaryoga.com-db/deploy/wa-bridge/
├── server.js              ✅ Ready
├── package.json          ✅ Ready
├── .env.example          ✅ Ready
├── docker-compose.yml    ✅ Ready
├── nginx-wa-bridge.conf  ✅ Ready
├── start.sh             ✅ Ready
├── deploy.sh            ✅ Ready
└── verify.sh            ✅ Ready
```

---

## Next Steps

**You need to tell me:**
1. Can you access EC2 console / connect via Session Manager?
2. Is the EC2 instance currently running?
3. What do you currently have on `/home/ec2-user/wa-bridge/` ?

**Once you confirm, I can help with:**
- Copying bridge files to EC2
- Installing dependencies
- Starting the bridge process
- Verifying it's working
