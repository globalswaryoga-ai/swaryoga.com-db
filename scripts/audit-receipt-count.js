// Quick script to count receipts/vouchers for CA audit
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) { console.error('No MONGODB_URI_MAIN'); process.exit(1); }
  
  const client = new MongoClient(uri);
  await client.connect();
  
  const crmDb = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const mainDb = client.db('swaryogaDB');
  
  // Determine FY (Apr-Mar). Current date context: Feb 2026 → FY 2025-26
  const fys = ['2023-24', '2024-25', '2025-26'];
  
  console.log('=== RECEIPT / VOUCHER COUNTS FOR CA AUDIT ===\n');
  
  // 1. CRM Receipts (crm_receipts)
  const receipts = crmDb.collection('crm_receipts');
  const totalReceipts = await receipts.countDocuments();
  console.log(`📄 CRM Receipts (crm_receipts): ${totalReceipts} total`);
  
  // Group by FY based on issuedAt date
  const receiptsByFY = await receipts.aggregate([
    {
      $addFields: {
        fy: {
          $cond: {
            if: { $gte: [{ $month: '$issuedAt' }, 4] },
            then: { $concat: [{ $toString: { $year: '$issuedAt' } }, '-', { $substr: [{ $toString: { $add: [{ $year: '$issuedAt' }, 1] } }, 2, 2] }] },
            else: { $concat: [{ $toString: { $subtract: [{ $year: '$issuedAt' }, 1] } }, '-', { $substr: [{ $toString: { $year: '$issuedAt' } }, 2, 2] }] }
          }
        }
      }
    },
    { $group: { _id: '$fy', count: { $sum: 1 }, totalAmount: { $sum: '$payment.amount' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  
  for (const r of receiptsByFY) {
    console.log(`   FY ${r._id}: ${r.count} receipts, ₹${(r.totalAmount || 0).toLocaleString('en-IN')}`);
  }
  
  // 2. Tally Manual Vouchers (tally_manual_vouchers) - Receipt type
  const vouchers = crmDb.collection('tally_manual_vouchers');
  const totalVouchers = await vouchers.countDocuments();
  console.log(`\n📋 Tally Manual Vouchers (tally_manual_vouchers): ${totalVouchers} total`);
  
  const vouchersByTypeAndFY = await vouchers.aggregate([
    { $group: { _id: { fy: '$financialYear', type: '$voucherType' }, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    { $sort: { '_id.fy': 1, '_id.type': 1 } }
  ]).toArray();
  
  let currentFY = '';
  for (const v of vouchersByTypeAndFY) {
    if (v._id.fy !== currentFY) {
      currentFY = v._id.fy;
      console.log(`   FY ${currentFY}:`);
    }
    console.log(`     ${v._id.type}: ${v.count} vouchers, ₹${(v.totalAmount || 0).toLocaleString('en-IN')}`);
  }
  
  // 3. Tally Payments (tally_payments) - synced from Tally Prime
  const tallyPayments = crmDb.collection('tally_payments');
  const totalTallyPayments = await tallyPayments.countDocuments();
  console.log(`\n💰 Tally Payments (tally_payments): ${totalTallyPayments} total`);
  
  if (totalTallyPayments > 0) {
    const tallyPaymentsByFY = await tallyPayments.aggregate([
      {
        $addFields: {
          fy: {
            $cond: {
              if: { $gte: [{ $month: '$paymentDate' }, 4] },
              then: { $concat: [{ $toString: { $year: '$paymentDate' } }, '-', { $substr: [{ $toString: { $add: [{ $year: '$paymentDate' }, 1] } }, 2, 2] }] },
              else: { $concat: [{ $toString: { $subtract: [{ $year: '$paymentDate' }, 1] } }, '-', { $substr: [{ $toString: { $year: '$paymentDate' } }, 2, 2] }] }
            }
          }
        }
      },
      { $group: { _id: '$fy', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    for (const p of tallyPaymentsByFY) {
      console.log(`   FY ${p._id}: ${p.count} payments, ₹${(p.totalAmount || 0).toLocaleString('en-IN')}`);
    }
  }
  
  // 4. Sales Reports (sales_reports)
  const sales = crmDb.collection('sales_reports');
  const totalSales = await sales.countDocuments();
  console.log(`\n🧾 Sales Reports (sales_reports): ${totalSales} total`);
  
  if (totalSales > 0) {
    const salesByFY = await sales.aggregate([
      {
        $addFields: {
          fy: {
            $cond: {
              if: { $gte: [{ $month: '$saleDate' }, 4] },
              then: { $concat: [{ $toString: { $year: '$saleDate' } }, '-', { $substr: [{ $toString: { $add: [{ $year: '$saleDate' }, 1] } }, 2, 2] }] },
              else: { $concat: [{ $toString: { $subtract: [{ $year: '$saleDate' }, 1] } }, '-', { $substr: [{ $toString: { $year: '$saleDate' } }, 2, 2] }] }
            }
          }
        }
      },
      { $group: { _id: '$fy', count: { $sum: 1 }, totalAmount: { $sum: '$saleAmount' } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    for (const s of salesByFY) {
      console.log(`   FY ${s._id}: ${s.count} sales, ₹${(s.totalAmount || 0).toLocaleString('en-IN')}`);
    }
  }
  
  // 5. Expenses (expenses)
  const expenses = crmDb.collection('expenses');
  const totalExpenses = await expenses.countDocuments();
  console.log(`\n💸 Expenses (expenses): ${totalExpenses} total`);
  
  if (totalExpenses > 0) {
    const expensesByFY = await expenses.aggregate([
      {
        $addFields: {
          fy: {
            $cond: {
              if: { $gte: [{ $month: '$date' }, 4] },
              then: { $concat: [{ $toString: { $year: '$date' } }, '-', { $substr: [{ $toString: { $add: [{ $year: '$date' }, 1] } }, 2, 2] }] },
              else: { $concat: [{ $toString: { $subtract: [{ $year: '$date' }, 1] } }, '-', { $substr: [{ $toString: { $year: '$date' } }, 2, 2] }] }
            }
          }
        }
      },
      { $group: { _id: '$fy', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    for (const e of expensesByFY) {
      console.log(`   FY ${e._id}: ${e.count} expenses, ₹${(e.totalAmount || 0).toLocaleString('en-IN')}`);
    }
  }
  
  // 6. Main DB - orders/payments (if any)
  const collections = await mainDb.listCollections().toArray();
  const collNames = collections.map(c => c.name);
  const paymentColls = collNames.filter(n => /payment|order|transaction|receipt/i.test(n));
  if (paymentColls.length > 0) {
    console.log(`\n📦 Main DB payment-related collections: ${paymentColls.join(', ')}`);
    for (const col of paymentColls) {
      const count = await mainDb.collection(col).countDocuments();
      console.log(`   ${col}: ${count} documents`);
    }
  }
  
  // 7. Leads with payment info (enrolled/sales status)
  const leads = crmDb.collection('leads');
  const paidLeads = await leads.countDocuments({ 'payment.status': { $in: ['paid', 'completed', 'success'] } });
  const enrolledLeads = await leads.countDocuments({ stage: { $in: ['enrolled', 'sales'] } });
  console.log(`\n👥 Leads with payments: ${paidLeads} paid, ${enrolledLeads} enrolled/sales stage`);
  
  // Summary
  console.log('\n=== SUMMARY FOR CA ===');
  const receiptVouchers = vouchersByTypeAndFY.filter(v => v._id.type === 'Receipt');
  const paymentVouchers = vouchersByTypeAndFY.filter(v => v._id.type === 'Payment');
  const totalReceiptVouchers = receiptVouchers.reduce((s, v) => s + v.count, 0);
  const totalPaymentVouchers = paymentVouchers.reduce((s, v) => s + v.count, 0);
  
  console.log(`Total CRM Receipts: ${totalReceipts}`);
  console.log(`Total Receipt Vouchers (Tally): ${totalReceiptVouchers}`);
  console.log(`Total Payment Vouchers (Tally): ${totalPaymentVouchers}`);
  console.log(`Total All Vouchers (Tally): ${totalVouchers}`);
  console.log(`Total Sales Reports: ${totalSales}`);
  console.log(`Total Expenses: ${totalExpenses}`);
  console.log(`Total Tally Payments synced: ${totalTallyPayments}`);
  
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
