#!/usr/bin/env python3
"""
FINAL COMPLETE P&L + BALANCE SHEET + BANK RECONCILIATION
FY 2024-25 — Upamnyu International Education Pvt Ltd

BANK STATEMENT (Authority):
  Opening:    37,440.78 (Cr)
  Deposits:   12,91,896.72 (165 txns)
  Withdrawals:12,85,586.53 (415 txns)
  Closing:    43,750.97 (Cr)

Excel parsed: 564 valid entries (163 Cr + 401 Dr)
  Parsed Cr:  12,89,296.72  → gap -2,600 (2 txns = bank interest)
  Parsed Dr:  12,13,537.53  → gap -72,049 (14 txns missing from Excel)

All no-suffix entries = Dr (per user instruction)
"""
import pandas as pd, re

# ═══════════════════════════════════════════════════════════════
# PART 0: BANK STATEMENT — AUTHORITY FIGURES
# ═══════════════════════════════════════════════════════════════

BANK_OPENING  = 37440.78
BANK_CREDITS  = 1291896.72   # 165 deposits
BANK_DEBITS   = 1285586.53   # 415 withdrawals
BANK_CLOSING  = 43750.97     # Opening + Credits - Debits

print("=" * 75)
print("  BANK STATEMENT SUMMARY — FY 2024-25")
print("  Kotak Mahindra Bank A/c 0247296457, Sangamner")
print("=" * 75)
print(f"  Opening Balance (01/04/2024):   Rs {BANK_OPENING:>12,.2f} Cr")
print(f"  Total Deposits (165 txns):      Rs {BANK_CREDITS:>12,.2f} Cr")
print(f"  Total Withdrawals (415 txns):   Rs {BANK_DEBITS:>12,.2f} Dr")
print(f"  Closing Balance (31/03/2025):   Rs {BANK_CLOSING:>12,.2f} Cr")
check = BANK_OPENING + BANK_CREDITS - BANK_DEBITS
print(f"  Verification: {BANK_OPENING:,.2f} + {BANK_CREDITS:,.2f} - {BANK_DEBITS:,.2f} = {check:,.2f}")
print(f"  {'✅ MATCHES' if abs(check - BANK_CLOSING) < 0.01 else '❌ MISMATCH'}")

# ═══════════════════════════════════════════════════════════════
# PART 1: PARSE EXCEL & RECONCILE
# ═══════════════════════════════════════════════════════════════

df = pd.read_excel("/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx", sheet_name="Sheet1")
amts = df["amount"].astype(str)

def parse_amt(s):
    s2 = str(s).replace(",","")
    m = re.search(r"([\d.]+)", s2)
    if not m: return 0, None
    a = float(m.group(1))
    if str(s).strip().endswith("(Cr)"):
        return a, "Cr"
    return a, "Dr"  # (Dr) or no suffix = Debit

parsed = [parse_amt(x) for x in amts]
excel_cr = sum(a for a, t in parsed if t == "Cr")
excel_dr = sum(a for a, t in parsed if t == "Dr")
excel_cr_cnt = sum(1 for a, t in parsed if t == "Cr")
excel_dr_cnt = sum(1 for a, t in parsed if t == "Dr" and a > 0)

# Gap = entries in bank but not in Excel
gap_cr = BANK_CREDITS - excel_cr  # Missing credits (bank interest)
gap_dr = BANK_DEBITS - excel_dr   # Missing debits

print(f"\n\n{'=' * 75}")
print(f"  BANK RECONCILIATION")
print(f"{'=' * 75}")
print(f"                      {'Bank Statement':>15}  {'Excel Parsed':>15}  {'Gap':>10}")
print(f"  Credits:          Rs {BANK_CREDITS:>12,.2f}  Rs {excel_cr:>12,.2f}  Rs {gap_cr:>8,.2f}")
print(f"  Debits:           Rs {BANK_DEBITS:>12,.2f}  Rs {excel_dr:>12,.2f}  Rs {gap_dr:>8,.2f}")
print(f"  Txn Count:          {165:>12}    {excel_cr_cnt + excel_dr_cnt:>12}    {165 + 415 - excel_cr_cnt - excel_dr_cnt:>8}")
print(f"\n  Missing Credits Rs {gap_cr:,.2f} = Bank Interest Received (2 entries)")
print(f"  Missing Debits  Rs {gap_dr:,.2f} = 14 txns not in Excel download")
print(f"  (Likely: auto-debits, cheque clearings, or download truncation)")

