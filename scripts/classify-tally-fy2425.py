#!/usr/bin/env python3
"""
Swar Yoga FY 2024-25 Bank Statement Auto-Categorizer
=====================================================================
Reads the Kotak Mahindra bank statement Excel, auto-categorizes all
566 transactions, standardizes category names, and writes a clean
output file with summary sheets.

Company: Upamnyu International Education Pvt Ltd
Bank A/c: 0247296457 (Kotak Mahindra, Sangamner)
Period: 01-04-2024 to 31-03-2025
"""

import pandas as pd
import re
from datetime import datetime

# ── CONFIG ──────────────────────────────────────────────────────────
INPUT_FILE  = "/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx"
OUTPUT_FILE = "/Users/mohankalburgi/Downloads/SwarYoga_FY2024-25_Classified.xlsx"

# ── LOAD DATA ───────────────────────────────────────────────────────
df = pd.read_excel(INPUT_FILE, sheet_name='Sheet1', header=0)
df.columns = ['DATE', 'MONTH', 'narration', 'chq', 'amount', 'EXP', 'INCOME_DETAILS', 'balance']


# ── HELPERS ─────────────────────────────────────────────────────────
def parse_amount(val):
    """Extract numeric amount from '2,500.00(Cr)' or '2500' or '326.93(Dr)'"""
    if pd.isna(val):
        return 0.0
    s = str(val).strip().replace(',', '')
    num = re.sub(r'[^\d.]', '', s)
    return float(num) if num else 0.0

def is_credit(val):
    return '(Cr)' in str(val)

def is_debit(val):
    s = str(val)
    return '(Dr)' in s or (s.replace(',','').replace('.','').isdigit())

df['parsed_amount'] = df['amount'].apply(parse_amount)
df['is_credit'] = df['amount'].apply(is_credit)


# ═══════════════════════════════════════════════════════════════════
#  STEP 1: STANDARDIZE EXISTING CATEGORIES (fix typos)
# ═══════════════════════════════════════════════════════════════════

EXPENSE_RENAMES = {
    'OFFCE EXP':                  'OFFICE EXP',
    'TEACHER RENUMARETION-MOHAN': 'TEACHER REMUNERATION-MOHAN',
    'TEACHER RENUMARATION-MOHAN': 'TEACHER REMUNERATION-MOHAN',
    'TEACHER MOHAN':              'TEACHER REMUNERATION-MOHAN',
    'FACE BOOK ADV':              'FACEBOOK ADV',
    'MACKBOOK EMI':               'MACBOOK EMI',
    'TRAVALLING EXP':             'TRAVELLING EXP',
    'DIVIDENT PAID':              'DIVIDEND PAID',
}

INCOME_RENAMES = {
    'SWAR YOGA L1':       'SWAR YOGA L-1',
    'SWAR  YOGA L1':      'SWAR YOGA L-1',
    'SWAR YOSGA L-1':     'SWAR YOGA L-1',
    'SWAR YS A L-1':      'SWAR YOGA L-1',
    'BASIC SWARYOGA':     'BASIC SWAR YOGA',
    'BANK INTREST':       'BANK INTEREST',
}

df['EXP'] = df['EXP'].map(lambda x: EXPENSE_RENAMES.get(x, x) if pd.notna(x) else x)
df['INCOME_DETAILS'] = df['INCOME_DETAILS'].map(lambda x: INCOME_RENAMES.get(x, x) if pd.notna(x) else x)

print("✅ Step 1: Standardized existing category names")


# ═══════════════════════════════════════════════════════════════════
#  STEP 2: AUTO-CATEGORIZE UNCLASSIFIED ROWS
# ═══════════════════════════════════════════════════════════════════

