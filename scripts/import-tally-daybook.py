#!/usr/bin/env python3
"""
Import FY 2024-25 bank statement entries into MongoDB tally_manual_vouchers collection.
Reads the classified bank statement Excel and creates voucher entries for the CRM daybook.
"""
import pandas as pd
import numpy as np
import re, os, json
from pymongo import MongoClient
from datetime import datetime

# ── Config ──
EXCEL = os.path.expanduser("~/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx")
FY = "2024-25"

# Read MongoDB URI from .env.local
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
MONGO_URI = None
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.startswith('MONGODB_URI_MAIN='):
                MONGO_URI = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
if not MONGO_URI:
    print("❌ MONGODB_URI_MAIN not found in .env.local")
    exit(1)

# ── Read Excel ──
df = pd.read_excel(EXCEL, sheet_name="Sheet1", header=0)
df.columns = [c.strip() for c in df.columns]
if 'INCOME DETAILS' in df.columns:
    df.rename(columns={'INCOME DETAILS': 'INCOME_DETAILS'}, inplace=True)

for c in ['EXP', 'INCOME_DETAILS']:
    if c in df.columns:
        df[c] = df[c].astype(str).str.strip()
        df.loc[df[c].isin(['nan', 'NaN', '', 'None']), c] = np.nan

df['narration'] = df['narration'].astype(str).str.strip()

# ── Parse amounts ──
def parse_amount(val):
    s = str(val).strip()
    is_cr = '(Cr)' in s or '(CR)' in s
    num_str = re.sub(r'\(Cr\)|\(CR\)|\(Dr\)|\(DR\)', '', s).replace(',', '').strip()
    try:
        amt = float(num_str)
    except:
        amt = 0.0
    return amt, is_cr

df['parsed'] = df['amount'].apply(parse_amount)
df['amt_num'] = df['parsed'].apply(lambda x: x[0])
df['is_credit'] = df['parsed'].apply(lambda x: x[1])
df.drop(columns=['parsed'], inplace=True)

# Filter valid entries only
df = df[df['amt_num'] > 0].copy()
print(f"Total valid entries: {len(df)}")
print(f"  Credits: {df['is_credit'].sum()}")
print(f"  Debits: {(~df['is_credit']).sum()}")

# ── Parse dates ──
def parse_date(val):
    """Convert Timestamp or string date to YYYY-MM-DD"""
    if pd.isna(val):
        return None
    if hasattr(val, 'strftime'):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    for fmt in ['%d-%m-%Y', '%d/%m/%Y', '%d-%m-%y', '%Y-%m-%d']:
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except:
            continue
    return None

df['parsed_date'] = df['DATE'].apply(parse_date)
print(f"Dates parsed: {df['parsed_date'].notna().sum()} / {len(df)}")

# ── Typo fixes for EXP labels ──
def typo_fix(exp):
    if pd.isna(exp): return exp
    e = exp.strip()
    fixes = {
        'OFFCE EXP': 'OFFICE EXP', 'OFFCE  EXP': 'OFFICE EXP',
        'SWAR YOSGA L-1': 'SWAR YOGA L-1',
        'FACE BOOK ADV': 'FACEBOOK ADV', 'FACE BOOK  ADV': 'FACEBOOK ADV',
        'TRAVALLING EXP': 'TRAVELLING EXP', 'TRAVALLING  EXP': 'TRAVELLING EXP',
        'TEACHER RENUMARETION': 'TEACHER REMUNERATION',
        'TEACHER  RENUMARETION': 'TEACHER REMUNERATION',
        'TEACHER REMUARETION': 'TEACHER REMUNERATION',
        'TEACHER RENUMARETION-MOHAN': 'TEACHER REMUNERATION',
        'TEACHER RENUMARATION-MOHAN': 'TEACHER REMUNERATION',
        'DIVIDENT': 'DIVIDEND', 'DIVIDENT PAID': 'DIVIDEND',
        'LIGH BILL': 'LIGHT BILL', 'LIGHT  BILL': 'LIGHT BILL',
        'MACKBOOK EMI': 'MACBOOK EMI', 'MACKBOOK  EMI': 'MACBOOK EMI',
        'TEACHER MOHAN': 'TEACHER REMUNERATION',
    }
    return fixes.get(e, e)