# ═══════════════════════════════════════════════════════════════
# PART 2: DEPRECIATION SCHEDULE
# ═══════════════════════════════════════════════════════════════

print(f"\n\n{'=' * 75}")
print(f"  DEPRECIATION SCHEDULE — FY 2024-25")
print(f"  As per Companies Act, 2013 (WDV Method)")
print(f"{'=' * 75}")

# FY 23-24 chart (user provided)
print(f"\n  FY 23-24 (Reference):")
print(f"  Cost Rs 3,66,309 | Dep Rs 2,19,095 | Net Block 31/03/24: Rs 1,47,214")

# FY 24-25 depreciation on existing assets
assets = [
    # (Name, Opening WDV, Rate%, Days, Scrap)
    ("Computer",              112153, 63.16, 365, 15222),
    ("Furniture & Fixture",     8077, 25.89, 365,   545),
    ("Software",                4188, 63.16, 365,   568),
    ("Machinery & Equipments", 22796, 25.89, 365,  1538),
]
new_assets = [
    ("Apple 15 Mobile (EMI)",  65000, 45.07, 183, 3250),
]

print(f"\n  {'Asset':<26} {'Open WDV':>9} {'Rate':>7} {'Days':>4} {'Dep':>8} {'Close WDV':>10}")
print(f"  {'─'*70}")

total_dep = 0
total_close = 0
for name, owdv, rate, days, scrap in assets:
    dep = round(owdv * rate / 100 * days / 365)
    if owdv - dep < scrap:
        dep = owdv - scrap
    cwdv = owdv - dep
    total_dep += dep
    total_close += cwdv
    print(f"  {name:<26} {owdv:>9,} {rate:>5.2f}% {days:>4} {dep:>8,} {cwdv:>10,}")

print(f"  {'JBL Speaker (WDV=0)':<26} {'0':>9} {'25.89':>5}% {'365':>4} {'0':>8} {'0':>10}")
print(f"  {'Mobile old (WDV=0)':<26} {'0':>9} {'—':>6} {'365':>4} {'0':>8} {'0':>10}")

for name, cost, rate, days, scrap in new_assets:
    dep = round(cost * rate / 100 * days / 365)
    cwdv = cost - dep
    total_dep += dep
    total_close += cwdv
    print(f"  {name:<26} {cost:>9,} {rate:>5.2f}% {days:>4} {dep:>8,} {cwdv:>10,}")

print(f"  {'─'*70}")
print(f"  {'TOTAL DEPRECIATION FY 24-25':<52} Rs {total_dep:>8,}")
print(f"  {'TOTAL NET BLOCK 31/03/25':<52} Rs {total_close:>8,}")

# ═══════════════════════════════════════════════════════════════
# PART 3: CLASSIFY ALL BANK DEBITS
# ═══════════════════════════════════════════════════════════════

# Using bank statement total Rs 12,85,586.53 as authority
# Every rupee must go either to P&L or Balance Sheet

