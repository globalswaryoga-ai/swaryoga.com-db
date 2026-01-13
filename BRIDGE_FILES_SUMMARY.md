# 🌉 Bridge Files Summary

## Location
```
/Users/mohankalburgi/swaryoga.com-db/deploy/wa-bridge/
```

## Files Overview

### 1. **server.js** (Main Bridge Server)
- Runs WhatsApp Web.js client
- Listens on port 3333
- Exposes REST API endpoints
- Requires authentication via `x-bridge-secret` header
- Manages QR code generation
- Stores WhatsApp session in `.wwebjs_auth/` directory

**Key Endpoints**:
- `GET /status` - Bridge status & QR code
- `GET /health` - Health check
- `POST /send-message` - Send WhatsApp message
- `GET /chats` - List all chats

### 2. **package.json** (Dependencies)
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "qrcode": "^1.5.4",
    "whatsapp-web.js": "^1.34.4"
  }
}
```

### 3. **docker-compose.yml** (Docker Deployment)
- Builds from `services/whatsapp-web/Dockerfile`
- Container name: `wa-bridge`
- Persistent volumes for sessions
- Listens on `127.0.0.1:3333` (local only)
- Nginx proxies external requests to this

### 4. **.env.example** (Environment Variables)
```bash
WHATSAPP_WEB_ALLOWED_ORIGINS=https://crm.swaryoga.com,https://swaryoga.com
NEXT_BASE_URL=https://crm.swaryoga.com
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_CLIENT_ID=crm-whatsapp-session
```

### 5. **nginx-wa-bridge.conf** (Nginx Reverse Proxy)
- Configures HTTPS/SSL
- Proxies requests to bridge on `127.0.0.1:3333`
- Handles WebSocket connections
- Required for production HTTPS access

### 6. **start.sh** (Simple Startup Script)
```bash
#!/bin/bash
export WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
export PORT=3333
node server.js
```

### 7. **deploy.sh** (Deployment Script)
- Automated deployment to VPS
- Handles Docker setup
- Configures Nginx
- Sets up SSL certificates

### 8. **verify.sh** (Verification Script)
- Tests bridge connectivity
- Verifies endpoints are working
- Checks authentication

### 9. **README.md** (Documentation)
- Setup instructions
- Deployment steps
- Configuration guide

### 10. **README_AUTOMATION.md** (Automation Documentation)
- Advanced setup with PM2
- Auto-restart configuration
- Monitoring setup

---

## 🚀 Quick Deployment to EC2

### Option 1: Copy and Run Manually
```bash
# Copy bridge files to EC2
scp -r deploy/wa-bridge/* ec2-user@3.80.11.153:/home/ec2-user/wa-bridge/

# SSH to EC2
ssh -i your-key.pem ec2-user@3.80.11.153

# Install and start
cd /home/ec2-user/wa-bridge
npm install
node server.js
```

### Option 2: Using Docker Compose
```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@3.80.11.153

# Copy docker-compose.yml
scp deploy/wa-bridge/docker-compose.yml ec2-user@3.80.11.153:~/docker-compose.yml

# Start container
docker-compose up -d
```

### Option 3: Using Deploy Script
```bash
cd deploy/wa-bridge
./deploy.sh 3.80.11.153
```

---

## ⚙️ Environment Variables Needed

### For Bridge (.env file)
```
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_ALLOWED_ORIGINS=https://crm.swaryoga.com
NEXT_BASE_URL=https://crm.swaryoga.com
PORT=3333
```

### For Vercel (Already Set)
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
```

---

## 📊 Architecture

```
crm.swaryoga.com (Vercel) 
    ↓
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
    ↓
Nginx (wa-bridge.swaryoga.com:443)
    ↓
Docker Container wa-bridge
    ↓
Node.js Bridge Server (127.0.0.1:3333)
    ↓
WhatsApp Web.js Client
    ↓
WhatsApp Web
```

---

## 🔧 Troubleshooting Bridge

### Bridge Not Starting
```bash
# Check if port 3333 is free
lsof -i:3333

# Kill any existing process
lsof -ti:3333 | xargs kill -9

# Start bridge
node server.js
```

### Check Bridge Status
```bash
# Test health
curl http://localhost:3333/health

# Test with secret
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/status
```

### View Bridge Logs
```bash
# If running via PM2
pm2 logs wa-bridge

# If running in Docker
docker logs wa-bridge

# If running manually, check console output
```

### Session Issues
```bash
# Remove old session if QR not working
rm -rf .wwebjs_auth/
rm -rf .wwebjs_cache/

# Restart bridge to generate new QR
node server.js
```

---

## 📁 File Structure

```
deploy/wa-bridge/
├── server.js                    # Main bridge server
├── package.json                # Dependencies
├── docker-compose.yml          # Docker setup
├── .env.example               # Environment template
├── nginx-wa-bridge.conf       # Nginx config
├── start.sh                   # Simple startup
├── deploy.sh                  # Automated deployment
├── verify.sh                  # Verification script
├── README.md                  # Main documentation
└── README_AUTOMATION.md       # Automation guide
```

---

## 🎯 Current Issue

**EC2 Bridge Status**: 🔴 **NOT RUNNING**
- IP: 3.80.11.153
- Domain: wa-bridge.swaryoga.com
- Port: 3333

**Fix Options**:
1. SSH to EC2 and restart: `node server.js`
2. Use Docker: `docker-compose up -d`
3. Deploy via script: `./deploy.sh`

---

**All bridge files are in**: `/Users/mohankalburgi/swaryoga.com-db/deploy/wa-bridge/`