df['EXP'] = df['EXP'].apply(typo_fix)

# ── Classification rules (same as final-classify-v2.py) ──
RULES = [
    (lambda n: 'SWAR YOGA' in n.upper() and 'UBIN' in n.upper(), 'BANK TRANSFER (CONTRA)'),
    (lambda n: 'CONTRA' in n.upper(), 'BANK TRANSFER (CONTRA)'),
    (lambda n: 'UPAMANYU' in n.upper() or 'UPAMNYU' in n.upper(), 'UPAMNYU KALBURGI'),
    (lambda n: 'MOHAN' in n.upper() and 'KALB' in n.upper(), 'MOHAN KALBURGI'),
    (lambda n: 'TURYA MOHAN' in n.upper(), 'TURYA MOHAN'),
    (lambda n: 'SUSHANT' in n.upper(), 'SUSHANT'),
    (lambda n: 'SHUBHAM' in n.upper(), 'SHUBHAM'),
    (lambda n: 'PANDURANG' in n.upper(), 'PANDURANG'),
    (lambda n: 'GOOGLE' in n.upper() and any(w in n.upper() for w in ['ADS', 'ADWORD']), 'GOOGLE ADS'),
    (lambda n: 'GOOGLE' in n.upper() and 'CLOUD' in n.upper(), 'GOOGLE CLOUD'),
    (lambda n: 'FACEBOOK' in n.upper() or 'META' in n.upper(), 'FACEBOOK ADS'),
    (lambda n: 'AWS' in n.upper() or 'AMAZON WEB' in n.upper(), 'AWS HOSTING'),
    (lambda n: 'VERCEL' in n.upper(), 'VERCEL HOSTING'),
    (lambda n: 'GODADDY' in n.upper() or 'DOMAIN' in n.upper(), 'DOMAIN / GODADDY'),
    (lambda n: 'RAZORPAY' in n.upper(), 'RAZORPAY'),
    (lambda n: 'CASHFREE' in n.upper(), 'CASHFREE'),
    (lambda n: 'PAYU' in n.upper(), 'PAYU GATEWAY'),
    (lambda n: 'RENT' in n.upper() and 'PREPAID' not in n.upper(), 'RENT'),
    (lambda n: 'ELECTRICITY' in n.upper() or 'LIGHT BILL' in n.upper() or 'MSEDCL' in n.upper(), 'ELECTRICITY'),
    (lambda n: 'INTERNET' in n.upper() or 'AIRTEL' in n.upper() or 'JIO' in n.upper() or 'BROADBAND' in n.upper(), 'INTERNET / TELECOM'),
    (lambda n: 'ZOOM' in n.upper(), 'ZOOM SUBSCRIPTION'),
    (lambda n: 'CANVA' in n.upper(), 'CANVA SUBSCRIPTION'),
    (lambda n: 'OPENAI' in n.upper() or 'CHATGPT' in n.upper(), 'OPENAI / AI TOOLS'),
    (lambda n: 'NOTION' in n.upper(), 'NOTION SUBSCRIPTION'),
    (lambda n: 'GITHUB' in n.upper(), 'GITHUB'),
    (lambda n: 'SALARY' in n.upper(), 'SALARY'),
    (lambda n: 'DIVIDEND' in n.upper(), 'DIVIDEND'),
    (lambda n: 'GST' in n.upper() or 'TAX' in n.upper(), 'TAX / GST'),
    (lambda n: 'TDS' in n.upper(), 'TDS'),
    (lambda n: 'PROFESSIONAL TAX' in n.upper() or 'PTAX' in n.upper(), 'PROFESSIONAL TAX'),
    (lambda n: 'INSURANCE' in n.upper(), 'INSURANCE'),
    (lambda n: 'TRAVEL' in n.upper() or 'FLIGHT' in n.upper() or 'IRCTC' in n.upper() or 'RAILWAY' in n.upper(), 'TRAVELLING EXP'),
    (lambda n: 'HOTEL' in n.upper() or 'STAY' in n.upper() or 'OYO' in n.upper(), 'TRAVELLING EXP'),
    (lambda n: 'PRINTING' in n.upper() or 'STATIONERY' in n.upper(), 'PRINTING & STATIONERY'),
    (lambda n: 'COURIER' in n.upper() or 'SPEED POST' in n.upper() or 'DELHIVERY' in n.upper(), 'COURIER / POSTAGE'),
    (lambda n: 'NEPAL' in n.upper(), 'NEPAL'),
    (lambda n: 'WORKSHOP' in n.upper() or 'BATCH' in n.upper(), 'WORKSHOP'),
    (lambda n: 'CASH DEPOSIT' in n.upper() or 'CDM' in n.upper(), 'CASH DEPOSIT'),
]

