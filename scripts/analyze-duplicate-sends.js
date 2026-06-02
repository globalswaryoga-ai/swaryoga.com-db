#!/usr/bin/env node
/**
 * READ-ONLY analysis: how many times the SAME template was sent to the SAME number.
 * Looks at broadcast_run_messages (the broadcast system) joined to broadcast_runs for templateId.
 * Usage: node scripts/analyze-duplicate-sends.js [windowHours]
 *   windowHours (optional): also report dupes that happened within this many hours of each other.
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const windowHours = Number(process.argv[2]) || 48;

if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

const SENT_STATUSES = ['sent', 'delivered', 'read'];

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  const db = client.db(crmDbName);
  const col = db.collection('whatsapp_messages');

  // Each actually-transmitted message = one outbound template row that Meta accepted (has waMessageId).
  const match = { direction: 'outbound', messageType: 'template', waMessageId: { $exists: true, $nin: [null, ''] } };
  const total = await col.countDocuments(match);
  console.log(`\n=== Duplicate-send analysis (DB: ${crmDbName}, source: whatsapp_messages) ===`);
  console.log(`Total transmitted outbound template messages: ${total}`);

  const rows = await col.find(match, { projection: { phoneNumber: 1, templateId: 1, createdAt: 1, status: 1 } }).toArray();

  const groups = new Map();
  for (const r of rows) {
    const phone10 = String(r.phoneNumber || '').replace(/\D/g, '').slice(-10);
    if (!phone10) continue;
    const tid = r.templateId ? String(r.templateId) : 'unknown';
    const key = `${phone10}|${tid}`;
    let g = groups.get(key);
    if (!g) { g = { phone: phone10, templateId: tid, count: 0, runIds: new Set(), first: null, last: null }; groups.set(key, g); }
    g.count++;
    const t = r.createdAt ? new Date(r.createdAt) : null;
    if (t) { if (!g.first || t < g.first) g.first = t; if (!g.last || t > g.last) g.last = t; }
  }
  const dupes = [...groups.values()]
    .filter(g => g.count > 1)
    .map(g => ({ _id: { phone: g.phone, templateId: g.templateId }, count: g.count, runIds: [...g.runIds], firstSentAt: g.first, lastSentAt: g.last }))
    .sort((a, b) => b.count - a.count);

  const pairsWithDupes = dupes.length;
  const redundantSends = dupes.reduce((s, d) => s + (d.count - 1), 0); // extra sends beyond the first
  const affectedNumbers = new Set(dupes.map(d => d._id.phone)).size;

  // How many of these dupes happened within the window (same template, repeats close together)
  const withinWindow = dupes.filter(d => {
    if (!d.firstSentAt || !d.lastSentAt) return false;
    const diffH = (new Date(d.lastSentAt) - new Date(d.firstSentAt)) / 36e5;
    return diffH <= windowHours;
  });

  console.log(`\n(phone, template) pairs that got the SAME template >1 time: ${pairsWithDupes}`);
  console.log(`Distinct phone numbers affected: ${affectedNumbers}`);
  console.log(`Total REDUNDANT sends (count beyond the first): ${redundantSends}`);
  console.log(`  ...of which repeats happened within ${windowHours}h: ${withinWindow.reduce((s,d)=>s+(d.count-1),0)} (across ${withinWindow.length} pairs)`);

  console.log(`\nTop 20 worst offenders (same template resent to same number):`);
  for (const d of dupes.slice(0, 20)) {
    const span = d.firstSentAt && d.lastSentAt
      ? `${((new Date(d.lastSentAt)-new Date(d.firstSentAt))/36e5).toFixed(1)}h span`
      : 'n/a';
    console.log(`  ...${d._id.phone}  ×${d.count}  (template ${d._id.templateId || 'unknown'}, ${d.runIds.length} runs, ${span})`);
  }

  await client.close();
}
main().catch(e => { console.error(e); process.exit(2); });
