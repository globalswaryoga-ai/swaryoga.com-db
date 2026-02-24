#!/usr/bin/env python3
"""
Final deep classification of ALL expenses including MISC EXP (REVIEW) bucket.
Produces a clean Tally-ready summary.
"""
import pandas as pd
import numpy as np
import sys, os

EXCEL = os.path.expanduser("~/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx")
df = pd.read_excel(EXCEL, sheet_name="Sheet1", header=0)
df.columns = [c.strip() for c in df.columns]

# Normalise
for c in ['EXP', 'INCOME_DETAILS']:
    if c in df.columns:
        df[c] = df[c].astype(str).str.strip()
        df[c].replace(['nan', 'NaN', '', 'None'], np.nan, inplace=True)

df['narration'] = df['narration'].astype(str).str.strip()
df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)

# Detect debit/credit
if 'chq' in df.columns:
    df['chq'] = df['chq'].astype(str).str.strip().str.upper()
df['is_credit'] = df.apply(lambda r: 
    (pd.notna(r.get('INCOME_DETAILS')) and str(r['INCOME_DETAILS']).strip() not in ['nan','']) or
    'CR' in str(r.get('chq','')).upper() or
    'RECEIVED' in str(r.get('narration','')).upper()[:20],
    axis=1
)

# ---  MASTER CLASSIFICATION  ---
# We'll classify EVERY debit row into a Tally-friendly category
# Priority: existing EXP label (cleaned) -> narration-based rules

def typo_fix(exp):
    """Fix known typos in existing EXP labels"""
    if pd.isna(exp): return exp
    fixes = {
        'OFFCE EXP': 'OFFICE EXP',
        'OFFCE  EXP': 'OFFICE EXP',
        'SWAR YOSGA L-1': 'SWAR YOGA L-1',
        'FACE BOOK ADV': 'FACEBOOK ADV',
        'FACE BOOK  ADV': 'FACEBOOK ADV',
        'TRAVALLING EXP': 'TRAVELLING EXP',
        'TRAVALLING  EXP': 'TRAVELLING EXP',
        'TEACHER RENUMARETION': 'TEACHER REMUNERATION',
        'TEACHER  RENUMARETION': 'TEACHER REMUNERATION',
        'DIVIDENT': 'DIVIDEND',
        'LIGH BILL': 'LIGHT BILL',
        'LIGHT  BILL': 'LIGHT BILL',
        'MACKBOOK EMI': 'MACBOOK EMI',
        'MACKBOOK  EMI': 'MACBOOK EMI',
    }
    return fixes.get(exp.strip(), exp.strip())

