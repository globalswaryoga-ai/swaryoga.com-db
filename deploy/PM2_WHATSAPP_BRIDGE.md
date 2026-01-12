# PM2: WhatsApp Web Bridge (recommended)

This repo contains **two** ways to run the WhatsApp Web bridge:
- PM2 (recommended)
- systemd units in `deploy/systemd/` (optional)

**Recommendation:** use **PM2 only** on the server.

Running both PM2 and systemd at the same time can cause:
- port conflicts (`EADDRINUSE` on 3333)
- double restarts
- confusing logs

---

## What this service is

- Bridge code: `services/whatsapp-web/index.js`
- PM2 config: `services/whatsapp-web/ecosystem.config.cjs`

The ecosystem file runs two processes:
1. `swaryoga-whatsapp-bridge` (the HTTP bridge)
2. `swaryoga-whatsapp-bridge-watchdog` (optional watchdog that polls `/health` and triggers `/restart` if needed)

---

## Required env vars

Set these in your shell (or `.env` you source before starting PM2):

- `WHATSAPP_WEB_PORT` (default `3333`)
- `WHATSAPP_CLIENT_ID` (default `crm-whatsapp-session`)
- `WHATSAPP_WEB_BRIDGE_SECRET` (important; used by the CRM UI and watchdog)

Recommended when running on EC2:
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` (or your chromium path)

Optional:
- `WHATSAPP_WEB_ALLOWED_ORIGINS` (default `*`)
- `NEXT_BASE_URL` (if you forward events to Next.js)

---

## One-time PM2 setup (EC2)

1) Install dependencies

```bash
cd /home/ubuntu/swaryoga.com-db
npm ci
```

2) Install PM2

```bash
npm i -g pm2
```

3) Start the bridge + watchdog

```bash
pm2 start services/whatsapp-web/ecosystem.config.cjs
```

4) Enable boot startup

```bash
pm2 save
pm2 startup
```

`pm2 startup` prints a command. Run that printed command once.

---

## Daily operations

### Restart bridge

```bash
pm2 restart swaryoga-whatsapp-bridge
```

### Restart everything (bridge + watchdog)

```bash
pm2 restart swaryoga-whatsapp-bridge swaryoga-whatsapp-bridge-watchdog
```

### View logs

```bash
pm2 logs swaryoga-whatsapp-bridge
```

### Check status

```bash
pm2 status
```

---

## Update / Deploy (typical)

```bash
cd /home/ubuntu/swaryoga.com-db
git pull
npm ci
pm2 restart swaryoga-whatsapp-bridge
```

---

## Health URLs

Bridge base URL is usually:
- `http://localhost:3333` on the server

Useful endpoints:
- `GET /health`
- `GET /status`
- `GET /qr-view` (human-friendly QR page)
- `GET /wa-qr.png` (always returns an image: PNG if QR exists, SVG placeholder if not)

---

## If you previously enabled systemd

If you already installed systemd units, disable them so PM2 is the only manager.

Example:

```bash
sudo systemctl disable --now swaryoga-whatsapp-bridge || true
sudo systemctl disable --now swaryoga-whatsapp-bridge-watchdog || true
```

(Only do this if those units exist on your server.)
