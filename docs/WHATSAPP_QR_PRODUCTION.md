# WhatsApp QR on CRM (Production)

This project supports WhatsApp Web **QR-based login** via an external, always-on “WhatsApp bridge” service (built from `services/whatsapp-web`).

Because WhatsApp Web sessions require a persistent process + local auth storage, **the bridge cannot run on Vercel/serverless**. Instead, it must run on a VPS/EC2 behind HTTPS/WSS.

## Required env vars (CRM / Next.js app)

Set these in Vercel (Project → Settings → Environment Variables) for the `crm.swaryoga.com` deployment:

- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com`
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com`
- `WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com`

Notes:

- The `NEXT_PUBLIC_*` vars are used by the browser UI (e.g. `QRConnectionModal`) to connect to the bridge WebSocket.
- `WHATSAPP_BRIDGE_HTTP_URL` is used by server routes (e.g. `/api/admin/crm/whatsapp/qr-login/generate`) for legacy fallback.

## Quick verification

### 1) Check bridge health

Open:

- `https://wa-bridge.swaryoga.com/health`

Expected JSON looks like:

- `{"ok":true,"authenticated":false,...}` before scanning
- `authenticated:true` after a successful QR scan

### 2) Check WSS upgrades

If you test from Node locally, a successful connection will immediately receive a status message like:

- `{"type":"status", ...}`

## Using it in the CRM

In the CRM, use the WhatsApp QR connect flow:

- `/admin/crm/whatsapp/qr-login`

The QR image is delivered over the bridge WebSocket. After scanning, the modal should move to **Authenticated** and you should see `authenticated:true` on the bridge.

## Common failure modes

- **Mixed content**: if CRM is `https://` but the bridge URL is `ws://` or `http://`, browsers will block it. Use `https://` + `wss://`.
- **Wrong DNS target**: `wa-bridge.swaryoga.com` must resolve to the VPS/EC2 running Nginx (not Vercel).
- **CORS allowlist on bridge**: the bridge service should include `https://crm.swaryoga.com` in `WHATSAPP_WEB_ALLOWED_ORIGINS`.