def classify_expense(narration_raw, amount):
    """
    Classify an unclassified debit transaction.
    Returns (category, confidence) tuple.
    """
    narr = str(narration_raw).upper()
    
    # ── HIGH confidence matches ──
    
    # Facebook / Meta advertising
    if any(k in narr for k in ['FACEBOOK', 'META ADS', 'FACEBOOKADSM', 'META/']):
        return 'FACEBOOK ADV', 'HIGH'
    
    # Electricity bill (MSEDCL = Maharashtra State Electricity)
    if 'MSEDCL' in narr:
        return 'LIGHT BILL', 'HIGH'
    
    # MacBook EMI
    if 'MACBOOK' in narr or 'MAC BOOK' in narr:
        return 'MACBOOK EMI', 'HIGH'
    
    # OnePlus EMI via L&T Finance
    if 'LNTFINANCIALSER' in narr or 'L&T' in narr or 'ONE PLUS' in narr or 'ONEPLUS' in narr:
        return 'MOBILE-ONE PLUS', 'HIGH'
    
    # Upamanyu Kalburgi (2nd director)
    if 'UPAMANYU' in narr or 'UPAMNYU' in narr:
        return 'UPAMNYU KALBURGI', 'HIGH'
    
    # Diesel / Petrol for car
    if any(k in narr for k in ['DISEL', 'DIESEL', 'PETROL PUMP', 'HP PETROL', 'SWAMIRAJ PETROL']):
        return 'CAR DIESEL', 'HIGH'
    
    # Mobile recharge (Jio)
    if 'JIO PREPAID' in narr or 'JIO RECHARGE' in narr:
        return 'MOBILE RECHARGE', 'HIGH'
    
    # Rent (clear narration mention)
    if '/RENT' in narr or 'RENT' == narr.split('/')[-1].strip():
        return 'OFFICE RENT', 'HIGH'
    
    # Google Ads
    if 'GOOGLE ADS' in narr:
        return 'GOOGLE ADS', 'HIGH'
    
    # ── MEDIUM confidence matches ──
    
    # Zoom subscription
    if 'ZOOM' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # Travel (IRCTC, redbus, railways)
    if any(k in narr for k in ['IRCTC', 'REDBUS', 'RAILWAY', 'TRAVEL']):
        return 'TRAVELLING EXP', 'MEDIUM'
    
    # Google Play subscription
    if 'GOOGLE PLAY' in narr:
        return 'MOBILE RECHARGE', 'MEDIUM'
    
    # Internet recharge (SUMIT ANIL ATT = net recharge guy)
    if ('SUMIT ANIL' in narr and 'RECHARGE' in narr) or ('NET RECHARGE' in narr):
        return 'INTERNET', 'MEDIUM'
    
    # GoDaddy = domain/hosting
    if 'GODADDY' in narr:
        return 'INTERNET', 'MEDIUM'
    
    # NITIN SURESH KA - recurring class-related person
    if 'NITIN SURESH' in narr:
        return 'CLASS EXP', 'MEDIUM'
    
    # Payments to Mohan Pandurang / Laxmi Mohan Kalburgi
    if 'MOHAN PANDURANG' in narr or 'LAXMI MOHAN KAL' in narr:
        if any(k in narr for k in ['MACBOOK', 'MAC BOOK', 'MAC']):
            return 'MACBOOK EMI', 'MEDIUM'
        if amount >= 5000:
            return 'TEACHER REMUNERATION-MOHAN', 'MEDIUM'
        return 'OFFICE EXP', 'MEDIUM'
    
    # PANDURANG KRISH (Bishi / regular payment)
    if 'PANDURANG KRISH' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # Sachin Laxman (recurring service person)
    if 'SACHIN LAXMAN' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # KIRANKUMAR - class-related
    if 'KIRANKUMAR' in narr or 'KIRAN KUMAR' in narr:
        return 'CLASS EXP', 'MEDIUM'
    
    # Dividend / Investment return paid
    if 'DIVIDEND' in narr or 'DIVIDENT' in narr:
        return 'DIVIDEND PAID', 'MEDIUM'
    
    # MANJINDER KAUR investment return
    if 'MANJINDER' in narr and 'INVESTMENT' in narr.lower():
        return 'INVESTMENT RETURN PAID', 'MEDIUM'
    
    # MAHA VASTU - Vastu consultation (class-related)
    if 'MAHA VASTU' in narr:
        return 'CLASS EXP', 'MEDIUM'
    
    # Car-related expenses
    if any(k in narr for k in ['CAR WASH', 'CAR TAPE', 'TRIPPLE C CAR', 'GURUKRUPA ENTER', 'MANI MOTORS']):
        return 'CAR EXPENSES', 'MEDIUM'
    
    # Shree Ganesha Auto (car-related)
    if 'SHREE GANESHA' in narr and amount > 5000:
        return 'CAR EXPENSES', 'MEDIUM'
    
    # PRASANNA PG SER (PG for Upamanyu)
    if 'PRASANNA PG' in narr:
        return 'UPAMNYU KALBURGI', 'MEDIUM'
    
    # HDFC Credit card payment
    if 'HDFC BANK CREDI' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # Tally software
    if 'COMHARD' in narr or 'TALLY' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # SUMIT ANIL (net recharge / internet service person)
    if 'SUMIT ANIL' in narr:
        return 'INTERNET', 'MEDIUM'
    
    # RAHUL DASHRATH (if large, could be class exp or teacher)
    if 'RAHUL DASHRATH' in narr:
        return 'CLASS EXP', 'MEDIUM'
    
    # ARVIND KALBURGI (family)
    if 'ARVIND KALBURGI' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # Medicine
    if 'MEDICIN' in narr or 'MEDICAL' in narr:
        return 'OFFICE EXP', 'LOW'
    
    # PhonePe large payment (generic UPI)
    if 'PHONEPE' in narr and amount >= 5000:
        return 'OFFICE EXP', 'LOW'
    
    # PRAVIN MACHHIND (recurring helper)
    if 'PRAVIN MACHHIND' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # Bank charges
    if narr.startswith('CHR') or 'CHRG:' in narr or 'POS DECL FEE' in narr or 'IMPS TRANSACTION' in narr:
        return 'BANK CHARGES', 'HIGH'
    
    # MEGHA MALANI 
    if 'MEGHA MALANI' in narr:
        return 'OFFICE EXP', 'LOW'
    
    # Non-Tax Receipt (government fee)
    if 'NON TAX RECEIPT' in narr or 'GOVT' in narr:
        return 'OFFICE EXP', 'MEDIUM'
    
    # ── LOW confidence (amount-based fallback) ──
    
    # Below 500 = office expense
    if amount < 500:
        return 'OFFICE EXP', 'LOW'
    
    # 500-2000 unmatched = office expense
    if amount <= 2000:
        return 'OFFICE EXP', 'LOW'
    
    # Everything else
    return 'OFFICE EXP', 'LOW'


