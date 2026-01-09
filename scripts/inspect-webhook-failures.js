#!/usr/bin/env node
/**
 * Inspect recent WhatsApp webhook failures in swaryoga_admin_crm.
 *
 * Usage:
 *   node scripts/inspect-webhook-failures.js
 */

require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI_MAIN (or MONGODB_URI)');

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db('swaryoga_admin_crm');
    const col = db.collection('whatsapp_webhook_events');

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const query = {
      kind: 'error',
      $or: [{ receivedAt: { $gte: since } }, { createdAt: { $gte: since } }],
    };

    const events = await col
      .find(query)
      .sort({ receivedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray();

    console.log(`\n🔎 Webhook failures in last 24h: ${events.length}`);

    const counts = new Map();
    for (const e of events) {
      const key = e.message || '(no message)';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    console.log('\n📌 Breakdown by message:');
    for (const [msg, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${n} × ${msg}`);
    }

    console.log('\n🧾 Latest 15 (timestamp | message | details):');
    for (const e of events.slice(0, 15)) {
      const ts = e.receivedAt || e.createdAt;
      const tsStr = ts && typeof ts.toISOString === 'function' ? ts.toISOString() : String(ts || 'N/A');
      const detail = e.sample?.signatureDebug || e.sample || e.error || {};
      console.log(`\n- ${tsStr} | ${e.message || '(no message)'}`);
      console.log(`  detail: ${JSON.stringify(detail).slice(0, 800)}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ inspect-webhook-failures failed');
  console.error(err);
  process.exitCode = 1;
});
