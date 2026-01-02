# WhatsApp Bridge VPS Deployment Guide
**For: wa-bridge.swaryoga.com on Your VPS**

---

## 📋 Prerequisites

**VPS Requirements:**
- ✅ SSH access (IP + credentials)
- ✅ Public IP address (static recommended)
- ✅ Docker + Docker Compose installed
- ✅ Nginx installed
- ✅ 1GB RAM minimum (2GB recommended)
- ✅ Outbound internet access (to WhatsApp Web servers)
- ✅ Port 80 & 443 open in firewall

**Domain Setup:**
- ✅ `wa-bridge.swaryoga.com` DNS A record pointing to your VPS IP

---

## 🚀 Step 1: Prepare Your VPS

### 1.1 SSH into your VPS
```bash
ssh -i /path/to/key.pem ubuntu@YOUR_VPS_IP
# or
ssh ubuntu@YOUR_VPS_IP
```

### 1.2 Install Docker + Docker Compose (if not already done)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### 1.3 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
```

### 1.4 Install Certbot (for Let's Encrypt SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 📂 Step 2: Deploy the WhatsApp Bridge

### 2.1 Clone/Copy the Repository
**Option A: Clone the entire repo**
```bash
cd /opt
sudo git clone https://github.com/globalswaryoga-ai/swaryoga.com-db.git swaryoga
cd swaryoga
```

**Option B: Download just the bridge folder** (Faster if you only need the bridge)
```bash
mkdir -p /opt/wa-bridge
cd /opt/wa-bridge
# Download the files manually or use:
# scp -r path/to/deploy/wa-bridge/* ubuntu@VPS_IP:/opt/wa-bridge/
```

### 2.2 Create .env File
```bash
cd /opt/swaryoga/deploy/wa-bridge
# or
cd /opt/wa-bridge

# Copy example env
cp .env.example .env

# Edit with your values
nano .env
```

**Update these in `.env`:**
```bash
# CORS allowlist (your CRM domain)
WHATSAPP_WEB_ALLOWED_ORIGINS="https://swaryoga.com,https://www.swaryoga.com,https://admin.swaryoga.com"

# Optional: if you want inbound messages to go to CRM
NEXT_BASE_URL="https://admin.swaryoga.com"

# Optional: protect the bridge with a secret key (you'll use this in CRM)
WHATSAPP_WEB_BRIDGE_SECRET="your_random_secret_key_here_32_chars_min"

# Session ID (can be any name)
WHATSAPP_CLIENT_ID="crm-whatsapp-session"
```

### 2.3 Build and Start the Bridge
```bash
cd /opt/swaryoga/deploy/wa-bridge
# or
cd /opt/wa-bridge

# Build the Docker image
docker-compose build

# Start the container (detached)
docker-compose up -d

# Check logs
docker-compose logs -f

# Should see output like: "Server running on port 3333"
# Hit Ctrl+C to exit logs
```

### 2.4 Verify Bridge is Running
```bash
# Check container status
docker-compose ps

# Test the health endpoint from inside the VPS
curl http://127.0.0.1:3333/health

# Should return JSON like: {"status":"ok"}
```

---

## 🔒 Step 3: Configure Nginx as Reverse Proxy

### 3.1 Copy Nginx Config
```bash
# Copy the pre-configured Nginx config
sudo cp /opt/swaryoga/deploy/wa-bridge/nginx-wa-bridge.conf /etc/nginx/sites-available/wa-bridge
# or
sudo cp /opt/wa-bridge/nginx-wa-bridge.conf /etc/nginx/sites-available/wa-bridge
```

### 3.2 Enable the Site
```bash
# Symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/wa-bridge /etc/nginx/sites-enabled/wa-bridge

# Test Nginx config
sudo nginx -t

# Should output: "successful"

# Reload Nginx
sudo systemctl reload nginx
```

### 3.3 Verify Nginx is Routing (Before SSL)
```bash
# Test the health endpoint through Nginx (should fail until we add SSL)
curl -H "Host: wa-bridge.swaryoga.com" http://127.0.0.1/health

# Or directly from outside (should show nginx welcome or connection refused)
curl http://wa-bridge.swaryoga.com/health
```

---

## 🔐 Step 4: Issue SSL Certificate

### 4.1 Point DNS to VPS IP First
Make sure your DNS A record points to your VPS IP:
```
wa-bridge.swaryoga.com  A  YOUR_VPS_PUBLIC_IP
```

Wait a few minutes for DNS to propagate. Verify:
```bash
nslookup wa-bridge.swaryoga.com
# Should show your VPS IP
```

### 4.2 Issue Let's Encrypt Certificate
```bash
sudo certbot --nginx -d wa-bridge.swaryoga.com