# Narration-based classification rules (order matters - first match wins)
RULES = [
    # --- Persons ---
    (lambda n: 'UPAMANYU' in n.upper() or 'UPAMNYU' in n.upper(), 'UPAMNYU KALBURGI'),
    (lambda n: 'TURYA MOHAN' in n.upper(), 'TURYA MOHAN (SON)'),
    (lambda n: 'SHUBHAM ARVIND' in n.upper(), 'SHUBHAM ARVIND'),
    
    # --- Bank Transfers / Contra ---
    (lambda n: 'SWAR YOGA' in n.upper() and 'UBIN' in n.upper(), 'BANK TRANSFER (CONTRA)'),
    (lambda n: 'CONTRA' in n.upper(), 'BANK TRANSFER (CONTRA)'),
    
    # --- Advance to Director ---
    (lambda n: 'MOHAN KALB' in n.upper() and 'ADVANCE' in n.upper(), 'ADVANCE TO DIRECTOR'),
    (lambda n: 'MOHAN KALB' in n.upper() and 'HDFC' in n.upper(), 'ADVANCE TO DIRECTOR'),
    
    # --- Mohan/Laxmi (small) ---
    (lambda n: ('MOHAN PANDURANG' in n.upper() or 'LAXMI MOHAN' in n.upper()), 'MOHAN/LAXMI KALBURGI'),
    
    # --- Pandurang Krishna ---
    (lambda n: 'PANDURANG KRISH' in n.upper(), 'PANDURANG KRISHNA'),
    
    # --- Facebook/Meta ---
    (lambda n: any(w in n.upper() for w in ['FACEBOOK', 'FACE BOOK', 'FACEBK', 'META']), 'FACEBOOK ADVERTISEMENT'),
    
    # --- Vehicle / Petrol ---
    (lambda n: any(w in n.upper() for w in ['PETROL', 'BP MOBILITY', 'INDIAN OIL', 'BHARAT PETROLEUM']), 'PETROL / FUEL'),
    (lambda n: any(w in n.upper() for w in ['AMERIYA AUTOMOB', 'NEWASKAR AUTOMO', 'CAR REPAIR', 'CAR TAPE']), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'SAHYADRI PETROL' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'KAKADE PATIL PE' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'S G ABHANG PETR' in n.upper() or 'S B DIVEKAR' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'PATIL HIGHWAY' in n.upper(), 'PETROL / FUEL'),
    
    # --- Software / Subscriptions ---
    (lambda n: 'ZOOM' in n.upper() or 'ZVC INDIA' in n.upper(), 'ZOOM SUBSCRIPTION'),
    (lambda n: 'CANVA' in n.upper(), 'CANVA SUBSCRIPTION'),
    (lambda n: 'GOOGLE PLAY' in n.upper(), 'GOOGLE PLAY SUBSCRIPTION'),
    (lambda n: 'GODADDY' in n.upper(), 'DOMAIN / HOSTING'),
    (lambda n: 'JIOCINEMA' in n.upper(), 'SUBSCRIPTION (ENTERTAINMENT)'),
    
    # --- MSEDCL / Light Bill ---
    (lambda n: 'MSEDCL' in n.upper(), 'LIGHT BILL (ELECTRICITY)'),
    
    # --- MacBook EMI ---
    (lambda n: 'MACBOOK' in n.upper() or 'MACKBOOK' in n.upper(), 'MACBOOK EMI'),
    
    # --- Office Rent ---
    (lambda n: 'RENT' in n.upper() and 'OFFICE' not in n.upper(), 'OFFICE RENT'),
    
    # --- Food / Hotel ---
    (lambda n: any(w in n.upper() for w in ['ZOMATO', 'DOMINOS', 'SWIGGY', 'FOOD']), 'FOOD & REFRESHMENT'),
    (lambda n: any(w in n.upper() for w in ['HOTEL GREEN', 'HOTEL JT', 'HOTEL VRUNDAVAN', 'SHREEGANESHHOTE']), 'FOOD & REFRESHMENT'),
    
    # --- Grocery / Supermarket ---
    (lambda n: any(w in n.upper() for w in ['AVENUE SUPERMAR', 'KIRANA', 'FRUIT M', 'FUOT MA']), 'GROCERY & PROVISIONS'),
    
    # --- Medical ---
    (lambda n: any(w in n.upper() for w in ['MEDICAL', 'MEDICIN', 'PHARMACY']), 'MEDICAL EXPENSES'),
    
    # --- Tax / Govt ---
    (lambda n: 'TAX CARE' in n.upper() or 'TAx CARE' in n.upper(), 'TAX CONSULTATION'),
    (lambda n: 'CENTRAL BOARD' in n.upper(), 'INCOME TAX PAYMENT'),
    (lambda n: 'NON TAX RECEIPT' in n.upper() or 'SANGAMNER TALUK' in n.upper(), 'GOVT FEES'),
    
    # --- Class Organiser ---
    (lambda n: 'LAGAD ABHAY' in n.upper(), 'CLASS ORGANISER (ABHAY LAGAD)'),
    
    # --- Insurance ---
    (lambda n: 'INSURANCE' in n.upper() or 'LIC' in n.upper(), 'INSURANCE'),
    
    # --- Internet ---
    (lambda n: 'NET RECHARGE' in n.upper() or 'SUMIT ANIL ATT' in n.upper(), 'INTERNET CHARGES'),
    
    # --- Amazon ---
    (lambda n: 'AMAZON' in n.upper(), 'OFFICE SUPPLIES (AMAZON)'),
    
    # --- Tally ---
    (lambda n: 'COMHARD' in n.upper() or 'TALLY' in n.upper(), 'TALLY SOFTWARE'),
    
    # --- Water Filter ---
    (lambda n: 'WATER' in n.upper() or 'WATET' in n.upper(), 'WATER FILTER'),
    
    # --- Vastu ---
    (lambda n: 'VASTU' in n.upper(), 'VASTU CONSULTATION'),
    
    # --- Credit Card ---
    (lambda n: 'HDFC BANK CREDI' in n.upper() or 'CREDIT CARD' in n.upper(), 'CREDIT CARD PAYMENT'),
    
    # --- Printing ---
    (lambda n: any(w in n.upper() for w in ['PRINTING', 'SHREE COMPUTER', 'SAPTSHRUNGI XER', 'XEROX']), 'PRINTING & STATIONERY'),
    
    # --- PhonePe (unidentified) ---
    (lambda n: 'PHONEPE' in n.upper() and len(n) < 60, 'UPI PAYMENT (REVIEW)'),
    
    # --- Cosmetics/Personal ---
    (lambda n: 'COSMETI' in n.upper(), 'PERSONAL EXPENSES'),
    
    # --- Sachin Laxman (maintenance) ---
    (lambda n: 'SACHIN LAXMAN' in n.upper(), 'OFFICE MAINTENANCE'),
    
    # --- Specific persons / misc ---
    (lambda n: 'NANDA KANTILAL' in n.upper(), 'CLASS EXPENSES'),
    (lambda n: 'DHEERAJ NANASAH' in n.upper(), 'CLASS EXPENSES'),
    (lambda n: 'HARK KHATRI' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'SUNIL MAHARANID' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'ABDUL MAJID' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'MAHADEO SHARAN' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SMART PUNE' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'MSRTC' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'ARCHAEOLOGICAL' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'SHRI SIDDESHWAR' in n.upper(), 'DONATIONS'),
    (lambda n: 'SHREE MAHANKALI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'KORTIKAR NILAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SAHAKARMAHARSHI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'AKSHAY GANGA' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'ARVIND KALBURGI' in n.upper() and 'FOOD' not in n.upper(), 'PERSONAL/FAMILY'),
    (lambda n: 'ARVIND KALBURGI' in n.upper() and 'FOOD' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'KARUNA CH' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SAURABH SUM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'RAMESH SHIVRAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'YASH TRADERS' in n.upper(), 'OFFICE SUPPLIES'),
    (lambda n: 'AJAY NANKRAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'GANESH KASHINAT' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'RAHUL RAMNATH' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'SMART POINT' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'LAND' in n.upper() and 'SENT' in n.upper(), 'LAND EXPENSE'),
]

# Income classification
INCOME_RULES = [
    (lambda n: 'SWAR YOGA L-1' in n.upper() or 'SWARAYOG' in n.upper(), 'SWAR YOGA CLASS INCOME'),
    (lambda n: 'BASIC SWAR' in n.upper(), 'BASIC SWAR YOGA INCOME'),
    (lambda n: 'WEIGHT LOSS' in n.upper(), 'WEIGHT LOSS PROGRAM INCOME'),
    (lambda n: 'INVESTMENT' in n.upper() or 'SHARE' in n.upper(), 'INVESTMENT RECEIVED'),
    (lambda n: 'CASH' in n.upper() and 'BANK' in n.upper(), 'CASH DEPOSITED'),
    (lambda n: 'NEPAL' in n.upper(), 'NEPAL INCOME'),
    (lambda n: 'LIGHT BILL' in n.upper() and 'RECEIVED' in n.upper(), 'LIGHT BILL RECEIVED'),
    (lambda n: 'INTEREST' in n.upper(), 'BANK INTEREST'),
    (lambda n: 'REFUND' in n.upper(), 'REFUND'),
]

# --- Now classify each row ---
results = []
for _, row in df.iterrows():
    narr = str(row['narration'])
    amt = row['amount']
    exp_raw = row.get('EXP', np.nan)
    inc_raw = row.get('INCOME_DETAILS', np.nan)
    is_credit = row['is_credit']
    date = row.get('DATE', '')
    
    # Fix typos in existing EXP
    exp_clean = typo_fix(exp_raw) if pd.notna(exp_raw) else np.nan
    
    category = None
    source = None
    
    if is_credit:
        # Income row
        if pd.notna(inc_raw):
            category = str(inc_raw).strip()
            source = 'EXISTING'
        else:
            for rule_fn, cat in INCOME_RULES:
                if rule_fn(narr):
                    category = cat
                    source = 'AUTO'
                    break
            if not category:
                category = 'OTHER INCOME (REVIEW)'
                source = 'REVIEW'
    else:
        # Expense row
        # First check if already classified
        if pd.notna(exp_clean) and exp_clean not in ['', 'nan']:
            # Map existing labels to clean Tally categories
            EXP_MAP = {
                'OFFICE EXP': 'OFFICE EXPENSES',
                'FACEBOOK ADV': 'FACEBOOK ADVERTISEMENT',
                'TRAVELLING EXP': 'TRAVELLING EXPENSES',
                'TEACHER REMUNERATION': 'TEACHER REMUNERATION',
                'TEACHER REMUARETION': 'TEACHER REMUNERATION',
                'LIGHT BILL': 'LIGHT BILL (ELECTRICITY)',
                'MACBOOK EMI': 'MACBOOK EMI',
                'UPAMNYU KALBURGI': 'UPAMNYU KALBURGI',
                'OFFICE RENT': 'OFFICE RENT',
                'MOHAN KALBURGI': 'MOHAN/LAXMI KALBURGI',
                'DIVIDEND': 'DIVIDEND',
                'DIVIDENT': 'DIVIDEND',
            }
            category = EXP_MAP.get(exp_clean, exp_clean)
            source = 'EXISTING'
        
        # Then try narration rules (override if not classified or if MISC)
        if not category or category in ['OFFICE EXPENSES']:
            for rule_fn, cat in RULES:
                if rule_fn(narr):
                    category = cat
                    source = 'AUTO' if not category else 'REFINED'
                    break
        
        if not category:
            # Try narration rules for unclassified
            for rule_fn, cat in RULES:
                if rule_fn(narr):
                    category = cat
                    source = 'AUTO'
                    break
        
        if not category:
            category = 'MISC EXPENSES (REVIEW)'
            source = 'REVIEW'
    
    results.append({
        'DATE': date,
        'NARRATION': narr,
        'AMOUNT': amt,
        'TYPE': 'CREDIT' if is_credit else 'DEBIT',
        'CATEGORY': category,
        'SOURCE': source,
    })

rdf = pd.DataFrame(results)

# === PRINT SUMMARY ===
print("=" * 70)
print("  FINAL CLASSIFICATION SUMMARY - FY 2024-25")
print("  Upamnyu International Education Pvt Ltd")
print("  A/c: Kotak Mahindra 0247296457")
print("=" * 70)

# --- INCOME ---
credits = rdf[rdf['TYPE'] == 'CREDIT']
print(f"\n{'='*70}")
print(f"  INCOME (Total: Rs {credits['AMOUNT'].sum():,.0f})")
print(f"{'='*70}")
inc_summary = credits.groupby('CATEGORY').agg(
    Count=('AMOUNT', 'count'),
    Total=('AMOUNT', 'sum')
).sort_values('Total', ascending=False)

for cat, row in inc_summary.iterrows():
    print(f"  {cat:<35} {int(row['Count']):>3} entries  Rs {row['Total']:>10,.0f}")

# --- EXPENSES ---
debits = rdf[rdf['TYPE'] == 'DEBIT']
print(f"\n{'='*70}")
print(f"  EXPENSES (Total: Rs {debits['AMOUNT'].sum():,.0f})")
print(f"{'='*70}")
exp_summary = debits.groupby('CATEGORY').agg(
    Count=('AMOUNT', 'count'),
    Total=('AMOUNT', 'sum')
).sort_values('Total', ascending=False)

print(f"\n  {'TALLY LEDGER':<40} {'#':>3}  {'AMOUNT':>12}  {'%':>5}")
print(f"  {'-'*65}")
total_exp = debits['AMOUNT'].sum()
for cat, row in exp_summary.iterrows():
    pct = row['Total'] / total_exp * 100
    marker = " ⚠" if 'REVIEW' in cat else ""
    print(f"  {cat:<40} {int(row['Count']):>3}  Rs {row['Total']:>10,.0f}  {pct:>4.1f}%{marker}")
print(f"  {'-'*65}")
print(f"  {'GRAND TOTAL':<40} {int(debits.shape[0]):>3}  Rs {total_exp:>10,.0f}")

# --- KEY TALLY GROUPS ---
print(f"\n{'='*70}")
print(f"  TALLY LEDGER GROUPING")
print(f"{'='*70}")

TALLY_GROUPS = {
    'Direct Expenses': [
        'TEACHER REMUNERATION',
        'CLASS ORGANISER (ABHAY LAGAD)',
        'CLASS EXPENSES',
    ],
    'Indirect Expenses': [
        'OFFICE RENT',
        'LIGHT BILL (ELECTRICITY)',
        'OFFICE EXPENSES',
        'OFFICE SUPPLIES',
        'OFFICE SUPPLIES (AMAZON)',
        'OFFICE MAINTENANCE',
        'PRINTING & STATIONERY',
        'INTERNET CHARGES',
        'DOMAIN / HOSTING',
        'TALLY SOFTWARE',
        'WATER FILTER',
        'GROCERY & PROVISIONS',
        'FOOD & REFRESHMENT',
        'MEDICAL EXPENSES',
        'TRAVELLING EXPENSES',
        'PETROL / FUEL',
        'VEHICLE REPAIR & MAINTENANCE',
        'FACEBOOK ADVERTISEMENT',
        'ZOOM SUBSCRIPTION',
        'CANVA SUBSCRIPTION',
        'GOOGLE PLAY SUBSCRIPTION',
        'SUBSCRIPTION (ENTERTAINMENT)',
        'GOVT FEES',
        'TAX CONSULTATION',
        'INCOME TAX PAYMENT',
        'VASTU CONSULTATION',
        'DONATIONS',
        'MACBOOK EMI',
    ],
    'Payments to Persons (Loans & Advances / Current Liabilities)': [
        'UPAMNYU KALBURGI',
        'MOHAN/LAXMI KALBURGI',
        'TURYA MOHAN (SON)',
        'SHUBHAM ARVIND',
        'PANDURANG KRISHNA',
        'ADVANCE TO DIRECTOR',
        'PERSONAL EXPENSES',
        'PERSONAL/FAMILY',
        'CREDIT CARD PAYMENT',
        'DIVIDEND',
    ],
    'Bank Transfer (Contra)': [
        'BANK TRANSFER (CONTRA)',
    ],
    'Other / Land': [
        'LAND EXPENSE',
    ],
    'Needs Review': [
        'MISC EXPENSES (REVIEW)',
        'UPI PAYMENT (REVIEW)',
    ],
}

for group, cats in TALLY_GROUPS.items():
    group_total = 0
    group_count = 0
    items = []
    for cat in cats:
        if cat in exp_summary.index:
            r = exp_summary.loc[cat]
            items.append((cat, int(r['Count']), r['Total']))
            group_total += r['Total']
            group_count += int(r['Count'])
    
    if items:
        print(f"\n  📁 {group} (Rs {group_total:,.0f})")
        for cat, cnt, tot in items:
            print(f"     ├── {cat:<38} {cnt:>3}  Rs {tot:>10,.0f}")
        print(f"     └── {'SUBTOTAL':<38} {group_count:>3}  Rs {group_total:>10,.0f}")

# --- Items still needing review ---
review_items = rdf[(rdf['SOURCE'] == 'REVIEW') & (rdf['TYPE'] == 'DEBIT')]
if not review_items.empty:
    print(f"\n{'='*70}")
    print(f"  ⚠  ITEMS STILL NEEDING REVIEW ({len(review_items)} entries, Rs {review_items['AMOUNT'].sum():,.0f})")
    print(f"{'='*70}")
    for _, r in review_items.sort_values('AMOUNT', ascending=False).iterrows():
        print(f"     {str(r['DATE'])[:10]} | Rs {r['AMOUNT']:>8,.0f} | {r['NARRATION'][:60]}")

# --- NET RESULT ---
print(f"\n{'='*70}")
print(f"  NET RESULT")
print(f"{'='*70}")
print(f"  Total Income  : Rs {credits['AMOUNT'].sum():>12,.0f}")
print(f"  Total Expenses: Rs {debits['AMOUNT'].sum():>12,.0f}")
print(f"  Net Surplus   : Rs {credits['AMOUNT'].sum() - debits['AMOUNT'].sum():>12,.0f}")
print(f"\n  Opening Balance: Rs 37,440.78")
print(f"  Calculated Closing: Rs {37440.78 + credits['AMOUNT'].sum() - debits['AMOUNT'].sum():>10,.2f}")
print(f"  Actual Closing : Rs 43,750.97")

# Write to Excel
OUT = os.path.expanduser("~/Downloads/SwarYoga_FY2024-25_FINAL.xlsx")
with pd.ExcelWriter(OUT, engine='openpyxl') as writer:
    # All transactions
    rdf.to_excel(writer, sheet_name='All Transactions', index=False)
    
    # Income summary
    inc_summary.to_excel(writer, sheet_name='Income Summary')
    
    # Expense summary
    exp_summary.to_excel(writer, sheet_name='Expense Summary')
    
    # Review items
    if not review_items.empty:
        review_items.to_excel(writer, sheet_name='Needs Review', index=False)

print(f"\n  ✅ Final Excel saved: {OUT}")
