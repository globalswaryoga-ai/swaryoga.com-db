# WhatsApp Web QR Integration (Eazybe-Style)

## Overview
This guide explains how to set up WhatsApp Web QR functionality in your Swar Yoga CRM, inspired by Eazybe's architecture.

**Important**: `whatsapp-web.js` is a Node.js module that cannot run in Vercel's serverless Next.js environment. Therefore, the QR-based WhatsApp integration requires a **separate self-hosted Node.js server**.

## Architecture Comparison

### ❌ Eazybe Approach (Simple but Requires Self-Hosting)
```
┌─────────────────────────────┐
│   Eazybe UI (Browser)       │
├─────────────────────────────┤
│ ↓ WebSocket / HTTP          │
├─────────────────────────────┤
│ Node.js WhatsApp Web Server │
│ - whatsapp-web.js client    │
│ - QR generation             │
│ - Message send/receive      │
└─────────────────────────────┘
     ↓ WhatsApp Protocol
```

**Pros:**
- Full WhatsApp Web features (QR login, real conversation history)
- Works with personal accounts + business accounts
- No Meta API credentials needed

**Cons:**
- Requires self-hosted Node.js server (VPS/EC2)
- Cannot run on Vercel (serverless limitation)
- Continuous server maintenance

---

### ✅ Current Swar Yoga Architecture (Hybrid)
```
┌────────────────────────────────────────┐
│    Swar Yoga CRM (Next.js on Vercel)   │
├────────────────────────────────────────┤
│  Option 1: Meta Cloud API              │
│  ├─ WHATSAPP_ACCESS_TOKEN              │
│  └─ WHATSAPP_PHONE_NUMBER_ID           │
│                                         │
│  Option 2: WhatsApp Web QR             │
│  ├─ Redirect to separate bridge server │
│  └─ wa-bridge.swaryoga.com (self-host) │
└────────────────────────────────────────┘
```

---

## Setup Options

### Option A: Meta Cloud API (Easiest, Recommended)
**Best for:** Automatic workflows, API integrations, large scale