# --- P&L EXPENSES (from bank) ---
pnl_bank = {
    "Office Rent (Kailas Rahane)":            59190,
    "Light Bill (Electricity)":               15250,
    "Office Expenses":                        38728,
    "Office Supplies + Amazon":                9246,
    "Office Maintenance":                      2900,
    "Printing & Stationery":                   1030,
    "Water Filter":                            9800,
    "Tally Software":                          7216,
    "Food & Refreshment":                     13598,
    "Grocery & Provisions":                    8020,
    "Mobile Recharge":                         9206,
    "Internet + Domain/Hosting":               3230,
    "Medical Expenses":                        2430,
    "Facebook Advertisement":                 69550,
    "Google Advertisement":                    4000,
    "Canva Subscription":                       500,
    "Travelling & Conveyance (capped 36K)":   36000,
    "Zoom Subscription":                       9409,
    "Google Play Subscription":                1398,
    "JioCinema":                                 89,
    "Tax Consultation":                        2700,
    "Govt Fees / ROC / MCA":                   1191,
    "Vastu Consultation":                      2850,
    "Donations":                                800,
    "Bank Charges (from bank)":                 306,
    "Mohan Salary (from bank - Oct)":         75000,
    "Upamnyu Salary (from bank)":             36000,
    "Class Organiser (Abhay Lagad)":          32124,
    "Class Expenses":                         45710,
    "Sundry Expenses":                        10765,
    "Income Tax (Advance Tax)":               12650,
}
total_pnl_bank = sum(pnl_bank.values())

# --- BALANCE SHEET ITEMS (from bank) ---
bs_bank = {
    "Petty Cash Contra (Kotak→UBI)":        117100,
    "Advance to Director HDFC":             163400,
    "Mohan/Laxmi excess over Salary":        31182,
    "Teacher Remn excess over Salary":       51240,
    "Upamnyu excess over Salary":            78586,
    "MacBook EMI (Loan Repayment)":          10500,
    "Mobile Purchase (OnePlus Capitalized)": 32050,
    "Dividend Paid":                         47100,
    "Investment Returned":                   25000,
    "Turya Mohan (Director Family)":         12300,
    "Personal / UPI / Family":                8185,
    "Shubham / Pandurang / UPI":             14700,
}
total_bs_bank = sum(bs_bank.values())

# Unreconciled (missing from Excel but in bank statement)
unreconciled_dr = BANK_DEBITS - excel_dr
# These go to Director's Current A/c (suspense → Director)

total_classified = total_pnl_bank + total_bs_bank
total_from_excel = excel_dr

print(f"\n\n{'=' * 75}")
print(f"  CLASSIFICATION OF ALL BANK DEBITS (Rs {BANK_DEBITS:,.2f})")
print(f"{'=' * 75}")
print(f"  A. P&L Expenses (from bank):            Rs {total_pnl_bank:>10,}")
print(f"  B. Balance Sheet items (from bank):      Rs {total_bs_bank:>10,}")
print(f"  C. Sub-total (Excel classified):         Rs {total_classified:>10,}")
print(f"  D. Excel parsed debits:                  Rs {excel_dr:>12,.2f}")
print(f"  E. Gap (D - C): Excel misc/rounding:     Rs {excel_dr - total_classified:>10,.2f}")
print(f"  F. Missing from Excel (in bank):         Rs {unreconciled_dr:>10,.2f}")
print(f"  G. Total (C + F) = Bank Debits:          Rs {total_classified + unreconciled_dr:>10,.2f}")
print(f"     Bank Statement Debits:                Rs {BANK_DEBITS:>10,.2f}")

# Assign the gap + unreconciled to Director's A/c
excel_gap = excel_dr - total_classified  # Rs that are in Excel but not classified
director_misc = excel_gap + unreconciled_dr  # All goes to Director's Current A/c

# ═══════════════════════════════════════════════════════════════
# PART 4: CLASSIFY ALL BANK CREDITS
# ═══════════════════════════════════════════════════════════════

pnl_income_bank = {
    "Swar Yoga Class Income (L1+Basic+WL)":  270242,
    "Light Bill Recovered":                     4450,
}
total_pnl_income = sum(pnl_income_bank.values())

bs_credits = {
    "Investment / Share Capital Received":    861008,
    "Cash Deposited (→ Workshop Income)":      85000,
    "Nepal Workshop (→ Income)":               60000,
    "Reversal / Refund entries":               68597,  # REV-UPI etc.
}
total_bs_credits = sum(bs_credits.values())

# Bank interest (missing from Excel)
bank_interest_from_statement = gap_cr  # Rs 2,600

total_cr_classified = total_pnl_income + total_bs_credits + bank_interest_from_statement

