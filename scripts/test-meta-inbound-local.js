#!/usr/bin/env node
/**
 * Local Meta inbound webhook simulation.
 *
 * Sends a sample inbound webhook payload to /api/whatsapp/webhook and then:
 * - fetches recent webhook events (admin endpoint)
 * - optionally fetches CRM conversations/messages if you provide an admin token
 *
 * Required:
 * - local dev server running
 * - BASE_URL (default http://localhost:3000)
 * - WHATSAPP_WEBHOOK_VERIFY_TOKEN not needed (POST)
 *
 * Optional:
 * - META_APP_SECRET can be set to enable signature verification in the route.
 *   If set, this script will compute x-hub-signature-256.
 */

const crypto = require('crypto');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const APP_SECRET = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();

const FROM_PHONE = (process.env.TEST_FROM_PHONE || '919999999999').replace(/\D/g, '');
const TEXT = process.env.TEST_TEXT || 'Hi (test inbound)';
const MESSAGE_ID = process.env.TEST_WA_MESSAGE_ID || `wamid.TEST.${Date.now()}`;

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _nonJsonBody: text };
  }
  return { res, json };
}

async function main() {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '9999999999',
                phone_number_id: 'PHONE_NUMBER_ID',
              },
              contacts: [{ wa_id: FROM_PHONE, profile: { name: 'Test User' } }],
              messages: [
                {
                  from: FROM_PHONE,
                  id: MESSAGE_ID,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: TEXT },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const rawBody = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json' };

  if (APP_SECRET) {
    const hmac = crypto.createHmac('sha256', APP_SECRET).update(rawBody, 'utf8').digest('hex');
    headers['x-hub-signature-256'] = `sha256=${hmac}`;
  }

  console.log(`\n➡️  POST ${BASE_URL}/api/whatsapp/webhook`);
  const { res, json } = await fetchJson(`${BASE_URL}/api/whatsapp/webhook`, {
    method: 'POST',
    headers,
    body: rawBody,
  });

  console.log(`Webhook response: ${res.status}`);
  if (!res.ok) {
    console.error(json);
    process.exitCode = 1;
    return;
  }

  console.log(`\nℹ️  Inbound test sent with from=${FROM_PHONE} messageId=${MESSAGE_ID}`);
  console.log(`Now check CRM → WhatsApp Meta diagnostics or webhook events endpoint in production.`);
}

main().catch((e) => {
  console.error('Test crashed', e);
  process.exitCode = 1;
});
