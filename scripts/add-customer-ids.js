#!/usr/bin/env node
/**
 * Backfill customerId on sales_reports from leads.leadNumber,
 * matched by phone (preferred) then by name.
 * Run: node scripts/add-customer-ids.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

function normPhone(p) {
  return String(p || '').replace(/\D/g, '').replace(/^0+/, '');
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const leads = db.collection('leads');
  const reports = db.collection('sales_reports');

  const allLeads = await leads.find(
    { leadNumber: { $exists: true, $ne: '' } },
    { projection: { name: 1, phoneNumber: 1, leadNumber: 1 } }
  ).toArray();

  const byPhone = new Map();
  const byName = new Map();
  for (const l of allLeads) {
    const ph = normPhone(l.phoneNumber);
    if (ph && !byPhone.has(ph)) byPhone.set(ph, l.leadNumber);
    const nm = (l.name || '').trim().toLowerCase();
    if (nm && !byName.has(nm)) byName.set(nm, l.leadNumber);
  }

  const sales = await reports.find({}).toArray();
  let matchedPhone = 0, matchedName = 0, unmatched = 0;

  for (const s of sales) {
    let customerId = s.customerId;
    if (!customerId) {
      const ph = normPhone(s.customerPhone);
      if (ph && byPhone.has(ph)) {
        customerId = byPhone.get(ph);
        matchedPhone++;
      } else {
        const nm = (s.customerName || '').trim().toLowerCase();
        if (nm && byName.has(nm)) {
          customerId = byName.get(nm);
          matchedName++;
        } else {
          unmatched++;
        }
      }
      if (customerId) {
        await reports.updateOne({ _id: s._id }, { $set: { customerId } });
      }
    }
  }

  console.log(`Matched by phone: ${matchedPhone}`);
  console.log(`Matched by name: ${matchedName}`);
  console.log(`Unmatched (no customerId): ${unmatched}`);
  console.log(`Total: ${sales.length}`);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
