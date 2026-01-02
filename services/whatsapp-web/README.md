# WhatsApp Web Bridge

This folder runs a **separate Node service** that connects to WhatsApp via **WhatsApp Web** (QR login) using `whatsapp-web.js`.

It can run locally, or be hosted on a real HTTPS domain so the CRM on `https://swaryoga.com` can access it via HTTPS + WSS.

## Important warnings
- This is **not** the official Meta Cloud API.
- WhatsApp can change Web behavior at any time and sessions can break.
- Use **manual / single messages only**. Avoid bulk, loops, or automation.
- Respect opt-out / consent.

## What it provides
- `POST /api/whatsapp/send` with JSON `{ phone, message }`
- Optional API key protection via `WHATSAPP_WEB_BRIDGE_SECRET` (send header `x-api-key`).

## Production hosting (recommended)

To use this bridge from `https://swaryoga.com/admin/crm/whatsapp`, you **must** host it on a public URL.

Example:

- Bridge: `https://wa-bridge.swaryoga.com`
- WebSocket: `wss://wa-bridge.swaryoga.com`

Put the bridge behind a reverse proxy (nginx/caddy/traefik) that terminates TLS. The Node process itself can remain plain HTTP on an internal port.

### Env vars (Bridge)

- `WHATSAPP_WEB_PORT` (optional): default 3333
- `WHATSAPP_CLIENT_ID` (recommended): isolate sessions per deployment (default `crm-whatsapp-session`)
- `WHATSAPP_WEB_ALLOWED_ORIGINS` (**required in production**): comma-separated CORS allowlist, e.g.
	- `https://swaryoga.com,https://www.swaryoga.com`
- `NEXT_BASE_URL` (**recommended**): where to POST inbound WhatsApp messages (e.g. `https://swaryoga.com`)
- `WHATSAPP_WEB_BRIDGE_SECRET` (**recommended**): shared secret used when posting inbound messages to Next.js

### Env vars (Next.js / Vercel)

- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`: `https://wa-bridge.swaryoga.com`
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL`: `wss://wa-bridge.swaryoga.com`
- `WHATSAPP_BRIDGE_HTTP_URL`: same as the HTTP URL above (used by some server routes)

## QR login
When you start the service, you will see a QR code in terminal:
- WhatsApp on phone → **Linked devices** → **Link a device** → scan QR

The session is stored via `LocalAuth` (persisted on disk).

## Suggested usage with this repo
This Next.js repo already supports the **official** WhatsApp Cloud API in `lib/whatsapp.ts`.
Use this bridge only when you specifically want WhatsApp Web based testing.