def classify_credit(narration_raw, amount):
    """Classify an unclassified credit (income) transaction."""
    narr = str(narration_raw).upper()
    
    if 'REFUND' in narr:
        return 'REFUND', 'HIGH'
    if 'INTREST' in narr or 'INTEREST' in narr:
        return 'BANK INTEREST', 'HIGH'
    if 'INVEST' in narr:
        return 'INVESTMENT', 'MEDIUM'
    if 'SWAR' in narr or 'YOGA' in narr:
        return 'SWAR YOGA L-1', 'MEDIUM'
    return 'OTHER INCOME', 'LOW'


# ── Apply auto-categorization ──
new_exp_col = []
new_inc_col = []
confidence_col = []
auto_flag_col = []

for idx, row in df.iterrows():
    existing_exp = row['EXP']
    existing_inc = row['INCOME_DETAILS']
    narr = row['narration']
    amt = row['parsed_amount']
    
    if pd.notna(existing_exp) or pd.notna(existing_inc):
        # Already classified
        new_exp_col.append(existing_exp)
        new_inc_col.append(existing_inc)
        confidence_col.append('EXISTING')
        auto_flag_col.append('NO')
    elif row['is_credit']:
        # Unclassified credit
        cat, conf = classify_credit(narr, amt)
        new_exp_col.append(None)
        new_inc_col.append(cat)
        confidence_col.append(conf)
        auto_flag_col.append('YES')
    else:
        # Unclassified debit
        cat, conf = classify_expense(narr, amt)
        new_exp_col.append(cat)
        new_inc_col.append(None)
        confidence_col.append(conf)
        auto_flag_col.append('YES')

df['EXP'] = new_exp_col
df['INCOME_DETAILS'] = new_inc_col
df['CONFIDENCE'] = confidence_col
df['AUTO_CLASSIFIED'] = auto_flag_col

print("✅ Step 2: Auto-classified all 333 unclassified rows")

# Verify no unclassified remain
still_unclassified = df[(df['EXP'].isna()) & (df['INCOME_DETAILS'].isna())]
print(f"   Remaining unclassified: {len(still_unclassified)}")