# Follow prompts:
# - Enter email
# - Agree to ToS
# - Choose redirect option (recommend: 2 = Redirect HTTP to HTTPS)

# Certbot auto-updates Nginx config
sudo systemctl reload nginx
```

### 4.3 Verify SSL
```bash
curl https://wa-bridge.swaryoga.com/health

# Should return: {"status":"ok"}

# Test WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  https://wa-bridge.swaryoga.com/

# Should attempt WebSocket upgrade (200 or 101)
```

---

## 📝 Step 5: Update .env.local on Your Development Machine

Add these to your `.env.local`:
```bash
# WhatsApp Web Bridge (now deployed)
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com

# Optional: if you set a bridge secret in docker-compose
WHATSAPP_WEB_BRIDGE_SECRET=your_random_secret_key_here_32_chars_min
```

**If deploying to Vercel**, add these env vars in Vercel Dashboard:
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
```

---

## ✅ Step 6: Verify Full Stack

### 6.1 Check Bridge Health
```bash
curl https://wa-bridge.swaryoga.com/health
```
**Expected:** `{"status":"ok"}`

### 6.2 Check Bridge Logs
```bash
cd /opt/swaryoga/deploy/wa-bridge
# or
cd /opt/wa-bridge

docker-compose logs --tail 50
```

### 6.3 Test QR Code Page (in CRM)
1. Go to `/admin/crm` (WhatsApp Web QR Setup)
2. Click **"Open QR Login"** button
3. Should load the QR code from `https://wa-bridge.swaryoga.com`
4. Scan with your personal WhatsApp number
5. Should see "Connected" after scan

### 6.4 Test Message Sending
1. From the CRM, send a test message to your WhatsApp
2. Should receive it on your personal WhatsApp

---

## 🛠️ Troubleshooting

### Bridge Container Won't Start
```bash
# Check logs
docker-compose logs -f

# Common issues:
# - Port 3333 already in use: change port in docker-compose.yml
# - Chromium missing: rebuild: docker-compose build --no-cache
# - Memory error: increase VPS RAM or swap
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

### WebSocket Connection Fails
```bash
# Check Nginx config includes ws upgrade
grep -n "Upgrade" /etc/nginx/sites-enabled/wa-bridge

# Should see: Upgrade $http_upgrade;
# And: Connection $http_connection;

# If missing, check nginx-wa-bridge.conf is copied correctly
sudo cat /etc/nginx/sites-available/wa-bridge | grep -A 5 "Upgrade"
```

### CORS Errors in CRM
```bash
# Check CORS allowlist in .env matches your CRM domain
cat /opt/wa-bridge/.env | grep WHATSAPP_WEB_ALLOWED_ORIGINS

# Update if needed:
nano /opt/wa-bridge/.env

# Restart bridge:
docker-compose restart
```

### QR Code Shows But Doesn't Work
```bash
# Check bridge can reach WhatsApp Web servers
docker-compose exec wa-bridge curl -I https://web.whatsapp.com

# If it fails, your VPS may need outbound internet access for HTTPS
# Contact your VPS provider to whitelist WhatsApp
```

---

## 🔄 Maintenance

### Restart Bridge (after config changes)
```bash
cd /opt/wa-bridge
docker-compose restart
```

### View Recent Logs
```bash
cd /opt/wa-bridge
docker-compose logs --tail 100 --follow
```

### Backup WhatsApp Sessions
```bash
# Sessions stored in Docker volumes
# To backup:
docker-compose exec wa-bridge tar -czf - .wwebjs_auth > wa-sessions-backup.tar.gz

# To restore:
cat wa-sessions-backup.tar.gz | docker-compose exec -T wa-bridge tar -xzf -
```

### Stop Bridge (temporarily)
```bash
cd /opt/wa-bridge
docker-compose down
```

### Stop Bridge (remove volumes - will lose WhatsApp sessions!)
```bash
cd /opt/wa-bridge
docker-compose down -v
```

---

## 📞 Support

If you encounter issues:

1. **Check bridge logs:** `docker-compose logs -f`
2. **Check Nginx logs:** `sudo tail -f /var/log/nginx/error.log`
3. **Test connectivity:** `curl https://wa-bridge.swaryoga.com/health`
4. **Test WebSocket:** Use browser DevTools → Network → WS

---

## ✨ What's Next?

✅ **Bridge deployed and running**  
✅ **QR Code page in CRM ready to use**  
✅ **Messages being sent via personal WhatsApp**

**Both pages now available:**
1. **Meta WhatsApp** (`/admin/crm?page=meta`) — Cloud API mode (needs Meta credentials)
2. **Personal WhatsApp** (`/admin/crm?page=whatsapp-web`) — QR mode (active now!)

---

**Created:** Jan 3, 2026  
**Updated:** Comprehensive VPS deployment guide for wa-bridge.swaryoga.com
