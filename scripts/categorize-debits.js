// Categorize all bank debits per user's rules:
// 1. Mohan Kalburgi Remuneration: ₹75,000/month
// 2. Upamanyu Kalburgi Remuneration: ₹36,000/month
// 3. Resort Project Investment: Amount Receivable (asset)
// 4. Remaining family payments (Mohan, Laxmi, Turya, Suhas, Pandurang): Directors Drawings
// 5. Monthly cash expenses: Rent ₹3,500, Light bill, Net ₹900, Mobile recharge
// 6. Payments > ₹1,000 rest: General Payment from ₹3,25,000 Liability
// 7. Small payments < ₹1,000: categorize into expense heads

const fs = require('fs');

const text = fs.readFileSync('/tmp/bank_statement.txt', 'utf8');
const lines = text.split('\n');

const allTxns = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/^\s*(\d+)\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
  if (!m) continue;
  
  const sn = parseInt(m[1]);
  const date = m[2];
  let rest = m[3];
  
  const amounts = [];
  const amtRegex = /([\d,]+\.\d{2})/g;
  let am;
  while ((am = amtRegex.exec(rest)) !== null) {
    amounts.push({ val: parseFloat(am[1].replace(/,/g, '')), pos: am.index });
  }
  
  if (amounts.length < 2) continue;
  
  const balance = amounts[amounts.length - 1].val;
  const descEnd = amounts[0].pos;
  let desc = rest.substring(0, descEnd).trim();
  
  if (amounts.length === 2) {
    const amount = amounts[0].val;
    allTxns.push({ sn, date, desc, amount, balance, lineNum: i });
  } else if (amounts.length >= 3) {
    const debit = amounts[0].val;
    allTxns.push({ sn, date, desc, amount: debit, balance, lineNum: i });
  }
}

allTxns.sort((a, b) => a.sn - b.sn);

let prevBalance = 37440.78;
const debits = [];

for (const txn of allTxns) {
  const diff = txn.balance - prevBalance;
  if (Math.abs(diff + txn.amount) < 1) {
    txn.type = 'debit';
    debits.push(txn);
  }
  prevBalance = txn.balance;
}

// ── CATEGORIZATION RULES ──

const categories = {
  'Director Remuneration - Mohan Kalburgi': { ledger: 'Director Remuneration - Mohan Kalburgi', group: 'EXPENSE', subGroup: 'Direct Expenses', items: [], desc: '₹75,000/month' },
  'Director Remuneration - Upamanyu Kalburgi': { ledger: 'Director Remuneration - Upamanyu Kalburgi', group: 'EXPENSE', subGroup: 'Direct Expenses', items: [], desc: '₹36,000/month' },
  'Resort Project Investment': { ledger: 'Resort Project Investment', group: 'ASSET', subGroup: 'Current Assets', items: [], desc: 'Amount Receivable' },
  'Directors Drawings': { ledger: 'Directors Drawings', group: 'CAPITAL', subGroup: 'Drawings', items: [], desc: 'Family - Mohan, Laxmi, Turya, Suhas, Pandurang' },
  'Advertisement & Marketing': { items: [] },
  'Bank Charges & Commission': { items: [] },
  'Software & Subscriptions': { items: [] },
  'Electricity Charges': { items: [] },
  'Internet & Telephone': { items: [] },
  'Fuel & Conveyance': { items: [] },
  'Travelling Expenses': { items: [] },
  'Food & Refreshment': { items: [] },
  'Office Supplies': { items: [] },
  'Medical Expenses': { items: [] },
  'Rent': { items: [] },
  'Salary & Wages': { items: [] },
  'Repairs & Maintenance': { items: [] },
  'Miscellaneous Expenses': { items: [] },
  'Liability Payment (₹3,25,000)': { ledger: 'Short-Term Provisions', items: [], desc: 'General payments > ₹1,000 from liability' },
};

// Cash Deposit (Contra) - already handled
const cashDeposits = [];
// Reversals
const reversals = [];