# ═══════════════════════════════════════════════════════════════════
#  STEP 3: BUILD SUMMARY SHEETS
# ═══════════════════════════════════════════════════════════════════

# Month ordering
MONTH_ORDER = {'APRIL':1,'MAY':2,'JUNE':3,'JULY':4,'AUG':5,'SEP':6,
               'OCT':7,'NOV':8,'DEC':9,'JAN':10,'FEB':11,'MARCH':12}
MONTH_NAMES = {v:k for k,v in MONTH_ORDER.items()}
df['month_order'] = df['MONTH'].map(MONTH_ORDER)

# ── Summary by Category ──
exp_summary = []
for cat in sorted(df['EXP'].dropna().unique(), key=str):
    subset = df[df['EXP'] == cat]
    exp_summary.append({
        'Category': cat,
        'Type': 'EXPENSE',
        'Count': len(subset),
        'Total Amount': subset['parsed_amount'].sum(),
    })

inc_summary = []
for cat in sorted(df['INCOME_DETAILS'].dropna().unique(), key=str):
    subset = df[df['INCOME_DETAILS'] == cat]
    inc_summary.append({
        'Category': cat,
        'Type': 'INCOME',
        'Count': len(subset),
        'Total Amount': subset['parsed_amount'].sum(),
    })

df_cat_summary = pd.DataFrame(exp_summary + inc_summary)

# ── Monthly P&L ──
monthly_rows = []
for mo in range(1, 13):
    mname = MONTH_NAMES[mo]
    m_df = df[df['month_order'] == mo]
    if len(m_df) == 0:
        continue
    
    inc_total = m_df[m_df['INCOME_DETAILS'].notna()]['parsed_amount'].sum()
    exp_total = m_df[m_df['EXP'].notna()]['parsed_amount'].sum()
    
    # Break down by major expense categories
    row = {'Month': mname, 'Total Income': inc_total, 'Total Expenses': exp_total, 'Net': inc_total - exp_total}
    
    # Major expense categories
    for cat in ['TEACHER REMUNERATION-MOHAN', 'FACEBOOK ADV', 'GOOGLE ADS', 'OFFICE RENT',
                'LIGHT BILL', 'MACBOOK EMI', 'MOBILE-ONE PLUS', 'MOBILE RECHARGE',
                'INTERNET', 'OFFICE EXP', 'CLASS EXP', 'CAR DIESEL', 'CAR EXPENSES',
                'TRAVELLING EXP', 'UPAMNYU KALBURGI', 'DIVIDEND PAID', 'BANK CHARGES',
                'INVESTMENT RETURN PAID']:
        cat_df = m_df[m_df['EXP'] == cat]
        row[cat] = cat_df['parsed_amount'].sum() if len(cat_df) > 0 else 0
    
    # Major income categories
    for cat in ['SWAR YOGA L-1', 'BASIC SWAR YOGA', 'WEIGHT LOSS PROGRAM', 
                'INVESTMENT', 'CASH TO BANK', 'NEPAL AMOUNT RECEIVED', 'BANK INTEREST']:
        cat_df = m_df[m_df['INCOME_DETAILS'] == cat]
        row[f'INC_{cat}'] = cat_df['parsed_amount'].sum() if len(cat_df) > 0 else 0
    
    monthly_rows.append(row)

# Add totals row
if monthly_rows:
    totals = {'Month': 'TOTAL FY 2024-25'}
    for k in monthly_rows[0]:
        if k != 'Month':
            totals[k] = sum(r.get(k, 0) for r in monthly_rows)
    monthly_rows.append(totals)

df_monthly = pd.DataFrame(monthly_rows)

