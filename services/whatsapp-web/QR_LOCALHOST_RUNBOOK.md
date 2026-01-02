# WhatsApp QR (localhost) — Runbook

This project uses a **separate Node bridge service** (in this folder) to generate WhatsApp Web QR codes.

## ✅ Goal
- Bridge runs on **http://localhost:3333**
- Admin UI connects to **ws://localhost:3333** and receives `{type:'qr', data:'data:image/png;base64,...'}`

## 1) Start the bridge (WebSocket + REST)
From `services/whatsapp-web/`:

```bash
npm install
npm run qr
```

Environment (optional):
- `WHATSAPP_WEB_PORT=3333` (default is 3333)

## 2) Verify bridge is reachable
```bash
curl http://localhost:3333/health
```
Expected:
- `{ "ok": true, "authenticated": false }` (before scanning)

## 3) Start the Next.js app
From repo root:

```bash
npm run dev:no-check
```

Then open:
- `http://localhost:3001/admin/crm/whatsapp/qr-login`

## 4) Common issues
### QR never appears, only status
Your browser must send `{type:'init'}` after connecting. This repo’s `QRConnectionModal` does this automatically now.

### Port 3333 already in use
```bash
lsof -nP -iTCP:3333 -sTCP:LISTEN
```
Stop the old process and re-run `npm run qr`.

### Production note
Do **not** expose this bridge on your main production domain. If you want QR over the internet, deploy it as a separate service and set:
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://<bridge-host>`
