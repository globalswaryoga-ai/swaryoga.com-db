#!/usr/bin/env node
/**
 * Move generated/imported sales from `sales` collection (wrong collection)
 * into `sales_reports` (the collection the Sales API actually reads).
 * Also removes the 9 old stale sales_reports entries first.
 *
 * Run: node scripts/migrate-sales-to-sales_reports.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const oldSales = db.collection('sales');
  const reports = db.collection('sales_reports');

  // Remove old stale entries
  const delOld = await reports.deleteMany({});
  console.log(`Removed ${delOld.deletedCount} old sales_reports entries`);

  // Pull everything from the (wrong) `sales` collection
  const docs = await oldSales.find({}).toArray();
  console.log(`Found ${docs.length} docs in 'sales' collection to migrate`);

  const now = new Date();
  const records = docs.map((d) => ({
    customerName: d.customerName,
    customerPhone: d.customerPhone || '',
    workshopName: d.workshopName,
    saleAmount: d.saleAmount,
    paidAmount: d.paidAmount ?? d.saleAmount,
    dueAmount: d.dueAmount ?? 0,
    paymentType: d.paymentType || 'full',
    paymentHistory: [],
    currency: 'INR',
    status: d.status || 'completed',
    labels: d.labels || [],
    paymentMode: d.paymentMode || 'bank_transfer',
    saleDate: d.saleDate,
    reportedByUserId: 'admincrm',
    targetAchieved: false,
    superAdminApproved: false,
    conversionPath: [],
    metadata: { reportedByUserId: 'admincrm', migratedFrom: 'sales', sourceLabels: d.labels || [] },
    createdAt: now,
    updatedAt: now,
  }));

  const res = await reports.insertMany(records);
  console.log(`Inserted ${res.insertedCount} into sales_reports`);

  const total = await reports.aggregate([
    { $group: { _id: null, sum: { $sum: '$saleAmount' }, count: { $sum: 1 } } },
  ]).toArray();
  console.log(`sales_reports now: ${total[0].count} entries, total ₹${total[0].sum.toLocaleString('en-IN')}`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