for (const d of debits) {
  const desc = d.desc.toUpperCase();
  
  // Skip Cash deposits (already Contra entries)
  if (desc.includes('CASH DEPOSIT')) {
    cashDeposits.push(d);
    continue;
  }
  
  // Reversals
  if (desc.includes('REV-')) {
    reversals.push(d);
    continue;
  }

  // ── 1. MOHAN PANDURANG (Director) payments ──
  if (desc.includes('MOHAN PANDURANG') || (desc.startsWith('UPI/MOHAN') && !desc.includes('UPAMANYU'))) {
    // These are Mohan Kalburgi's drawings/remuneration
    categories['Directors Drawings'].items.push(d);
    continue;
  }

  // ── 2. UPAMANYU MOHAN payments ──
  if (desc.includes('UPAMANYU MOHAN') || desc.includes('UPAMANYU') || desc.includes('UPAMNYU')) {
    categories['Directors Drawings'].items.push(d);
    continue;
  }

  // ── 3. LAXMI MOHAN KAL payments ──
  if (desc.includes('LAXMI MOHAN')) {
    categories['Directors Drawings'].items.push(d);
    continue;
  }

  // ── 4. TURYA MOHAN KAL ──
  if (desc.includes('TURYA MOHAN')) {
    categories['Directors Drawings'].items.push(d);
    continue;
  }

  // ── 5. PANDURANG KRISH (Pandurang Kalburgi) ──
  if (desc.includes('PANDURANG KRISH')) {
    categories['Directors Drawings'].items.push(d);
    continue;
  }

  // ── 6. ARVIND KALBURGI ──
  if (desc.includes('ARVIND KALBURGI') || desc.includes('ARVIND')) {
    categories['Directors Drawings'].items.push(d);
    continue;
  }

  // ── Facebook/Meta/Google Ads ──
  if (desc.includes('FACEBOOK') || desc.includes('META') || desc.includes('GOOGLE ADS') || desc.includes('FACEBOOKADS')) {
    categories['Advertisement & Marketing'].items.push(d);
    continue;
  }

  // ── Bank Charges ──
  if (desc.includes('CHG:') || desc.includes('CHRG:') || desc.includes('CHARGES') || desc.includes('ANNUAL FEE') || desc.includes('POS DECL')) {
    categories['Bank Charges & Commission'].items.push(d);
    continue;
  }

  // ── Software/Subscriptions ──
  if (desc.includes('ZOOM') || desc.includes('CANVA') || desc.includes('GOOGLE') || desc.includes('JIOCINEMA')) {
    categories['Software & Subscriptions'].items.push(d);
    continue;
  }

  // ── Electricity (MSEDCL) ──
  if (desc.includes('MSEDCL') || desc.includes('BESCOM') || desc.includes('ELECTRIC')) {
    categories['Electricity Charges'].items.push(d);
    continue;
  }

  // ── Internet/Phone ──
  if (desc.includes('JIO PREPAID') || desc.includes('AIRTEL') || desc.includes('JIOPREPAID') || desc.includes('BSNL') || desc.includes('VODAFONE')) {
    categories['Internet & Telephone'].items.push(d);
    continue;
  }

  // ── Fuel ──
  if (desc.includes('PETROL') || desc.includes('FUEL') || desc.includes('BPCL') || desc.includes('IOCL') || desc.includes('INDIAN OIL') || desc.includes('HP PETROL') || desc.includes('RELIANCE BP')) {
    categories['Fuel & Conveyance'].items.push(d);
    continue;
  }

  // ── Travel ──
  if (desc.includes('IRCTC') || desc.includes('REDBUS') || desc.includes('RAILWAY') || desc.includes('KSRTC') || desc.includes('IBIBOGROUP')) {
    categories['Travelling Expenses'].items.push(d);
    continue;
  }

  // ── Food ──
  if (desc.includes('ZOMATO') || desc.includes('SWIGGY') || desc.includes('DOMINOS') || desc.includes('FOOD') || desc.includes('HOTEL GREEN') || desc.includes('HOTEL JT') || desc.includes('ANAND KULFI')) {
    categories['Food & Refreshment'].items.push(d);
    continue;
  }

  // ── Amazon / Online Shopping ──
  if (desc.includes('AMAZON') || desc.includes('FLIPKART') || desc.includes('RELIANCE DIGITA')) {
    categories['Office Supplies'].items.push(d);
    continue;
  }

  // ── Medical ──
  if (desc.includes('MEDICAL') || desc.includes('PHARMA') || desc.includes('HOSPITAL') || desc.includes('AYURVED')) {
    categories['Medical Expenses'].items.push(d);
    continue;
  }

  // ── IMPS transfers (named people - Salary/Wages or related party) ──
  if (desc.includes('SENTIMPS') || desc.includes('IMPS-')) {
    // Parse name from IMPS
    const impsMatch = desc.match(/SENTIMPS\d+(\w+)/i);
    const name = impsMatch ? impsMatch[1].toUpperCase() : '';
    
    if (['MOHAN','UPAMNYU','UPAMANYU','SWAR','KAILAS'].includes(name)) {
      // Family/company related
      if (name === 'SWAR') {
        // Transfer to company account
        categories['Directors Drawings'].items.push(d);
      } else if (name === 'KAILAS') {
        categories['Salary & Wages'].items.push(d);
      } else {
        categories['Directors Drawings'].items.push(d);
      }
    } else if (['PRAMOD','MAHI','MINAKSHI','VISHAL','SANTOSH','MAHESH'].includes(name)) {
      categories['Salary & Wages'].items.push(d);
    } else {
      categories['Miscellaneous Expenses'].items.push(d);
    }
    continue;
  }

  // ── Rent (Rahane, Saroday Nagari) ──
  if (desc.includes('SARODAY') || desc.includes('RAHANE')) {
    categories['Rent'].items.push(d);
    continue;
  }

  // ── Car/Vehicle ──
  if (desc.includes('CAR C') || desc.includes('VEHICLE')) {
    categories['Repairs & Maintenance'].items.push(d);
    continue;
  }

  // ── REMAINING: Categorize by amount ──
  // > ₹1,000: General payment from liability
  // < ₹1,000: Miscellaneous
  if (d.amount > 1000) {
    categories['Liability Payment (₹3,25,000)'].items.push(d);
  } else {
    categories['Miscellaneous Expenses'].items.push(d);
  }
}

