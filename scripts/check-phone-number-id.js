#!/usr/bin/env node
/**
 * Check which WhatsApp display_phone_number Meta is actually sending to our webhook.
 * Run: node scripts/check-phone-number-id.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI_MAIN;
if (!uri) {
  console.error('Missing MONGODB_URI_MAIN in .env.local');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db('swaryoga_admin_crm');
  const events = await db
    .collection('whatsapp_webhook_events')
    .find({ kind: 'unknown', message: 'RAW_POST_RECEIVED' })
    .sort({ createdAt: -1 })
    .limit(25)
    .project({ createdAt: 1, sample: 1 })
    .toArray();

  const map = new Map();
  for (const e of events) {
    const raw = e?.sample?.rawBodyPreview;
    if (!raw || typeof raw !== 'string') continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const value = parsed?.entry?.[0]?.changes?.[0]?.value;
    const display = value?.metadata?.display_phone_number;
    const phoneId = value?.metadata?.phone_number_id;
    if (!display && !phoneId) continue;
    const key = `${display || 'unknown'} | ${phoneId || 'unknown'}`;
    map.set(key, (map.get(key) || 0) + 1);
  }

  console.log('Observed webhook target numbers (from RAW_POST_RECEIVED previews):');
  for (const [k, v] of [...map.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}x  ${k}`);
  }

  console.log('\nConfigured env:');
  console.log('  WHATSAPP_PHONE_NUMBER_ID =', process.env.WHATSAPP_PHONE_NUMBER_ID);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
