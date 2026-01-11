#!/usr/bin/env node

/**
 * QR Chat setup helper for waofficialapi.in
 *
 * What it does:
 * - optionally creates a new instance
 * - fetches the QR code payload
 * - sets the webhook URL to this CRM
 *
 * It uses .env.local:
 * - QR_CHAT_ENABLED=true
 * - QR_CHAT_BASE_URL=https://wa.waofficialapi.in
 * - QR_CHAT_ACCESS_TOKEN=...
 * - QR_CHAT_INSTANCE_ID=...
 *
 * Optional env/args:
 * - QR_CHAT_WEBHOOK_URL=https://crm.swaryoga.com/api/whatsapp/qr/webhook
 */

require('dotenv').config({ path: '.env.local' });

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function buildUrl(base, path, params) {
  const u = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    u.searchParams.set(k, String(v));
  });
  return u.toString();
}

async function main() {
  const baseUrl = (process.env.QR_CHAT_BASE_URL || 'https://wa.waofficialapi.in').trim();
  const accessToken = (process.env.QR_CHAT_ACCESS_TOKEN || '').trim();
  const instanceIdEnv = (process.env.QR_CHAT_INSTANCE_ID || '').trim();

  if (!accessToken) {
    console.error('Missing QR_CHAT_ACCESS_TOKEN in .env.local');
    process.exit(1);
  }

  const webhookUrl = (process.env.QR_CHAT_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    console.log('Tip: set QR_CHAT_WEBHOOK_URL to auto-configure the provider webhook.');
  }

  // 1) Create instance (optional)
  if (!instanceIdEnv) {
    console.log('No QR_CHAT_INSTANCE_ID found. Creating a new instance...');
    const url = buildUrl(baseUrl, '/api/create_instance', { access_token: accessToken });
    const created = await postJson(url);
    console.log('Created instance response:', created);
    console.log('Now copy the returned instance_id into .env.local as QR_CHAT_INSTANCE_ID');
    return;
  }

  const instanceId = instanceIdEnv;

  // 2) Get QR code
  console.log(`Fetching QR code for instance ${instanceId}...`);
  const qrUrl = buildUrl(baseUrl, '/api/get_qrcode', {
    instance_id: instanceId,
    access_token: accessToken,
  });
  const qr = await postJson(qrUrl);
  console.log('QR response:', qr);
  console.log('Scan the QR in the provider dashboard / WhatsApp app to login.');

  // 3) Set webhook
  if (webhookUrl) {
    console.log('Setting webhook...');
    const setHookUrl = buildUrl(baseUrl, '/api/set_webhook', {
      webhook_url: webhookUrl,
      enable: 'true',
      instance_id: instanceId,
      access_token: accessToken,
    });
    const hookRes = await postJson(setHookUrl);
    console.log('Webhook set response:', hookRes);
  }
}

main().catch((e) => {
  console.error('QR chat setup failed:', e);
  process.exit(1);
});
