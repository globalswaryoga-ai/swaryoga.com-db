# Meta Incoming Webhook Fix

## Background
Incoming WhatsApp/META messages were failing to reach the CRM even though outbound messaging was working. The webhook route at `/api/whatsapp/webhook` was correctly registered, but every Meta POST was getting rejected with `Missing x-hub-signature-256` or `Invalid webhook signature` when the environment contained `META_APP_SECRET`/`WHATSAPP_APP_SECRET`. This typically happens when the request is proxied (Vercel edge, custom load balancer, etc.) and strips or renames the Graph API signature header.

## Root Cause
- We required the `x-hub-signature-256` header (sha256) whenever either `META_APP_SECRET` or `WHATSAPP_APP_SECRET` was set.
- Graph API sometimes sends the legacy `x-hub-signature` header (sha1), depending on configuration or infrastructure.
- Some proxies/load balancers also rewrite headers, preventing `x-hub-signature-256` from reaching the Next.js runtime, so every request failed outright.
- As a result, inbound inbound webhooks were rejected before we even looked at the payload, so leads/messages never landed in CRM.

## Fix
- The webhook now accepts either `x-hub-signature-256` or `x-hub-signature` and infers the hashing algorithm (`sha256` or `sha1`) from the header prefix.
- The validation code recalculates the expected HMAC using the detected algorithm and compares it using `crypto.timingSafeEqual`.
- When the deprecated header is detected, we still verify the HMAC to maintain security.
- Debug responses now mention both headers so future diagnostics are easier.

## Testing
1. Ensure `META_APP_SECRET` (or `WHATSAPP_APP_SECRET`) is set in the environment.
2. Send a test message to the WhatsApp Cloud API number.
3. Observe the webhook logs – look for `kind: 'inbound_message'` entries in the `WhatsAppWebhookEvent` collection.
4. The request should now succeed even if the signature arrives as `x-hub-signature` or if proxies rename the header.

## Recommendations
- If you still see `signature-missing` callbacks, make sure your hosting layer forwards either `x-hub-signature-256` or `x-hub-signature` to the Next.js backend without removing/renaming it.
- Keep `META_APP_SECRET`/`WHATSAPP_APP_SECRET` configured to retain HMAC verification for security.
- Use the `debug=1` query parameter on the webhook verification route (`GET /api/whatsapp/webhook?debug=1`) to inspect what the server sees.

---
> Fix shipped Jan 6, 2026 by adding support for both signature headers.
