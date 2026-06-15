// Backfill retroactive invoice/receipt numbers (format YYMMSWNNN, e.g. "2606SW001")
// for sales_reports documents that don't have a receiptNumber yet.
//
// Numbers are assigned per calendar month (based on saleDate, falling back to
// createdAt), in chronological order, continuing from any sequence numbers
// already in use for that month (e.g. assigned to newer sales created after
// this feature shipped). The crm_counters doc for each month is bumped to
// match so future generateInvoiceNumber() calls don't collide.
//
// Usage:
//   node scripts/backfill-invoice-numbers.js            (dry run — prints plan only)
//   node scripts/backfill-invoice-numbers.js --apply    (writes changes)

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');

function yymmOf(date) {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) { console.error('No MONGODB_URI_MAIN'); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const sales = db.collection('sales_reports');
  const counters = db.collection('crm_counters');

  console.log(APPLY ? '=== APPLYING invoice number backfill ===\n' : '=== DRY RUN (pass --apply to write) ===\n');

  // Existing receipt numbers already in the new format, to seed starting sequences.
  const existing = await sales.find(
    { receiptNumber: { $regex: /^\d{4}SW\d+$/ } },
    { projection: { receiptNumber: 1 } }
  ).toArray();

  const maxSeqByMonth = new Map(); // yymm -> max seq already used
  for (const doc of existing) {
    const m = doc.receiptNumber.match(/^(\d{4})SW(\d+)$/);
    if (!m) continue;
    const [, yymm, seqStr] = m;
    const seq = parseInt(seqStr, 10);
    maxSeqByMonth.set(yymm, Math.max(maxSeqByMonth.get(yymm) || 0, seq));
  }

  // Sales missing a receipt number, oldest first.
  const missing = await sales.find(
    { $or: [{ receiptNumber: { $exists: false } }, { receiptNumber: null }, { receiptNumber: '' }] },
    { projection: { saleDate: 1, createdAt: 1 } }
  ).sort({ saleDate: 1, createdAt: 1, _id: 1 }).toArray();

  console.log(`Found ${missing.length} sales without a receiptNumber.\n`);

  // Group chronologically by month.
  const byMonth = new Map(); // yymm -> [docs]
  for (const doc of missing) {
    const yymm = yymmOf(doc.saleDate || doc.createdAt);
    if (!byMonth.has(yymm)) byMonth.set(yymm, []);
    byMonth.get(yymm).push(doc);
  }

  const sortedMonths = Array.from(byMonth.keys()).sort();
  let totalAssigned = 0;

  for (const yymm of sortedMonths) {
    const docs = byMonth.get(yymm);
    let seq = maxSeqByMonth.get(yymm) || 0;

    const ops = [];
    for (const doc of docs) {
      seq += 1;
      const receiptNumber = `${yymm}SW${String(seq).padStart(3, '0')}`;
      ops.push({ _id: doc._id, receiptNumber });
    }

    console.log(`Month ${yymm}: assigning ${ops.length} number(s), ${ops[0].receiptNumber} → ${ops[ops.length - 1].receiptNumber}`);

    if (APPLY) {
      const bulk = sales.initializeUnorderedBulkOp();
      for (const op of ops) {
        bulk.find({ _id: op._id }).updateOne({ $set: { receiptNumber: op.receiptNumber } });
      }
      await bulk.execute();

      await counters.updateOne(
        { _id: `invoiceNumber:${yymm}` },
        { $max: { seq } },
        { upsert: true }
      );
    }

    totalAssigned += ops.length;
  }

  console.log(`\n${APPLY ? 'Assigned' : 'Would assign'} ${totalAssigned} receipt number(s) across ${sortedMonths.length} month(s).`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