def classify_narration(narration, exp_label):
    """Return (partyName, ledgerName/category)"""
    n = str(narration).upper()
    
    # If EXP column already has a label, use it
    if pd.notna(exp_label) and exp_label not in ['nan', '']:
        return exp_label, exp_label
    
    # Try rules
    for rule_fn, category in RULES:
        if rule_fn(n):
            return category, category
    
    # Fallback: extract party from UPI narration
    if 'UPI/' in n or 'UPI-' in n:
        parts = n.replace('UPI/', 'UPI-').split('-')
        if len(parts) >= 2:
            party = parts[1].strip()[:40]
            return party, 'UPI PAYMENT'
    
    if 'NEFT/' in n or 'RTGS/' in n or 'IMPS/' in n:
        parts = re.split(r'[/\-]', n)
        for p in parts:
            if len(p.strip()) > 3 and not p.strip().isdigit():
                return p.strip()[:40], 'BANK TRANSFER'
    
    return narration[:50] if narration else 'UNKNOWN', 'MISCELLANEOUS'

# ── Map to voucher types ──
def get_voucher_type(is_credit, category):
    """Determine Tally voucher type"""
    cat = str(category).upper()
    
    if 'CONTRA' in cat or 'BANK TRANSFER' in cat:
        return 'Contra'
    
    if is_credit:
        if any(w in cat for w in ['WORKSHOP', 'COURSE', 'FEES', 'INCOME', 'SALE']):
            return 'Receipt'
        if 'CASH DEPOSIT' in cat:
            return 'Contra'
        return 'Receipt'
    else:
        if any(w in cat for w in ['SALARY', 'REMUNERATION', 'RENT', 'ELECTRICITY',
                                    'INTERNET', 'GOOGLE', 'FACEBOOK', 'AWS', 'VERCEL',
                                    'HOSTING', 'DOMAIN', 'SUBSCRIPTION', 'INSURANCE',
                                    'TAX', 'GST', 'TDS', 'PROFESSIONAL', 'TRAVEL',
                                    'PRINTING', 'COURIER', 'OFFICE', 'LIGHT BILL',
                                    'ADVERTISEMENT']):
            return 'Payment'
        if 'DIVIDEND' in cat:
            return 'Payment'
        return 'Payment'

# ── Build voucher documents ──
vouchers = []
receipt_count = 0
payment_count = 0
contra_count = 0
journal_count = 0