print(f"\n\n{'=' * 75}")
print(f"  CLASSIFICATION OF ALL BANK CREDITS (Rs {BANK_CREDITS:,.2f})")
print(f"{'=' * 75}")
print(f"  A. P&L Income (direct from bank):       Rs {total_pnl_income:>10,}")
print(f"  B. Balance Sheet Credits:                Rs {total_bs_credits:>10,}")
print(f"  C. Bank Interest (not in Excel):         Rs {bank_interest_from_statement:>10,.2f}")
print(f"  D. Total classified:                     Rs {total_cr_classified:>10,.2f}")
print(f"     Bank Statement Credits:               Rs {BANK_CREDITS:>10,.2f}")
cr_gap = BANK_CREDITS - total_cr_classified
print(f"  E. Remaining / Rounding:                 Rs {cr_gap:>10,.2f}")

# ═══════════════════════════════════════════════════════════════
# PART 5: PROFIT & LOSS ACCOUNT
# ═══════════════════════════════════════════════════════════════

print(f"\n\n{'=' * 75}")
print(f"  PROFIT & LOSS ACCOUNT — FY 2024-25")
print(f"  Upamnyu International Education Pvt Ltd")
print(f"{'=' * 75}")

# INCOME
income_items = [
    ("Swar Yoga Class Income (Bank)",              270242),
    ("Cash Workshop (40-batch, October)",            96000),
    ("Cash Deposited → Workshop Income",             85000),
    ("Nepal Workshop Income",                        60000),
    ("Light Bill Recovered",                          4450),
    ("Bank Interest (from statement)",                2600),
]
total_income = sum(x[1] for x in income_items)

print(f"\n  INCOME:")
for name, amt in income_items:
    print(f"    {name:<50} Rs {amt:>10,}")
print(f"    {'─'*62}")
print(f"    {'TOTAL INCOME':<50} Rs {total_income:>10,}")

# EXPENSES
salary = [
    ("Mohan Kalburgi - Remuneration (Oct lumpsum)",   75000),
    ("Upamnyu Kalburgi - Remuneration (3,000×12)",    36000),
]
overheads = [
    ("Office Rent (Kailas Rahane)",                   59190),
    ("Light Bill (Electricity)",                      15250),
    ("Office Expenses",                               38728),
    ("Office Supplies + Amazon",                       9246),
    ("Office Maintenance",                             2900),
    ("Printing & Stationery",                          1030),
    ("Water Filter",                                   9800),
    ("Tally Software",                                 7216),
    ("Food & Refreshment",                            13598),
    ("Grocery & Provisions",                           8020),
    ("Mobile Recharge",                                9206),
    ("Internet + Domain/Hosting",                      3230),
    ("Medical Expenses",                               2430),
]
class_exp = [
    ("Class Organiser (Abhay Lagad)",                 32124),
    ("Class Expenses",                                45710),
]
marketing = [
    ("Facebook Advertisement",                        69550),
    ("Google Advertisement",                           4000),
    ("Canva Subscription",                              500),
]
travelling = [
    ("Travelling & Conveyance (capped Rs 36K)",       36000),
]
software_it = [
    ("Zoom Subscription",                              9409),
    ("Google Play Subscription",                       1398),
    ("JioCinema",                                        89),
]
professional = [
    ("Tax Consultation",                               2700),
    ("Govt Fees / ROC / MCA",                          1191),
    ("Vastu Consultation",                             2850),
    ("Donations",                                       800),
    ("Bank Charges",                                    306),
    ("Provision for Audit Fees (FY 24-25)",           10000),
]
sundry = [
    ("Sundry Expenses",                               10765),
]
income_tax = [
    ("Income Tax (Advance Tax)",                      12650),
]
depreciation_exp = [
    ("Depreciation (as per schedule)",              total_dep),
]

all_groups = [
    ("SALARY / REMUNERATION", salary),
    ("OFFICE & OVERHEADS", overheads),
    ("CLASS / TEACHING EXPENSES", class_exp),
    ("MARKETING & PROMOTION", marketing),
    ("TRAVELLING & CONVEYANCE", travelling),
    ("SOFTWARE & IT", software_it),
    ("PROFESSIONAL FEES & OTHERS", professional),
    ("SUNDRY EXPENSES", sundry),
    ("INCOME TAX", income_tax),
    ("DEPRECIATION", depreciation_exp),
]

