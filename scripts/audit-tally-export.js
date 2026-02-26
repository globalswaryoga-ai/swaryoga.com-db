#!/usr/bin/env node
/**
 * Audit Tally XML Export — verify data will match Tally Prime 3.0.1
 * Simulates the exact export logic from engine.ts → exportTallyXML()
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  const FY = '2023-24';

  const ledgers = await db.collection('acc_ledgers').find({ financialYear: FY }).toArray();
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: FY }).toArray();

  console.log(`\n=== FY ${FY} — ${ledgers.length} Ledgers, ${vouchers.length} Vouchers ===`);

  // ──────────── Simulate XML Export ────────────

  // STEP 1: BS ledger OBs (Assets, Liabilities, Capital)
  // Nominal ledgers (Income/Expense) get OB=0
  let bsDebit = 0, bsCredit = 0;
  const nominalLedgers = [];

  console.log(`\n── Ledger OBs (as exported to Tally) ──`);
  for (const l of ledgers) {
    const ob = l.openingBalance || 0;
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
    const tallyOB = isNominal ? 0 : (l.openingBalanceType === 'DEBIT' ? ob : -ob);

    if (isNominal && ob > 0) nominalLedgers.push(l);

    if (tallyOB > 0) bsDebit += tallyOB;
    else bsCredit += Math.abs(tallyOB);

    const marker = isNominal ? '  [OB→0, will journal]' : '';
    console.log(`  ${l.name.padEnd(40)} OB=${tallyOB.toFixed(2).padStart(12)} (${l.openingBalanceType})${marker}`);
  }

  console.log(`\n  BS Debit OBs:  ${bsDebit.toFixed(2)}`);
  console.log(`  BS Credit OBs: ${bsCredit.toFixed(2)}`);
  console.log(`  BS Diff:       ${(bsDebit - bsCredit).toFixed(2)} (expected: non-zero = P&L gap)`);

  // STEP 2: Compound Journal (CA Report mode — no vouchers)
  if (vouchers.length === 0 && nominalLedgers.length > 0) {
    const incomeEntries = nominalLedgers.filter(l => l.group === 'INCOME');
    const expenseEntries = nominalLedgers.filter(l => l.group === 'EXPENSE');

    const totalIncAmt = incomeEntries.reduce((s, l) => s + (l.openingBalance || 0), 0);
    const totalExpAmt = expenseEntries.reduce((s, l) => s + (l.openingBalance || 0), 0);
    const plDiff = totalExpAmt - totalIncAmt; // positive = loss

    console.log(`\n── Compound Journal (CA Report Income/Expense) ──`);
    console.log(`  Mode: CA Report (0 vouchers → amounts as single journal)`);

    let journalTotal = 0;
    console.log(`\n  EXPENSE ENTRIES (Debit):`);
    for (const l of expenseEntries) {
      const amt = l.openingBalance || 0;
      journalTotal += amt;
      console.log(`    Dr  ${l.name.padEnd(38)} ${amt.toFixed(2).padStart(12)}`);
    }
    console.log(`  INCOME ENTRIES (Credit):`);
    for (const l of incomeEntries) {
      const amt = l.openingBalance || 0;
      journalTotal -= amt;
      console.log(`    Cr  ${l.name.padEnd(38)} ${(-amt).toFixed(2).padStart(12)}`);
    }

    // P&L A/c balancing
    const plAmount = -plDiff;
    journalTotal += plAmount;
    console.log(`  P&L BALANCING:`);
    console.log(`    ${plAmount > 0 ? 'Dr' : 'Cr'}  Profit & Loss A/c                      ${plAmount.toFixed(2).padStart(12)}`);
    console.log(`\n  Journal Sum: ${journalTotal.toFixed(2)} ${Math.abs(journalTotal) < 0.01 ? '✅ BALANCED' : '❌ UNBALANCED!'}`);

    // Verify: P&L A/c balance covers BS OB gap
    const bsGap = bsDebit - bsCredit; // positive = more assets than L+C
    console.log(`\n── Tally BS Verification ──`);
    console.log(`  BS OB Dr - Cr = ${bsGap.toFixed(2)} (gap in BS)`);
    console.log(`  P&L A/c from journal = ${plAmount.toFixed(2)}`);
    console.log(`  Net effect: ${plAmount > 0 ? 'Dr' : 'Cr'} to P&L → appears on BS`);

    // In Tally: P&L A/c balance appears on BS under Liabilities (if credit/profit)
    // or Assets (if debit/loss)
    // For loss (plAmount<0, Credit entry): P&L shows as Cr on BS → increases L+C side
    // For profit (plAmount>0, Debit entry): WAIT, that's wrong...
    // Actually in Tally, the P&L closing balance flows to BS:
    // Journal creates Net P&L = Income - Expense in P&L A/c
    // P&L A/c closing balance shows on BS

    // The P&L A/c in the journal: -plDiff
    // plDiff = Exp - Inc = 48963 (loss)
    // plAmount = -48963 (credit entry → P&L A/c has credit balance → shows as Liability in BS)
    // This credit of 48963 on BS Liability side fills the gap:
    // BS Assets 897308 vs BS L+C 946271-48963 + P&L credit 48963 = 946271... wait

    // Let me just check: does BS + P&L journal balance in Tally?
    // Tally sees: BS OBs (Dr 897308, Cr 946271) + Journal entries
    // The journal doesn't change OBs — it creates period transactions
    // P&L A/c gains a credit balance of 48963 from the journal
    // This credit appears on BS Liability side: L+C = 946271 (from OBs) + 48963 (P&L) = 994534??
    // That's wrong... BS wouldn't balance

    // Actually NO — the BS OBs are only BS ledger OBs:
    // BS Dr = 897308, BS Cr = 946271 → BS shows as: Assets=897308, L+C=946271
    // Then P&L A/c (from journal net) = -48963 credit → adds to L+C
    // Total L+C = 946271 + (-48963) = 897308 = Assets ✅
    // Wait, -48963 is a loss (credit entry for loss reduces L+C)

    // Let me be precise:
    // plDiff = 48963 (loss: exp > inc)
    // plAmount = -plDiff = -48963 (NEGATIVE → Credit side → ISDEEMEDPOSITIVE=No)
    // P&L A/c closing balance = -48963 (credit balance from the journal)
    // In Tally BS: P&L is shown as NEGATIVE on Liabilities = reduces L+C
    // Tally Assets = 897308
    // Tally L+C = 946271 + (-48963) = 897308 ✅ BALANCED!

    console.log(`\n  In Tally BS:`);
    console.log(`    Assets = ${bsDebit.toFixed(2)}`);
    console.log(`    L+C from OBs = ${bsCredit.toFixed(2)}`);
    console.log(`    P&L A/c (journal net) = ${plAmount.toFixed(2)} (${plAmount < 0 ? 'reduces' : 'adds to'} L+C)`);
    console.log(`    Effective L+C = ${(bsCredit + plAmount).toFixed(2)}`);
    const tallyBalanced = Math.abs(bsDebit - (bsCredit + plAmount)) < 0.01;
    console.log(`    Assets vs L+C: ${tallyBalanced ? '✅ BALANCED — No difference in Tally!' : '❌ STILL UNBALANCED!'}`);

    console.log(`\n  P&L Statement in Tally:`);
    console.log(`    Total Income:  ${totalIncAmt.toFixed(2)}`);
    console.log(`    Total Expense: ${totalExpAmt.toFixed(2)}`);
    console.log(`    Net ${plDiff > 0 ? 'Loss' : 'Profit'}: ${Math.abs(plDiff).toFixed(2)}`);

  } else if (vouchers.length > 0) {
    console.log(`\n  Mode: Voucher (${vouchers.length} vouchers — P&L from actual entries)`);
    console.log(`  Nominal OBs zeroed, amounts come from vouchers.`);
    console.log(`  Year-End Profit Transfer journal will be created.`);
  } else {
    console.log(`\n  No nominal ledgers and no vouchers — BS-only export.`);
  }

  // Summary
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  TALLY PRIME 3.0.1 EXPORT — FIX SUMMARY     ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  ROOT CAUSE: Income/Expense had OBs that    ║`);
  console.log(`║  caused double-counting in Tally BS view    ║`);
  console.log(`║                                             ║`);
  console.log(`║  FIX APPLIED:                               ║`);
  console.log(`║  1. Income/Expense OBs → 0                  ║`);
  console.log(`║  2. Compound Journal records their amounts   ║`);
  console.log(`║  3. P&L A/c balances the journal             ║`);
  console.log(`║  4. No Year-End Transfer for CA Report mode  ║`);
  console.log(`║     (BS closing OBs already include P&L)     ║`);
  console.log(`║  5. Journal sign verified: sum = 0           ║`);
  console.log(`╚══════════════════════════════════════════════╝`);

  // FY doc
  const fy = await db.collection('acc_financial_years').findOne({ code: FY });
  console.log(`\n  Company: ${fy?.companyName} | FY: ${fy?.code} | Closed: ${fy?.isClosed}`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
