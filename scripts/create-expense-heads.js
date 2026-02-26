// Create Expense Head Ledgers for FY 2024-25
// Groups: Direct Expenses, Indirect Expenses, Office Expenses, Travelling Expenses
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DB_NAME = 'swaryoga_admin_crm';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(DB_NAME);
  const col = db.collection('acc_ledgers');

  const FY = '2024-25';
  const now = new Date();

  // Define all expense heads with sub-groups
  const expenseHeads = [
    // ── DIRECT EXPENSES ──
    { name: 'Advertisement & Marketing',  group: 'EXPENSE', subGroup: 'Direct Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Facebook Ads, Google Ads, Meta Ads' },
    { name: 'Printing & Stationery',      group: 'EXPENSE', subGroup: 'Direct Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Xerox, printing, stationery items' },
    { name: 'Event & Workshop Expenses',  group: 'EXPENSE', subGroup: 'Direct Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Workshop venue, materials, event costs' },

    // ── INDIRECT EXPENSES ──
    { name: 'Bank Charges & Commission',  group: 'EXPENSE', subGroup: 'Indirect Expenses',   openingBalance: 0, balanceType: 'Dr', description: 'IMPS charges, card fees, POS charges' },
    { name: 'Software & Subscriptions',   group: 'EXPENSE', subGroup: 'Indirect Expenses',   openingBalance: 0, balanceType: 'Dr', description: 'Zoom, Canva, Google Workspace, JioCinema' },
    { name: 'Interest & Finance Charges', group: 'EXPENSE', subGroup: 'Indirect Expenses',   openingBalance: 0, balanceType: 'Dr', description: 'Loan interest, EMI charges' },
    { name: 'Miscellaneous Expenses',     group: 'EXPENSE', subGroup: 'Indirect Expenses',   openingBalance: 0, balanceType: 'Dr', description: 'Other uncategorized expenses' },

    // ── OFFICE EXPENSES ──
    { name: 'Rent',                       group: 'EXPENSE', subGroup: 'Office Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Office/studio rent' },
    { name: 'Electricity Charges',        group: 'EXPENSE', subGroup: 'Office Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'MSEDCL electricity bills' },
    { name: 'Internet & Telephone',       group: 'EXPENSE', subGroup: 'Office Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Jio, Airtel, broadband' },
    { name: 'Office Supplies',            group: 'EXPENSE', subGroup: 'Office Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Amazon office purchases, supplies' },
    { name: 'Repairs & Maintenance',      group: 'EXPENSE', subGroup: 'Office Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'AC repair, equipment maintenance' },

    // ── TRAVELLING EXPENSES ──
    { name: 'Travelling Expenses',        group: 'EXPENSE', subGroup: 'Travelling Expenses', openingBalance: 0, balanceType: 'Dr', description: 'Train (IRCTC), Bus (RedBus), flights' },
    { name: 'Fuel & Conveyance',          group: 'EXPENSE', subGroup: 'Travelling Expenses', openingBalance: 0, balanceType: 'Dr', description: 'Petrol, diesel, local conveyance' },
    { name: 'Food & Refreshment',         group: 'EXPENSE', subGroup: 'Travelling Expenses', openingBalance: 0, balanceType: 'Dr', description: 'Zomato, hotel food during travel' },

    // ── SALARY & STAFF ──
    { name: 'Salary & Wages',             group: 'EXPENSE', subGroup: 'Direct Expenses',     openingBalance: 0, balanceType: 'Dr', description: 'Staff salary payments via IMPS/UPI' },

    // ── MEDICAL ──
    { name: 'Medical Expenses',           group: 'EXPENSE', subGroup: 'Indirect Expenses',   openingBalance: 0, balanceType: 'Dr', description: 'Medical, pharmacy, doctor visits' },

    // ── DRAWINGS (Capital, not expense) ──
    { name: 'Directors Drawings',         group: 'CAPITAL', subGroup: 'Drawings',            openingBalance: 0, balanceType: 'Dr', description: 'Personal withdrawals by directors (Mohan Pandurang, Laxmi Mohan)' },
  ];

  let created = 0;
  let skipped = 0;

  for (const head of expenseHeads) {
    // Check if already exists
    const existing = await col.findOne({ name: head.name, financialYear: FY });
    if (existing) {
      console.log(`SKIP (exists): ${head.name}`);
      skipped++;
      continue;
    }

    await col.insertOne({
      name: head.name,
      group: head.group,
      subGroup: head.subGroup,
      financialYear: FY,
      openingBalance: head.openingBalance,
      balanceType: head.balanceType,
      description: head.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`CREATED: ${head.name} (${head.group} > ${head.subGroup})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);

  // Show final count
  const all = await col.find({ financialYear: FY, group: 'EXPENSE' }).toArray();
  console.log(`\nTotal EXPENSE ledgers: ${all.length}`);
  all.forEach(l => console.log(`  ${l.subGroup} > ${l.name}`));

  const cap = await col.find({ financialYear: FY, group: 'CAPITAL', subGroup: 'Drawings' }).toArray();
  if (cap.length) {
    console.log(`\nDrawings ledger:`);
    cap.forEach(l => console.log(`  ${l.group} > ${l.subGroup} > ${l.name}`));
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
