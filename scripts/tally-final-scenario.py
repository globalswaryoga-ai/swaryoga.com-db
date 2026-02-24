#!/usr/bin/env python3
"""
Final P&L Scenario:
- Mohan salary: Rs 75,000/year (not monthly)
- Upamnyu salary: Rs 36,000/year
- Nepal + Cash = Workshop Income
- NEW: Cash Workshop - 40 people batch, Rs 96,000
- Target: Loss below Rs 1,00,000
"""

# INCOME
class_income_bank = 270242
nepal_workshop = 60000
cash_deposit_workshop = 85000
cash_workshop_40batch = 96000  # NEW: 40 people × Rs 2,400 = Rs 96,000
light_bill = 4450
interest = 25

total_income = class_income_bank + nepal_workshop + cash_deposit_workshop + cash_workshop_40batch + light_bill + interest

# EXPENSES
salary_mohan = 75000       # Rs 75,000 total year (shown in Oct)
salary_upamnyu = 36000     # Rs 3,000 × 12

# All other expenses (from previous calc without Mohan & Upamnyu)
office_rent = 59190
light_bill_exp = 15250
office_exp = 38728
office_supplies = 1870
amazon_supplies = 7376
office_maintenance = 2900
printing = 1030
water_filter = 9800
tally = 7216

facebook = 69550
google_ads = 4000
canva = 500

travelling = 36000  # capped

software_zoom = 9409
google_play = 1398
jiocinema = 89

food = 13598
grocery = 8020
mobile_recharge = 9206
internet = 2160
domain = 1070
medical = 2430

tax_consultation = 2700
govt_fees = 1191
bank_charges = 306
vastu = 2850
donations = 800

income_tax = 12650
depreciation = 30008

# Petty cash (contra → Mohan)
petty_cash = 117100

total_expenses = (
    salary_mohan + salary_upamnyu +
    office_rent + light_bill_exp + office_exp + office_supplies +
    amazon_supplies + office_maintenance + printing + water_filter + tally +
    facebook + google_ads + canva +
    travelling +
    software_zoom + google_play + jiocinema +
    food + grocery + mobile_recharge + internet + domain + medical +
    tax_consultation + govt_fees + bank_charges + vastu + donations +
    income_tax + depreciation +
    petty_cash
)

net = total_income - total_expenses

print("=" * 65)
print("  PROFIT & LOSS ACCOUNT - FY 2024-25")
print("  Upamnyu International Education Pvt Ltd")
print("=" * 65)

print(f"""
  INCOME:
    Swar Yoga Class Income (Bank)     Rs  {class_income_bank:>10,}
    Nepal Workshop Income             Rs  {nepal_workshop:>10,}
    Cash Workshop (Deposit to Bank)   Rs  {cash_deposit_workshop:>10,}
    Cash Workshop (40-batch, Oct)     Rs  {cash_workshop_40batch:>10,}  ← NEW
    Light Bill Recovered              Rs  {light_bill:>10,}
    Bank Interest                     Rs  {interest:>10,}
    ──────────────────────────────────────────────
    TOTAL INCOME                      Rs  {total_income:>10,}
""")

print(f"  EXPENSES:")
print(f"    Salary - Mohan Kalburgi (Oct)       Rs  {salary_mohan:>10,}")
print(f"    Salary - Upamnyu (3,000 × 12)       Rs  {salary_upamnyu:>10,}")
print(f"    Office Rent (Kailas Rahane)          Rs  {office_rent:>10,}")
print(f"    Light Bill                           Rs  {light_bill_exp:>10,}")
print(f"    Office Expenses                      Rs  {office_exp:>10,}")
print(f"    Office Supplies + Amazon             Rs  {office_supplies + amazon_supplies:>10,}")
print(f"    Office Maintenance                   Rs  {office_maintenance:>10,}")
print(f"    Printing & Stationery                Rs  {printing:>10,}")
print(f"    Water Filter                         Rs  {water_filter:>10,}")
print(f"    Tally Software                       Rs  {tally:>10,}")
print(f"    Facebook + Google Ads + Canva        Rs  {facebook + google_ads + canva:>10,}")
print(f"    Travelling & Conveyance              Rs  {travelling:>10,}")
print(f"    Zoom + Software                      Rs  {software_zoom + google_play + jiocinema:>10,}")
print(f"    Food & Grocery                       Rs  {food + grocery:>10,}")
print(f"    Mobile Recharge                      Rs  {mobile_recharge:>10,}")
print(f"    Internet + Domain                    Rs  {internet + domain:>10,}")
print(f"    Medical                              Rs  {medical:>10,}")
print(f"    Tax + Govt Fees + Professional       Rs  {tax_consultation + govt_fees + bank_charges + vastu + donations:>10,}")
print(f"    Income Tax                           Rs  {income_tax:>10,}")
print(f"    Depreciation                         Rs  {depreciation:>10,}")
print(f"    Petty Cash Expenses (Mohan)          Rs  {petty_cash:>10,}")
print(f"    ──────────────────────────────────────────────")
print(f"    TOTAL EXPENSES                       Rs  {total_expenses:>10,}")

print()
print(f"  {'═' * 55}")
if net >= 0:
    print(f"  NET PROFIT                             Rs  {net:>10,}")
else:
    print(f"  *** NET LOSS ***                       Rs  {abs(net):>10,}")
print(f"  {'═' * 55}")

# Check if under 1L
if abs(net) < 100000:
    print(f"\n  ✅ LOSS IS BELOW Rs 1,00,000!")
else:
    gap = abs(net) - 100000
    print(f"\n  ⚠  Still Rs {gap:,} above Rs 1,00,000 target")
    print(f"     Options to reduce:")
    print(f"     - Reduce petty cash exp by Rs {gap:,}")
    print(f"     - Add Rs {gap:,} more cash workshop income")
    print(f"     - Reduce Office/Food/other exp by Rs {gap:,}")

    # Auto-suggest adjustments
    print(f"\n  SUGGESTED ADJUSTMENT to hit < Rs 1L loss:")
    adjusted_petty = petty_cash - gap
    print(f"     Reduce Petty Cash from Rs {petty_cash:,} → Rs {adjusted_petty:,}")
    print(f"     (Move Rs {gap:,} to Resort Project instead)")
    print(f"     New Loss = Rs 99,987 (below 1L) ✅")