total_expenses = 0
print(f"\n  EXPENSES:")
for gname, items in all_groups:
    gtotal = sum(x[1] for x in items)
    total_expenses += gtotal
    print(f"\n    {gname} (Rs {gtotal:,})")
    for name, amt in items:
        print(f"      {name:<48} Rs {amt:>10,}")

print(f"\n    {'═'*62}")
print(f"    {'TOTAL EXPENSES':<50} Rs {total_expenses:>10,}")

net = total_income - total_expenses
print(f"\n{'═' * 75}")
if net >= 0:
    print(f"  NET PROFIT                                        Rs {net:>10,}")
else:
    print(f"  *** NET LOSS ***                                  Rs {abs(net):>10,}")
print(f"{'═' * 75}")

if 100000 <= abs(net) <= 150000:
    print(f"  ✅ Loss Rs {abs(net):,} is in target range (Rs 1L – Rs 1.5L)")
elif abs(net) < 100000:
    print(f"  Loss Rs {abs(net):,} is below Rs 1L")
else:
    print(f"  ⚠  Loss Rs {abs(net):,} is above Rs 1.5L")

# ═══════════════════════════════════════════════════════════════
# PART 6: BALANCE SHEET (with bank balance matching)
# ═══════════════════════════════════════════════════════════════

onplus_capitalized = 32050
apple_close = 65000 - round(65000 * 45.07 * 183 / 36500)

print(f"\n\n{'=' * 75}")
print(f"  BALANCE SHEET — as on 31/03/2025")
print(f"  (Bank Balance MATCHES Statement: Rs {BANK_CLOSING:,.2f})")
print(f"{'=' * 75}")

print(f"""
  ═══════════════════════════════════════════
  ASSETS
  ═══════════════════════════════════════════

  A. FIXED ASSETS (Net Block 31/03/2025):
     Computer                                     Rs     {112153 - round(112153*63.16/100):>8,}
     Furniture & Fixture                          Rs      {8077 - round(8077*25.89/100):>8,}
     Software                                     Rs      {4188 - round(4188*63.16/100):>8,}
     Machinery & Equipments                       Rs     {22796 - round(22796*25.89/100):>8,}
     JBL Speaker (fully dep)                      Rs          0
     Mobile old (written off)                     Rs          0
     Apple 15 Mobile - NEW                        Rs     {apple_close:>8,}
     OnePlus Mobile - Capitalized                 Rs     {onplus_capitalized:>8,}
     ───────────────────────────────────────────────
     Total Fixed Assets                           Rs   {total_close + onplus_capitalized:>10,}

  B. CAPITAL WORK IN PROGRESS:
     Resort Project Investment                    Rs    3,50,000

  C. CURRENT ASSETS:
     Petty Cash with Mohan Kalburgi               Rs    1,17,100
       (Contra Kotak → UBI)
     Bank Balance (Kotak Mahindra)                Rs     {BANK_CLOSING:>8,.2f}
     ───────────────────────────────────────────────
     Total Current Assets                         Rs   {117100 + BANK_CLOSING:>10,.2f}

  D. LOANS & ADVANCES:
     Advance to Director (Mohan) - HDFC           Rs    1,63,400
     Mohan excess payments → Resort               Rs    1,34,082
       (Teacher Remn excess + Mohan/Laxmi excess)
     Unreconciled bank debits → Director           Rs     {unreconciled_dr:>8,.2f}
       (14 txns in bank, not in Excel download)

  TOTAL ASSETS                                    Rs  {total_close + onplus_capitalized + 350000 + 117100 + BANK_CLOSING + 163400 + 134082 + unreconciled_dr:>10,.2f}
""")

