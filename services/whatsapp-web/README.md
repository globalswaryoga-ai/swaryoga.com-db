# WhatsApp Web Bridge (Internal Testing)

This folder runs a **separate Node service** that connects to WhatsApp via **WhatsApp Web** (QR login) using `whatsapp-web.js`.

## Important warnings
- This is **not** the official Meta Cloud API.
- WhatsApp can change Web behavior at any time and sessions can break.
- Use **manual / single messages only**. Avoid bulk, loops, or automation.
- Respect opt-out / consent.

## What it provides
- `POST /api/whatsapp/send` with JSON `{ phone, message }`
- Optional API key protection via `WHATSAPP_WEB_BRIDGE_SECRET` (send header `x-api-key`).

## QR login
When you start the service, you will see a QR code in terminal:
- WhatsApp on phone → **Linked devices** → **Link a device** → scan QR

The session is stored via `LocalAuth` (persisted on disk).

## Suggested usage with this repo
This Next.js repo already supports the **official** WhatsApp Cloud API in `lib/whatsapp.ts`.
Use this bridge only when you specifically want WhatsApp Web based testing.