# ── Tally Ledger Mapping ──
tally_mapping = pd.DataFrame([
    {'Excel Category': 'SWAR YOGA L-1', 'Tally Ledger': 'Swar Yoga L-1 Income', 'Tally Group': 'Direct Incomes', 'Type': 'INCOME'},
    {'Excel Category': 'BASIC SWAR YOGA', 'Tally Ledger': 'Basic Swar Yoga Income', 'Tally Group': 'Direct Incomes', 'Type': 'INCOME'},
    {'Excel Category': 'WEIGHT LOSS PROGRAM', 'Tally Ledger': 'Weight Loss Program Income', 'Tally Group': 'Direct Incomes', 'Type': 'INCOME'},
    {'Excel Category': 'INVESTMENT', 'Tally Ledger': 'Investment Received', 'Tally Group': 'Capital Account', 'Type': 'INCOME'},
    {'Excel Category': 'CASH TO BANK', 'Tally Ledger': 'Cash A/c', 'Tally Group': 'Cash-in-Hand', 'Type': 'INCOME'},
    {'Excel Category': 'NEPAL AMOUNT RECEIVED', 'Tally Ledger': 'Nepal Receivable A/c', 'Tally Group': 'Sundry Debtors', 'Type': 'INCOME'},
    {'Excel Category': 'BANK INTEREST', 'Tally Ledger': 'Bank Interest Received', 'Tally Group': 'Indirect Incomes', 'Type': 'INCOME'},
    {'Excel Category': 'LIGHT BILL RECEIVED', 'Tally Ledger': 'Light Bill Reimbursement', 'Tally Group': 'Indirect Incomes', 'Type': 'INCOME'},
    {'Excel Category': 'REFUND', 'Tally Ledger': 'Refund Received', 'Tally Group': 'Indirect Incomes', 'Type': 'INCOME'},
    
    {'Excel Category': 'TEACHER REMUNERATION-MOHAN', 'Tally Ledger': 'Teacher Remuneration - Mohan Kalburgi', 'Tally Group': 'Direct Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'FACEBOOK ADV', 'Tally Ledger': 'Facebook Advertising', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'GOOGLE ADS', 'Tally Ledger': 'Google Advertising', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'OFFICE RENT', 'Tally Ledger': 'Office Rent', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'LIGHT BILL', 'Tally Ledger': 'Electricity Expenses', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'MACBOOK EMI', 'Tally Ledger': 'Apple MacBook (Asset EMI)', 'Tally Group': 'Fixed Assets', 'Type': 'EXPENSE'},
    {'Excel Category': 'MOBILE-ONE PLUS', 'Tally Ledger': 'OnePlus Mobile (Asset EMI)', 'Tally Group': 'Fixed Assets', 'Type': 'EXPENSE'},
    {'Excel Category': 'MOBILE RECHARGE', 'Tally Ledger': 'Mobile & Telephone Expenses', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'INTERNET', 'Tally Ledger': 'Internet Expenses', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'OFFICE EXP', 'Tally Ledger': 'Office & Miscellaneous Expenses', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'CLASS EXP', 'Tally Ledger': 'Class & Workshop Expenses', 'Tally Group': 'Direct Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'CAR DIESEL', 'Tally Ledger': 'Car Fuel & Diesel', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'CAR EXPENSES', 'Tally Ledger': 'Car Maintenance & Repairs', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'TRAVELLING EXP', 'Tally Ledger': 'Travelling Expenses', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'UPAMNYU KALBURGI', 'Tally Ledger': 'Director Remuneration - Upamanyu Kalburgi', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'DIVIDEND PAID', 'Tally Ledger': 'Dividend Paid', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'BANK CHARGES', 'Tally Ledger': 'Bank Charges', 'Tally Group': 'Indirect Expenses', 'Type': 'EXPENSE'},
    {'Excel Category': 'INVESTMENT RETURN PAID', 'Tally Ledger': 'Investment Return Paid', 'Tally Group': 'Current Liabilities', 'Type': 'EXPENSE'},
])

# ── LOW confidence items for review ──
review_items = df[df['CONFIDENCE'] == 'LOW'][['DATE', 'MONTH', 'narration', 'amount', 'EXP', 'INCOME_DETAILS', 'CONFIDENCE']].copy()
review_items.columns = ['DATE', 'MONTH', 'NARRATION', 'AMOUNT', 'EXPENSE_CATEGORY', 'INCOME_CATEGORY', 'CONFIDENCE']

print("✅ Step 3: Built summary sheets")


# ═══════════════════════════════════════════════════════════════════
#  STEP 4: WRITE OUTPUT EXCEL
# ═══════════════════════════════════════════════════════════════════

# Prepare main sheet (clean up helper columns for output)
df_output = df[['DATE', 'MONTH', 'narration', 'chq', 'amount', 'EXP', 'INCOME_DETAILS', 'balance', 'CONFIDENCE', 'AUTO_CLASSIFIED']].copy()
df_output.columns = ['DATE', 'MONTH', 'NARRATION', 'CHQ/REF', 'AMOUNT', 'EXPENSE_CATEGORY', 'INCOME_CATEGORY', 'BALANCE', 'CONFIDENCE', 'AUTO_CLASSIFIED']

with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
    # Sheet 1: All transactions (classified)
    df_output.to_excel(writer, sheet_name='All Transactions', index=False)
    
    # Sheet 2: Monthly P&L
    df_monthly.to_excel(writer, sheet_name='Monthly Summary', index=False)
    
    # Sheet 3: Category totals
    df_cat_summary.to_excel(writer, sheet_name='Category Totals', index=False)
    
    # Sheet 4: Tally ledger mapping
    tally_mapping.to_excel(writer, sheet_name='Tally Ledger Mapping', index=False)
    
    # Sheet 5: Items for review (LOW confidence)
    review_items.to_excel(writer, sheet_name='Review (Low Confidence)', index=False)

print(f"\n✅ Step 4: Saved to {OUTPUT_FILE}")


# ═══════════════════════════════════════════════════════════════════
#  STEP 5: PRINT FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════

print("\n" + "=" * 70)
print("FINAL CLASSIFICATION SUMMARY")
print("=" * 70)

total_income = df[df['INCOME_DETAILS'].notna()]['parsed_amount'].sum()
total_expense = df[df['EXP'].notna()]['parsed_amount'].sum()

print(f"\n📊 Total Transactions: {len(df)}")
print(f"   - Income entries:  {df['INCOME_DETAILS'].notna().sum()}")
print(f"   - Expense entries: {df['EXP'].notna().sum()}")
print(f"   - Auto-classified: {(df['AUTO_CLASSIFIED'] == 'YES').sum()}")
print(f"   - LOW confidence (review): {(df['CONFIDENCE'] == 'LOW').sum()}")

print(f"\n💰 INCOME TOTAL:  Rs {total_income:>12,.2f}")
print(f"💸 EXPENSE TOTAL: Rs {total_expense:>12,.2f}")
print(f"📈 NET:           Rs {total_income - total_expense:>12,.2f}")

print(f"\n{'─'*70}")
print("EXPENSE BREAKDOWN:")
print(f"{'─'*70}")
for cat in sorted(df['EXP'].dropna().unique(), key=str):
    subset = df[df['EXP'] == cat]
    total = subset['parsed_amount'].sum()
    count = len(subset)
    print(f"  {str(cat):35s} | {count:3d} entries | Rs {total:>12,.2f}")
print(f"  {'TOTAL':35s} |     ---   | Rs {total_expense:>12,.2f}")

print(f"\n{'─'*70}")
print("INCOME BREAKDOWN:")
print(f"{'─'*70}")
for cat in sorted(df['INCOME_DETAILS'].dropna().unique(), key=str):
    subset = df[df['INCOME_DETAILS'] == cat]
    total = subset['parsed_amount'].sum()
    count = len(subset)
    print(f"  {str(cat):35s} | {count:3d} entries | Rs {total:>12,.2f}")
print(f"  {'TOTAL':35s} |     ---   | Rs {total_income:>12,.2f}")

print(f"\n{'─'*70}")
print("MONTHLY P&L:")
print(f"{'─'*70}")
for _, row in df_monthly.iterrows():
    m = row['Month']
    inc = row.get('Total Income', 0)
    exp = row.get('Total Expenses', 0)
    net = row.get('Net', 0)
    print(f"  {str(m):15s} | Income: Rs {inc:>10,.0f} | Expense: Rs {exp:>10,.0f} | Net: Rs {net:>10,.0f}")

print(f"\n{'─'*70}")
print(f"📍 Bank Statement: Opening Rs 37,440.78 → Closing Rs 43,750.97")
print(f"📍 Total Deposits: Rs 12,91,896.72 | Total Withdrawals: Rs 12,85,586.53")
print(f"\n✅ Output file: {OUTPUT_FILE}")
print(f"   Sheets: All Transactions | Monthly Summary | Category Totals | Tally Ledger Mapping | Review (Low Confidence)")
