#!/usr/bin/env node
/** READ-ONLY: dump all messages to a number across collections. Usage: node scripts/inspect-number.js <phone> */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const phoneArg = String(process.argv[2] || '').replace(/\D/g, '');
if (!uri || !phoneArg) { console.error('Usage: node scripts/inspect-number.js <phone>'); process.exit(1); }
const last10 = phoneArg.slice(-10);
const rx = new RegExp(last10 + '$');

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  const db = client.db(crmDbName);

  async function dump(coll, phoneField, extra) {
    const col = db.collection(coll);
    const q = {}; q[phoneField] = rx;
    const docs = await col.find(q).sort({ createdAt: 1 }).toArray().catch(() => []);
    console.log(`\n=== ${coll}: ${docs.length} message(s) to ...${last10} ===`);
    for (const d of docs) console.log('  ' + extra(d));
    return docs;
  }

  const brm = await dump('broadcast_run_messages', 'phoneNumber', d =>
    `${d.createdAt && new Date(d.createdAt).toISOString()} | status=${d.status} | retryCount=${d.retryCount ?? 0} | run=${d.runId} | wa=${d.waMessageId || '-'} | reason=${d.failureReason || ''}`);

  // resolve template names for the runs involved
  const runIds = [...new Set(brm.map(d => d.runId).filter(Boolean).map(String))];
  if (runIds.length) {
    const { ObjectId } = require('mongodb');
    const runs = await db.collection('broadcast_runs').find({ _id: { $in: runIds.map(id => new ObjectId(id)) } }).toArray();
    console.log(`\n  -- runs involved --`);
    for (const r of runs) console.log(`  run ${r._id} | name="${r.name}" | template=${r.templateId} | scheduledAt=${r.scheduledAt && new Date(r.scheduledAt).toISOString()} | status=${r.status}`);
  }

  await dump('whatsapp_messages', 'phoneNumber', d =>
    `${d.createdAt && new Date(d.createdAt).toISOString()} | dir=${d.direction} | type=${d.messageType} | status=${d.status} | tpl=${d.templateId || '-'} | wa=${d.waMessageId || '-'}`);

  await dump('qr_whatsapp_messages', 'chatJid', d =>
    `${d.createdAt && new Date(d.createdAt).toISOString()} | fromMe=${d.fromMe} | type=${d.type} | text="${String(d.text||'').slice(0,40)}"`);

  await client.close();
}
main().catch(e => { console.error(e); process.exit(2); });
