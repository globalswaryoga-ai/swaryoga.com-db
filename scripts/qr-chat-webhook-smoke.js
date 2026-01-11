#!/usr/bin/env node

/**
 * Local smoke test for QR chat webhook receiver.
 * Posts a dummy payload to http://localhost:3000/api/whatsapp/qr/webhook
 */

const url = 'http://localhost:3000/api/whatsapp/qr/webhook';

async function main() {
  const payload = {
    event: 'message',
    instance_id: process.env.QR_CHAT_INSTANCE_ID || 'dummy',
    data: {
      from: '919999999999',
      to: '919000000000',
      type: 'text',
      message: 'hello from QR chat smoke test',
      ts: Date.now(),
    },
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  if (process.env.QR_CHAT_WEBHOOK_SECRET) {
    headers['x-qr-chat-secret'] = process.env.QR_CHAT_WEBHOOK_SECRET;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
