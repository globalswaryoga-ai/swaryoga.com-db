# WhatsApp Bridge Deployment (wa-bridge.swaryoga.com)

This folder contains a **VPS-friendly** deployment setup for the long-running WhatsApp Web bridge.

Why: Vercel can’t host this bridge (it needs a persistent WebSocket server + persistent local auth storage).

## What you get

- `docker-compose.yml`: runs the bridge and persists WhatsApp auth
- `nginx-wa-bridge.conf`: Nginx reverse proxy for HTTPS + WSS
- `.env.example`: required environment variables

## Prereqs on the VPS

- Docker + Docker Compose
- Nginx
- A DNS record for `wa-bridge.swaryoga.com` pointing to the VPS (A record)
- TLS certs (Let’s Encrypt via certbot)

## Step-by-step

1) Copy this repo to your VPS (or clone it).

2) Create an env file:

- Copy `deploy/wa-bridge/.env.example` to `deploy/wa-bridge/.env`
- Update values.

3) Start the bridge container:

- From `deploy/wa-bridge/` run docker compose up (detached).

The service will listen on **127.0.0.1:3333** on the VPS.

4) Configure Nginx

- Copy `deploy/wa-bridge/nginx-wa-bridge.conf` into your Nginx sites config
- Reload Nginx

5) Issue HTTPS cert

- Use certbot for `wa-bridge.swaryoga.com`

6) Verify

- `https://wa-bridge.swaryoga.com/health` should return JSON
- WebSocket should connect at `wss://wa-bridge.swaryoga.com/`

## Next.js env vars (already set in Vercel)

These must point at the deployed bridge:

- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com`
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com`
- `WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com`

## Notes on MongoDB Atlas

MongoDB Atlas is used by the **Next.js app** (CRM leads/messages/orders). The WhatsApp bridge does **not** require MongoDB.

The bridge only needs:
- persistent volumes for `.wwebjs_auth` and `.wwebjs_cache`
- outbound internet access to WhatsApp Web

If you want, we can later extend the bridge to store operational logs in MongoDB Atlas, but it’s not required to make QR work.
