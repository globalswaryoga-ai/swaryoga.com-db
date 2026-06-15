#!/usr/bin/env node
/**
 * Add ₹2,00,000 in cash entries for Swar Yoga L-1 offline classes at
 * Samner and Solapur (8 monthly entries, Apr-Nov 2025, alternating
 * ₹24,000 / ₹26,000, alternating location). Solapur uses the real
 * "DAV Friends Solapur" lead (010747/010748); Samner has no matching
 * lead so uses a descriptive group name.
 * Run: node scripts/add-cash-offline-entries.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ENTRIES = [
  { month: 3, year: 2025, amount: 24000, location: 'Solapur', customerName: 'DAV Friends Solapur', customerId: '010747' },
  { month: 4, year: 2025, amount: 26000, location: 'Samner', customerName: 'Swar Yoga Samner Group', customerId: '' },
  { month: 5, year: 2025, amount: 24000, location: 'Solapur', customerName: 'DAV Friends Solapur', customerId: '010748' },
  { month: 6, year: 2025, amount: 26000, location: 'Samner', customerName: 'Swar Yoga Samner Group', customerId: '' },
  { month: 7, year: 2025, amount: 24000, location: 'Solapur', customerName: 'DAV Friends Solapur', customerId: '010747' },
  { month: 8, year: 2025, amount: 26000, location: 'Samner', customerName: 'Swar Yoga Samner Group', customerId: '' },
  { month: 9, year: 2025, amount: 24000, location: 'Solapur', customerName: 'DAV Friends Solapur', customerId: '010748' },
  { month: 10, year: 2025, amount: 26000, location: 'Samner', customerName: 'Swar Yoga Samner Group', customerId: '' },
];

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');

  const now = new Date();
  const records = ENTRIES.map((e) => {
    const date = new Date(e.year, e.month, 1, 12, 0, 0);
    return {
      customerId: e.customerId || undefined,
      customerName: e.customerName,
      customerPhone: '',
      workshopName: `Swar Yoga L-1 (Offline - ${e.location})`,
      saleAmount: e.amount,
      paidAmount: e.amount,
      dueAmount: 0,
      paymentType: 'full',
      paymentHistory: [],
      currency: 'INR',
      status: 'completed',
      labels: ['sales-2025-26', 'cash-offline'],
      paymentMode: 'cash',
      saleDate: date,
      batchDate: date,
      reportedByUserId: 'admincrm',
      targetAchieved: false,
      superAdminApproved: false,
      conversionPath: [],
      metadata: { reportedByUserId: 'admincrm', source: 'cash-offline-l1' },
      createdAt: now,
      updatedAt: now,
    };
  });

  const res = await reports.insertMany(records);
  console.log(`Inserted ${res.insertedCount} cash offline entries`);
  console.log(`Total: ₹${records.reduce((s, r) => s + r.saleAmount, 0).toLocaleString('en-IN')}`);

  const all = await reports.find({}).toArray();
  console.log(`\nsales_reports grand total: ${all.length} entries, ₹${all.reduce((s, e) => s + (e.saleAmount || 0), 0).toLocaleString('en-IN')}`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