for idx, row in df.iterrows():
    if row['parsed_date'] is None:
        continue
    
    party, category = classify_narration(row['narration'], row.get('EXP'))
    voucher_type = get_voucher_type(row['is_credit'], category)
    
    # Payment mode from narration
    narr = str(row['narration']).upper()
    if 'UPI' in narr:
        payment_mode = 'UPI'
    elif 'NEFT' in narr:
        payment_mode = 'NEFT'
    elif 'RTGS' in narr:
        payment_mode = 'RTGS'
    elif 'IMPS' in narr:
        payment_mode = 'IMPS'
    elif 'CASH' in narr or 'CDM' in narr:
        payment_mode = 'Cash'
    elif 'CHQ' in narr or 'CHEQUE' in narr:
        payment_mode = 'Cheque'
    else:
        payment_mode = 'Bank'
    
    # Build voucher number
    if voucher_type == 'Receipt':
        receipt_count += 1
        v_num = f"RCP-{receipt_count:04d}"
    elif voucher_type == 'Payment':
        payment_count += 1
        v_num = f"PAY-{payment_count:04d}"
    elif voucher_type == 'Contra':
        contra_count += 1
        v_num = f"CNT-{contra_count:04d}"
    else:
        journal_count += 1
        v_num = f"JRN-{journal_count:04d}"
    
    # Narration text for Tally
    narration_text = str(row['narration']).strip()
    if pd.notna(row.get('EXP')):
        narration_text = f"{row['EXP']} | {narration_text}"
    elif pd.notna(row.get('INCOME_DETAILS')):
        narration_text = f"{row['INCOME_DETAILS']} | {narration_text}"
    
    # Credit/Debit indicator in narration
    cr_dr = "Cr" if row['is_credit'] else "Dr"
    
    doc = {
        'voucherType': voucher_type,
        'voucherNumber': v_num,
        'date': row['parsed_date'],
        'partyName': str(party).strip()[:100],
        'ledgerName': str(category).strip()[:100],
        'amount': round(float(row['amt_num']), 2),
        'narration': f"[{cr_dr}] {narration_text[:500]}",
        'paymentMode': payment_mode,
        'financialYear': FY,
        'createdBy': 'system-import',
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    vouchers.append(doc)

print(f"\nPrepared {len(vouchers)} vouchers:")
print(f"  Receipts: {receipt_count}")
print(f"  Payments: {payment_count}")
print(f"  Contra: {contra_count}")
print(f"  Journal: {journal_count}")

# ── Preview first 5 ──
print("\n── Sample vouchers ──")
for v in vouchers[:5]:
    print(f"  {v['date']} | {v['voucherType']:8s} {v['voucherNumber']} | Rs {v['amount']:>10,.2f} | {v['partyName'][:30]}")

# ── Insert into MongoDB ──
print(f"\nConnecting to MongoDB...")
client = MongoClient(MONGO_URI)

# Use CRM database
db_name = None
with open(env_path) as f:
    for line in f:
        if line.startswith('MONGODB_CRM_DB_NAME='):
            db_name = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

# The tally_manual_vouchers collection is in the main DB (swaryogaDB)
# Let's check the URI to get the default DB
from urllib.parse import urlparse
parsed = urlparse(MONGO_URI)
default_db = parsed.path.lstrip('/')
if '?' in default_db:
    default_db = default_db.split('?')[0]

print(f"Default DB from URI: {default_db}")
db = client[default_db] if default_db else client['swaryogaDB']

collection = db['tally_manual_vouchers']

# Check existing entries for this FY
existing = collection.count_documents({'financialYear': FY})
print(f"Existing FY {FY} entries: {existing}")

if existing > 0:
    print(f"⚠️  Deleting {existing} existing FY {FY} entries first...")
    collection.delete_many({'financialYear': FY})
    print(f"   Deleted.")

# Insert all
result = collection.insert_many(vouchers)
print(f"\n✅ Inserted {len(result.inserted_ids)} vouchers for FY {FY}")

# Verify
total = collection.count_documents({'financialYear': FY})
print(f"Total FY {FY} entries in collection: {total}")

# Summary by type
for vtype in ['Receipt', 'Payment', 'Contra', 'Journal']:
    count = collection.count_documents({'financialYear': FY, 'voucherType': vtype})
    pipeline = [
        {'$match': {'financialYear': FY, 'voucherType': vtype}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]
    agg = list(collection.aggregate(pipeline))
    total_amt = agg[0]['total'] if agg else 0
    print(f"  {vtype:10s}: {count:4d} entries, Rs {total_amt:>12,.2f}")

client.close()
print("\n✅ Done! Check the daybook in CRM Tally page.")