// ── PRINT SUMMARY ──
console.log('══════════════════════════════════════════════════════════════');
console.log('  BANK DEBIT CATEGORIZATION PLAN - FY 2024-25');
console.log('══════════════════════════════════════════════════════════════');
console.log(`Total bank debits: ${debits.length} txns = ₹${debits.reduce((s,d) => s + d.amount, 0).toFixed(2)}\n`);

let grandTotal = 0;
let categorized = 0;

for (const [cat, data] of Object.entries(categories)) {
  if (data.items.length === 0) continue;
  const total = data.items.reduce((s, d) => s + d.amount, 0);
  grandTotal += total;
  categorized += data.items.length;
  
  console.log(`\n┌─ ${cat}: ${data.items.length} txns = ₹${total.toFixed(2)}`);
  if (data.desc) console.log(`│  ${data.desc}`);
  data.items.forEach(d => {
    console.log(`│  ${d.sn} | ${d.date} | ₹${d.amount.toFixed(2)} | ${d.desc.substring(0, 60)}`);
  });
  console.log(`└─────────────────────────────────────────────`);
}

console.log(`\nReversals: ${reversals.length} txns = ₹${reversals.reduce((s,d) => s+d.amount, 0).toFixed(2)}`);
reversals.forEach(d => console.log(`  ${d.sn} | ${d.date} | ₹${d.amount} | ${d.desc.substring(0,60)}`));

console.log(`\nCash Deposits (already Contra): ${cashDeposits.length} txns = ₹${cashDeposits.reduce((s,d) => s+d.amount, 0).toFixed(2)}`);

console.log(`\n══════════════════════════════════════════════════════════════`);
console.log(`SUMMARY:`);
console.log(`  Categorized: ${categorized} txns = ₹${grandTotal.toFixed(2)}`);
console.log(`  Reversals:   ${reversals.length} txns`);
console.log(`  Cash Dep:    ${cashDeposits.length} txns (already in Contra)`);
console.log(`  Total:       ${categorized + reversals.length + cashDeposits.length} / ${debits.length}`);
console.log(`══════════════════════════════════════════════════════════════`);

// Directors Drawings detail
const dd = categories['Directors Drawings'].items;
console.log('\n── DIRECTORS DRAWINGS BREAKDOWN ──');
const ddByPerson = {};
dd.forEach(d => {
  const desc = d.desc.toUpperCase();
  let person = 'Other';
  if (desc.includes('MOHAN PANDURANG') || desc.match(/^UPI\/MOHAN\s/)) person = 'Mohan Kalburgi';
  else if (desc.includes('UPAMANYU') || desc.includes('UPAMNYU')) person = 'Upamanyu Kalburgi';
  else if (desc.includes('LAXMI MOHAN')) person = 'Laxmi Kalburgi';
  else if (desc.includes('TURYA MOHAN')) person = 'Turya Kalburgi';
  else if (desc.includes('PANDURANG KRISH')) person = 'Pandurang Kalburgi';
  else if (desc.includes('ARVIND')) person = 'Arvind Kalburgi';
  else if (desc.includes('SENTIMPS') && desc.includes('SWAR')) person = 'Swar Yoga (Self Transfer)';
  if (!ddByPerson[person]) ddByPerson[person] = { count: 0, total: 0 };
  ddByPerson[person].count++;
  ddByPerson[person].total += d.amount;
});
Object.entries(ddByPerson).sort((a,b) => b[1].total - a[1].total).forEach(([p, v]) => {
  console.log(`  ${p}: ${v.count} txns = ₹${v.total.toFixed(2)}`);
});
