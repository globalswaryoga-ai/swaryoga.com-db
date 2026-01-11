# WhatsApp Web Bridge (WWebJS) – Ops Notes

This repo includes a WhatsApp Web bridge under `services/whatsapp-web/` used by the CRM “QR Inbox” page at `app/admin/crm/qr/page.tsx`.

## What’s running where

- **Bridge**: EC2 Ubuntu host (or similar) running Node + `whatsapp-web.js`.
- **CRM UI**: Next.js app (this repo) running locally (dev) or on Vercel.

The CRM talks to the bridge over HTTP.

## Required env vars (Next.js)

Set these in `.env.local` (dev) or Vercel env (prod):

- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`
  - Example: `https://wa-bridge.swaryoga.com`
  - Local testing example: `http://<EC2_PUBLIC_IP>:3333`
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET`
  - Must match what the bridge expects (sent as `x-bridge-secret`).

## Bridge ports and endpoints

Default bridge port is **3333**.

- Health: `GET /health`
- Status: `GET /status`
- QR: `GET /qr`
- Connect: `POST /connect`
- Restart session: `POST /restart`

Example:

- `http://localhost:3333/health`
- `http://localhost:3333/qr`

## Common gotchas

### 1) Port conflicts (`EADDRINUSE`)

If you see `EADDRINUSE :::3333`, you have **two bridge processes** running.

Pick one process manager:

- Prefer **PM2** for persistence.
- Avoid mixing `nohup node index.js &` and PM2 at the same time.

### 2) Ubuntu 24.04 “chromium-browser” wrapper

On Ubuntu 24.04, `/usr/bin/chromium-browser` is often a **wrapper** that requires a snap install.
If snapd is unhealthy, Chromium launch will fail.

Most reliable fix: install **Google Chrome (APT)** and set:

- Bridge `.env`: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable`

### 3) Don’t delete snap `.snap` files

Avoid removing `/var/lib/snapd/snaps/*.snap` manually; it corrupts snap state and causes errors like:

- `missing file /var/lib/snapd/snaps/chromium_<rev>.snap`

## QR Inbox UI wiring

The page `app/admin/crm/qr/page.tsx` reads `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` and calls:

- `${bridgeUrl}/status`
- `${bridgeUrl}/qr`

It sends the secret header `x-bridge-secret: <NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET>`.