1. **Get Meta Business Account Credentials:**
   - Go to [Meta for Business](https://business.facebook.com)
   - Create Business Account → WhatsApp Business App
   - Generate Access Token + Phone Number ID

2. **Add to Vercel .env:**
   ```bash
   WHATSAPP_ACCESS_TOKEN=your_meta_token_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
   ```

3. **Deploy:**
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

4. **Send Messages from CRM:**
   - Messages → Send → Automatically uses Cloud API
   - No QR code required
   - Stored in database

---

### Option B: WhatsApp Web QR (Requires Self-Hosted Server)
**Best for:** Personal automation, low volume, existing WhatsApp accounts

#### Step 1: Prepare Your VPS/EC2

```bash
# SSH into your server
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Node.js & Docker
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install nodejs docker.io docker-compose -y
sudo usermod -aG docker $USER
```

#### Step 2: Deploy WhatsApp Bridge Server

The bridge server code is in `/deploy/wa-bridge/` of this project.

```bash
# Clone/pull your repo on VPS
git clone <your-repo> swar-yoga
cd swar-yoga/deploy/wa-bridge

# Copy example env
cp .env.example .env
# Edit .env: Set BRIDGE_SECRET, PORT, etc.

# Start with Docker
docker-compose up -d

# Or: Run locally with Node.js
npm install
npm run start
# Listens on http://localhost:3001
```

#### Step 3: Set Up HTTPS + Subdomain

The CRM requires **HTTPS + WebSocket (WSS)** for the QR bridge.

```bash
# Using Nginx as reverse proxy
sudo vim /etc/nginx/sites-available/wa-bridge

server {
    listen 443 ssl http2;
    server_name wa-bridge.swaryoga.com;

    ssl_certificate /etc/letsencrypt/live/wa-bridge.swaryoga.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wa-bridge.swaryoga.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/wa-bridge /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

#### Step 4: Configure Swar Yoga CRM for Bridge

Add to Vercel environment variables:

```bash
# Bridge URLs (for WhatsApp Web QR mode)
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
WHATSAPP_WEB_BRIDGE_SECRET=your_secret_here
```

#### Step 5: Use in CRM

In the CRM interface:
1. Go to **Admin → CRM → WhatsApp**
2. Click "**Scan QR Code**"
3. Use your phone's WhatsApp to scan
4. Once authenticated, you can send messages via WhatsApp Web

---

## Message Flow

### With Cloud API (Meta)
```
CRM UI → /api/admin/crm/messages (send)
  ↓
sendWhatsAppText() in lib/whatsapp.ts
  ↓
Meta Graph API v20.0
  ↓
WhatsApp Server
  ↓
Recipient Phone
```

**Status:** ✅ Works on Vercel

### With WhatsApp Web QR
```
CRM UI → /api/whatsapp/send
  ↓
wa-bridge.swaryoga.com (Node.js server)
  ↓
whatsapp-web.js client
  ↓
WhatsApp Web Protocol
  ↓
Recipient Phone
```

**Status:** ⚠️ Requires self-hosted server

---

## Troubleshooting

### "WhatsApp Web client not ready. Please scan QR code first."
- Ensure `wa-bridge.swaryoga.com` is accessible
- Check bridge server is running: `curl https://wa-bridge.swaryoga.com/health`
- Verify DNS: `nslookup wa-bridge.swaryoga.com`

### "Could not resolve hostname wa-bridge.swaryoga.com"
- Bridge server is not running or DNS not configured
- Add DNS A record pointing to your VPS IP

### QR Code Expires
- QR codes are valid for ~5-10 minutes
- Reload the page and scan again if it expires

### Messages Not Sending with Cloud API
1. Verify tokens in Vercel env:
   - `WHATSAPP_ACCESS_TOKEN` (Meta token)
   - `WHATSAPP_PHONE_NUMBER_ID` (Business phone ID)

2. Test with curl:
```bash
curl -X POST https://graph.facebook.com/v20.0/{PHONE_ID}/messages \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919309986820",
    "type": "text",
    "text": {"body": "Hello"}
  }'
```

---

## Comparison: Cloud API vs. Web QR

| Feature | Cloud API | Web QR |
|---------|-----------|--------|
| Deployment | Vercel ✅ | Self-hosted VPS ⚠️ |
| Setup Time | 15 min | 1-2 hours |
| Monthly Cost | $0-100+ (per message) | $5-20 (VPS) |
| Account Type | Business (Meta) | Any WhatsApp account |
| Conversation History | Meta stores it | Local only |
| Automation | Full API | Basic |
| Reliability | 99.9% SLA | Depends on server |
| Webhook Support | Yes | Limited |

---

## Recommendation

**For Swar Yoga CRM:**

1. **Start with Cloud API** (Meta WhatsApp Business)
   - Faster to implement
   - No server management
   - Professional setup
   - Scales well

2. **Add WhatsApp Web QR later** (if needed)
   - For personal accounts
   - Low-volume testing
   - As a backup channel

---

## File Structure

```
swar-yoga-web/
├── lib/
│   ├── whatsapp.ts              ← Cloud API helpers
│   └── crm/
│       └── phone.ts              ← Phone number normalization
│
├── app/api/admin/crm/
│   ├── messages/
│   │   └── route.ts              ← Send/fetch messages (uses whatsapp.ts)
│   └── whatsapp/
│       ├── qr/                   ← QR generation endpoint (NOT used on Vercel)
│       ├── send/                 ← Message send endpoint (NOT used on Vercel)
│       └── inbound/              ← Webhook receiver
│
├── app/admin/crm/
│   └── messages/
│       └── page.tsx              ← CRM message UI
│
└── deploy/wa-bridge/             ← Standalone WhatsApp Web server
    ├── docker-compose.yml
    ├── nginx-wa-bridge.conf
    ├── server.js
    └── README.md
```

---

## Next Steps

### Immediate (This Week)
- [ ] Set up Meta Business Account & get Cloud API credentials
- [ ] Add `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` to Vercel
- [ ] Test message sending from CRM

### Short-term (Next 2-4 Weeks)
- [ ] Set up backup VPS for WhatsApp Web QR
- [ ] Deploy `/deploy/wa-bridge` server
- [ ] Configure SSL + subdomain `wa-bridge.swaryoga.com`

### Long-term
- [ ] Implement webhook receiver for inbound messages
- [ ] Add scheduled message automation
- [ ] Build chatbot integration

---

## Support

For questions:
- Check `/deploy/wa-bridge/README.md` for bridge server documentation
- Review `lib/whatsapp.ts` source code
- Test with `node test-payu-integration.js` pattern (create similar for WhatsApp)