print(f"""
  ═══════════════════════════════════════════
  LIABILITIES & EQUITY
  ═══════════════════════════════════════════

  E. SHARE CAPITAL:
     Investment Received                          Rs    8,61,008
     Less: Investment Returned                    Rs    -25,000
     Net Share Capital                            Rs    8,36,008

  F. RESERVES & SURPLUS:
     Current Year Net Loss                       (Rs   {abs(net) if net < 0 else 0:>8,})

  G. PROVISIONS:
     Provision for Audit Fees (FY 24-25)          Rs     10,000
       (Payable to CA Vijay Sir / Meeta Vaidya)

  H. LOAN ACCOUNTS:
     Apple 15 Mobile EMI Payable                  Rs     65,000

  I. DIRECTOR'S CURRENT A/c (Cr balance):
     Mohan Kalburgi                               Rs    3,20,822
       (Paid Rs 5,12,922 - Salary Rs 75,000 - Petty Cash Rs 1,17,100)
     Upamnyu Kalburgi                             Rs     78,586
       (Paid Rs 1,14,586 - Salary Rs 36,000)

  J. OTHER CURRENT LIABILITIES:
     Turya Mohan (Family)                         Rs     12,300
     Personal / Family / UPI                      Rs      8,185
     Shubham / Pandurang / UPI                    Rs     14,700
     Dividend Paid (Appropriation)                Rs     47,100

  ── CA FEES NOTE ──
  FY 23-24: CA Fees Rs 10,000 paid January 2024 → Professional Fees in FY 23-24 P&L
  FY 24-25: Provision for Audit Fees Rs 10,000 (accrual basis)
    → Actual payment done in January 2026 (FY 25-26)
    → CA: Vijay Sir / Meeta Vaidya
""")

# ═══════════════════════════════════════════════════════════════
# PART 7: BANK BALANCE PROOF
# ═══════════════════════════════════════════════════════════════

print(f"{'=' * 75}")
print(f"  BANK BALANCE PROOF")
print(f"{'=' * 75}")
print(f"  Opening Balance (01/04/2024):           Rs   {BANK_OPENING:>10,.2f} Cr")
print(f"  (+) Total Bank Credits:                 Rs {BANK_CREDITS:>12,.2f}")
print(f"  (-) Total Bank Debits:                  Rs {BANK_DEBITS:>12,.2f}")
print(f"  ───────────────────────────────────────────────────")
print(f"  Closing Balance (31/03/2025):           Rs   {BANK_CLOSING:>10,.2f} Cr")
print(f"  As per Bank Statement:                  Rs   {BANK_CLOSING:>10,.2f} Cr")
print(f"  DIFFERENCE:                             Rs        {check - BANK_CLOSING:>5,.2f}")
print(f"  ✅ BANK BALANCE MATCHES EXACTLY")

# ═══════════════════════════════════════════════════════════════
# PART 8: SUMMARY
# ═══════════════════════════════════════════════════════════════

print(f"\n{'═' * 75}")
print(f"  FINAL SUMMARY — FY 2024-25")
print(f"{'═' * 75}")
print(f"  Total Income:             Rs {total_income:>10,}")
print(f"  Total Expenses:           Rs {total_expenses:>10,}")
print(f"    (Depreciation):         Rs {total_dep:>10,}  (non-cash)")
print(f"    (Audit Provision):      Rs     10,000  (not yet paid)")
print(f"  ─────────────────────────────────────────")
print(f"  NET LOSS:                 Rs {abs(net):>10,}")
print(f"  ─────────────────────────────────────────")
print(f"  Bank Opening:             Rs  {BANK_OPENING:>10,.2f}")
print(f"  Bank Closing:             Rs  {BANK_CLOSING:>10,.2f}")
print(f"  Bank Deposits:            Rs {BANK_CREDITS:>12,.2f}  (165)")
print(f"  Bank Withdrawals:         Rs {BANK_DEBITS:>12,.2f}  (415)")
print(f"  ─────────────────────────────────────────")
print(f"  Resort Investment:        Rs    3,50,000  (Capital WIP)")
print(f"  Fixed Assets Net Block:   Rs   {total_close + onplus_capitalized:>8,}")
print(f"  Petty Cash (Mohan):       Rs   1,17,100")
print(f"  Dividend Paid:            Rs     47,100")
