#!/usr/bin/env python3
"""
Final deep classification of ALL expenses including MISC EXP (REVIEW) bucket.
Produces a clean Tally-ready summary.
"""
import pandas as pd
import numpy as np
import re, sys, os

EXCEL = os.path.expanduser("~/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx")
df = pd.read_excel(EXCEL, sheet_name="Sheet1", header=0)
df.columns = [c.strip() for c in df.columns]

# Fix column name
if 'INCOME DETAILS' in df.columns:
    df.rename(columns={'INCOME DETAILS': 'INCOME_DETAILS'}, inplace=True)

# Normalise EXP / INCOME_DETAILS
for c in ['EXP', 'INCOME_DETAILS']:
    if c in df.columns:
        df[c] = df[c].astype(str).str.strip()
        df.loc[df[c].isin(['nan', 'NaN', '', 'None']), c] = np.nan

df['narration'] = df['narration'].astype(str).str.strip()

# --- Parse amount column ---
# Values like "2,500.00(Cr)" = credit, "2500" or "2,500.00" = debit
def parse_amount(val):
    s = str(val).strip()
    is_cr = '(Cr)' in s or '(CR)' in s
    # Remove (Cr), (Dr), (CR), (DR), commas, spaces
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

print(f"Total rows: {len(df)}")
print(f"Credits: {df['is_credit'].sum()}, Debits: {(~df['is_credit']).sum()}")
print(f"Total Credit: Rs {df.loc[df['is_credit'], 'amt_num'].sum():,.2f}")
print(f"Total Debit:  Rs {df.loc[~df['is_credit'], 'amt_num'].sum():,.2f}")

# --- Typo fixes for existing EXP labels ---
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

# Narration-based classification rules
RULES = [
    # Bank Transfers / Contra
    (lambda n: 'SWAR YOGA' in n.upper() and 'UBIN' in n.upper(), 'BANK TRANSFER (CONTRA)'),
    (lambda n: 'CONTRA' in n.upper(), 'BANK TRANSFER (CONTRA)'),
    
    # Advance to Director
    (lambda n: 'MOHAN KALB' in n.upper() and 'HDFC' in n.upper() and any(w in n.upper() for w in ['ADVANCE', '162000', '1400']), 'ADVANCE TO DIRECTOR'),
    
    # Persons
    (lambda n: 'UPAMANYU' in n.upper() or 'UPAMNYU' in n.upper(), 'UPAMNYU KALBURGI'),
    (lambda n: 'TURYA MOHAN' in n.upper(), 'TURYA MOHAN (SON)'),
    (lambda n: 'SHUBHAM ARVIND' in n.upper(), 'SHUBHAM ARVIND'),
    (lambda n: 'PANDURANG KRISH' in n.upper(), 'PANDURANG KRISHNA'),
    
    # Mohan/Laxmi (for amounts < 5000 that aren't already teacher remuneration)
    (lambda n: 'MOHAN PANDURANG' in n.upper() or 'LAXMI MOHAN' in n.upper(), 'MOHAN/LAXMI KALBURGI'),
    
    # Facebook/Meta
    (lambda n: any(w in n.upper() for w in ['FACEBOOK', 'FACE BOOK', 'FACEBK', 'WWW FACEBOOK', 'META PLATFORMS']), 'FACEBOOK ADVERTISEMENT'),
    
    # Vehicle / Petrol
    (lambda n: any(w in n.upper() for w in ['PETROL', 'BP MOBILITY', 'INDIAN OIL', 'BHARAT PETROLEUM']), 'PETROL / FUEL'),
    (lambda n: 'SAHYADRI PETROL' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'KAKADE PATIL PE' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'S G ABHANG PETR' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'PATIL HIGHWAY' in n.upper(), 'PETROL / FUEL'),
    (lambda n: any(w in n.upper() for w in ['AMERIYA AUTOMOB', 'NEWASKAR AUTOMO']), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'CAR REPAIR' in n.upper() or 'CAR TAPE' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'HARK KHATRI' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'RAHUL RAMNATH' in n.upper() and 'CAR' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    
    # Software / Subscriptions
    (lambda n: 'ZOOM' in n.upper() or 'ZVC INDIA' in n.upper(), 'ZOOM SUBSCRIPTION'),
    (lambda n: 'CANVA' in n.upper(), 'CANVA SUBSCRIPTION'),
    (lambda n: 'GOOGLE PLAY' in n.upper(), 'GOOGLE PLAY SUBSCRIPTION'),
    (lambda n: 'GODADDY' in n.upper(), 'DOMAIN / HOSTING'),
    (lambda n: 'JIOCINEMA' in n.upper(), 'SUBSCRIPTION (ENTERTAINMENT)'),
    
    # MSEDCL / Light Bill
    (lambda n: 'MSEDCL' in n.upper(), 'LIGHT BILL (ELECTRICITY)'),
    
    # MacBook EMI
    (lambda n: 'MACBOOK' in n.upper() or 'MACKBOOK' in n.upper(), 'MACBOOK EMI'),
    
    # Food / Hotel
    (lambda n: any(w in n.upper() for w in ['ZOMATO', 'DOMINOS', 'SWIGGY']), 'FOOD & REFRESHMENT'),
    (lambda n: 'FOOD' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: any(w in n.upper() for w in ['HOTEL GREEN', 'HOTEL JT', 'HOTEL VRUNDAVAN', 'SHREEGANESHHOTE']), 'FOOD & REFRESHMENT'),
    
    # Grocery / Supermarket
    (lambda n: any(w in n.upper() for w in ['AVENUE SUPERMAR', 'KIRANA', 'FRUIT M', 'FUOT MA']), 'GROCERY & PROVISIONS'),
    
    # Medical
    (lambda n: any(w in n.upper() for w in ['MEDICAL', 'MEDICIN', 'PHARMACY']), 'MEDICAL EXPENSES'),
    
    # Tax / Govt
    (lambda n: 'TAX CARE' in n.upper() or 'TAx CARE' in n.upper() or 'TAX CARE' in n, 'TAX CONSULTATION'),
    (lambda n: 'CENTRAL BOARD' in n.upper(), 'INCOME TAX PAYMENT'),
    (lambda n: 'NON TAX RECEIPT' in n.upper() or 'SANGAMNER TALUK' in n.upper(), 'GOVT FEES'),
    
    # Class Organiser - Abhay Lagad
    (lambda n: 'LAGAD ABHAY' in n.upper(), 'CLASS ORGANISER (ABHAY LAGAD)'),
    
    # Internet
    (lambda n: 'NET RECHARGE' in n.upper() or ('SUMIT ANIL ATT' in n.upper() and 'RECHARGE' in n.upper()), 'INTERNET CHARGES'),
    (lambda n: 'SUMIT ANIL ATT' in n.upper(), 'INTERNET CHARGES'),
    
    # Amazon
    (lambda n: 'AMAZON' in n.upper(), 'OFFICE SUPPLIES (AMAZON)'),
    
    # Tally
    (lambda n: 'COMHARD' in n.upper() or ('TALLY' in n.upper() and 'UPI' in n.upper()), 'TALLY SOFTWARE'),
    
    # Water Filter
    (lambda n: 'WATER' in n.upper() or 'WATET' in n.upper(), 'WATER FILTER'),
    
    # Vastu
    (lambda n: 'VASTU' in n.upper(), 'VASTU CONSULTATION'),
    
    # Credit Card
    (lambda n: 'HDFC BANK CREDI' in n.upper(), 'CREDIT CARD PAYMENT'),
    
    # Printing
    (lambda n: any(w in n.upper() for w in ['PRINTING', 'SHREE COMPUTER', 'SAPTSHRUNGI XER', 'XEROX']), 'PRINTING & STATIONERY'),
    
    # Cosmetics/Personal
    (lambda n: 'COSMETI' in n.upper(), 'PERSONAL EXPENSES'),
    
    # Office Maintenance (Sachin Laxman)
    (lambda n: 'SACHIN LAXMAN' in n.upper(), 'OFFICE MAINTENANCE'),
    
    # IRCTC - Travelling
    (lambda n: 'IRCTC' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'REDBUS' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'SMART PUNE' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'MSRTC' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'ARCHAEOLOGICAL' in n.upper(), 'TRAVELLING EXPENSES'),
    
    # PhonePe (unidentified)
    (lambda n: 'PHONEPE' in n.upper() and len(n) < 60, 'UPI PAYMENT (REVIEW)'),
    
    # Land
    (lambda n: 'LAND' in n.upper() and 'SENT' in n.upper(), 'LAND EXPENSE'),
    
    # Dividends (sent to investors)
    (lambda n: 'DIVIDEND' in n.upper(), 'DIVIDEND PAID'),
    
    # Investment returned
    (lambda n: 'INVESTMENT RETU' in n.upper() or 'INVEST RETURN' in n.upper(), 'INVESTMENT RETURNED'),
    
    # Meta Ads / Google Ads (not caught by FACEBOOK rule)
    (lambda n: 'META ADS' in n.upper() or 'META/' in n.upper(), 'FACEBOOK ADVERTISEMENT'),
    (lambda n: 'GOOGLE ADS' in n.upper(), 'GOOGLE ADVERTISEMENT'),
    
    # Jio / Mobile recharge
    (lambda n: 'JIO PREPAID' in n.upper() or 'JIO RECHARGE' in n.upper(), 'MOBILE RECHARGE'),
    (lambda n: 'PREPAID REC' in n.upper(), 'MOBILE RECHARGE'),
    
    # Rent (kailas rah / HDFC + RENT)
    (lambda n: 'KAILAS RAH' in n.upper() and 'RENT' in n.upper(), 'OFFICE RENT'),
    (lambda n: '/RENT' in n.upper(), 'OFFICE RENT'),
    
    # Car wash / diesel
    (lambda n: 'CAR WASH' in n.upper() or 'TRIPPLE C' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'DISEL' in n.upper() or 'DIESEL' in n.upper(), 'PETROL / FUEL'),
    
    # Office expense mentioned in narration
    (lambda n: 'OFFICE EXPENSE' in n.upper(), 'OFFICE EXPENSES'),
    
    # Shree Ganesha / Auto
    (lambda n: 'SHREE GANESHA A' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    
    # Insurance
    (lambda n: 'LNEFINANCIAL' in n.upper() or 'LnTFinancial' in n, 'UPAMNYU KALBURGI'),
    (lambda n: 'L&T FINANCE' in n.upper() or 'LNTFINANCIAL' in n.upper(), 'UPAMNYU KALBURGI'),
    (lambda n: 'LnTFinancial' in n, 'UPAMNYU KALBURGI'),
    
    # Cashfree / Payment gateway
    (lambda n: 'CASHFREE' in n.upper(), 'PAYMENT GATEWAY CHARGES'),
    
    # IRCTC    
    (lambda n: 'IRCTC' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'REDBUS' in n.upper(), 'TRAVELLING EXPENSES'),
    
    # Specific persons
    (lambda n: 'NANDA KANTILAL' in n.upper(), 'CLASS EXPENSES'),
    (lambda n: 'DHEERAJ NANASAH' in n.upper(), 'CLASS EXPENSES'),
    (lambda n: 'SUNIL MAHARANID' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'ABDUL MAJID' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'MAHADEO SHARAN' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SHRI SIDDESHWAR' in n.upper(), 'DONATIONS'),
    (lambda n: 'SHREE MAHANKALI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'KORTIKAR NILAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SAHAKARMAHARSHI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'AKSHAY GANGA' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'ARVIND KALBURGI' in n.upper() and 'FOOD' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'ARVIND KALBURGI' in n.upper(), 'PERSONAL/FAMILY'),
    (lambda n: 'KARUNA CH' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SAURABH SUM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'RAMESH SHIVRAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'YASH TRADERS' in n.upper(), 'OFFICE SUPPLIES'),
    (lambda n: 'AJAY NANKRAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'GANESH KASHINAT' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'RAHUL RAMNATH' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'SMART POINT' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'S B DIVEKAR' in n.upper(), 'PETROL / FUEL'),
    (lambda n: 'ANKUR UKEY' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'MANDAR TULSHIDA' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SANTOSH PIRAJI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'KISHOR RAVINDRA' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'RAJESH PANDHARI' in n.upper(), 'OFFICE EXPENSES'),
    
    # More catch-all patterns
    (lambda n: 'Kirankumar' in n or 'KIRANKUMAR' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'PRAVIN MACHHIND' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SARVODAYA NAGAR' in n.upper(), 'LIGHT BILL (ELECTRICITY)'),
    (lambda n: 'GALANDE SNACK' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'GOVIND JAYAR' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'IRFAN SHARFUDD' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'KEDARNATH BADRI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'HOTEL PANDURANG' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'AISHWARYA FI' in n.upper() or 'MS AISHWARYA' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'BALAJI KIR' in n.upper(), 'GROCERY & PROVISIONS'),
    (lambda n: 'Ratnadeep Elect' in n or 'RATNADEEP' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'VIJAY SHESHARAO' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'MANJINDER KAUR' in n.upper(), 'INVESTMENT RETURNED'),
    (lambda n: 'RAHUL DASHRATH' in n.upper(), 'CLASS EXPENSES'),
    (lambda n: 'NITIN SURESH' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'TAPAS DAS' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'RANJIT KUMAR' in n.upper(), 'FOOD & REFRESHMENT'),
    
    # Even more patterns found in review items
    (lambda n: 'TRAVELLING' in n.upper() or 'TRAVEL' in n.upper(), 'TRAVELLING EXPENSES'),
    (lambda n: 'CAR EXPENSE' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'MANI MOTORS' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'GURUKRUPA ENTER' in n.upper(), 'VEHICLE REPAIR & MAINTENANCE'),
    (lambda n: 'JIVAN AYURVED' in n.upper(), 'MEDICAL EXPENSES'),
    (lambda n: 'AMBIKA SWEETS' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'DEBIT CARD ANNUAL FEE' in n.upper() or 'BANK CHARGE' in n.upper(), 'BANK CHARGES'),
    (lambda n: 'BILLPAY FOR JIO' in n.upper(), 'MOBILE RECHARGE'),
    (lambda n: 'MEGHA MALANI' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SHAIKH LIYAKHAT' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SHAILESH SU' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'PARVEZ MOHMMAD' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'NAMASTE' in n.upper() and 'UPI' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'MOHAN KALBURGI' in n.upper(), 'MOHAN/LAXMI KALBURGI'),
    (lambda n: 'SIDDHI' in n.upper() and ('KIRANA' in n.upper() or 'STORE' in n.upper()), 'GROCERY & PROVISIONS'),
    (lambda n: 'AVDHOOT' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'SHREE GOPALKRUS' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'RAJENDRA BHASKA' in n.upper(), 'OFFICE EXPENSES'),
    
    # Final catch-all patterns
    (lambda n: 'POS DECL FEE' in n.upper() or 'Chrg:' in n, 'BANK CHARGES'),
    (lambda n: 'ANAND KULFI' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'KAILAS FLOUR' in n.upper(), 'GROCERY & PROVISIONS'),
    (lambda n: 'FLOUR' in n.upper() and 'MILL' in n.upper(), 'GROCERY & PROVISIONS'),
    (lambda n: 'KULFI' in n.upper() or 'JUICE' in n.upper() or 'JUIC' in n.upper(), 'FOOD & REFRESHMENT'),
    (lambda n: 'RAJESH RAMCHAND' in n.upper(), 'OFFICE MAINTENANCE'),
    (lambda n: 'VIKAS SHETTY' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'IBUL ISLAM' in n.upper(), 'OFFICE EXPENSES'),
    (lambda n: 'GHAWATE' in n.upper(), 'OFFICE EXPENSES'),
]

# Income classification from INCOME_DETAILS column or narration
INCOME_MAP = {
    'SWAR YOGA L-1': 'SWAR YOGA CLASS INCOME',
    'SWAR YOSGA L-1': 'SWAR YOGA CLASS INCOME',
    'BASIC SWAR YOGA': 'BASIC SWAR YOGA INCOME',
    'WEIGHT LOSS PROGRAM': 'WEIGHT LOSS PROGRAM INCOME',
    'INVESTMENT': 'INVESTMENT RECEIVED',
    'CASH': 'CASH DEPOSITED',
    'NEPAL': 'NEPAL INCOME',
    'LIGHT BILL RECEIVED': 'LIGHT BILL RECEIVED',
    'BANK INTEREST': 'BANK INTEREST',
    'REFUND': 'REFUND',
}

# --- Classify each row ---
results = []
for _, row in df.iterrows():
    narr = str(row['narration'])
    amt = row['amt_num']
    exp_raw = row.get('EXP', np.nan)
    inc_raw = row.get('INCOME_DETAILS', np.nan)
    is_credit = row['is_credit']
    date = row.get('DATE', '')
    month = row.get('MONTH', '')
    
    category = None
    source = None
    
    if is_credit:
        # Income row
        if pd.notna(inc_raw) and str(inc_raw).strip() not in ['nan', '']:
            inc_str = str(inc_raw).strip().upper()
            # Map to clean name
            for key, val in INCOME_MAP.items():
                if key in inc_str:
                    category = val
                    break
            if not category:
                category = str(inc_raw).strip()
            source = 'EXISTING'
        else:
            # Try narration-based income classification
            narr_up = narr.upper()
            if 'SWAR' in narr_up or 'YOGA' in narr_up:
                category = 'SWAR YOGA CLASS INCOME'
            elif 'INVESTMENT' in narr_up or 'SHARE' in narr_up:
                category = 'INVESTMENT RECEIVED'
            elif 'DIVIDEND' in narr_up:
                category = 'DIVIDEND RECEIVED'
            elif 'CASHFREE' in narr_up or 'NEFT' in narr_up:
                category = 'PAYMENT GATEWAY RECEIPT'
            elif 'INSTANTPAY' in narr_up:
                category = 'PAYMENT GATEWAY RECEIPT'
            elif 'PERFIOS' in narr_up:
                category = 'OTHER INCOME'
            elif 'REV-UPI' in narr_up:
                category = 'UPI REVERSAL (REFUND)'
            else:
                category = 'CLASS INCOME (AUTO)'
            source = 'AUTO'
    else:
        # Expense row
        # First: use existing EXP label (cleaned)
        if pd.notna(exp_raw) and str(exp_raw).strip() not in ['nan', '']:
            exp_clean = typo_fix(str(exp_raw).strip())
            # Map to clean Tally categories
            EXP_MAP = {
                'OFFICE EXP': None,  # Will be refined by narration rules
                'FACEBOOK ADV': 'FACEBOOK ADVERTISEMENT',
                'FACE BOOK ADV': 'FACEBOOK ADVERTISEMENT',
                'TRAVELLING EXP': 'TRAVELLING EXPENSES',
                'TEACHER REMUNERATION': 'TEACHER REMUNERATION',
                'LIGHT BILL': 'LIGHT BILL (ELECTRICITY)',
                'MACBOOK EMI': 'MACBOOK EMI',
                'UPAMNYU KALBURGI': 'UPAMNYU KALBURGI',
                'OFFICE RENT': 'OFFICE RENT',
                'MOHAN KALBURGI': None,  # Refine below
                'DIVIDEND': 'DIVIDEND PAID',
                'CLASS EXP': 'CLASS EXPENSES',
                'SWAR YOGA L-1': None,  # This is income side, ignore for debit
                'MOBILE-ONE PLUS': 'MOBILE PURCHASE',
                'MOBILE RECHARGE': 'MOBILE RECHARGE',
            }
            mapped = EXP_MAP.get(exp_clean, exp_clean)
            if mapped:
                category = mapped
                source = 'EXISTING'
        
        # If not classified or was set to None for refinement, try narration rules
        if not category:
            for rule_fn, cat in RULES:
                if rule_fn(narr):
                    category = cat
                    source = 'AUTO'
                    break
        
        # Special: Mohan payments >= 5000 = Teacher Remuneration
        if not category and ('MOHAN PANDURANG' in narr.upper() or 'LAXMI MOHAN' in narr.upper()):
            if amt >= 5000:
                category = 'TEACHER REMUNERATION'
            else:
                category = 'MOHAN/LAXMI KALBURGI'
            source = 'AUTO'
        
        # Special: ADVANCE to director
        if not category and 'MOHAN KALB' in narr.upper() and 'HDFC' in narr.upper():
            category = 'ADVANCE TO DIRECTOR'
            source = 'AUTO'
        
        if not category:
            # Small unidentified amounts → Sundry Expenses (Tally-ready)
            if amt <= 1000:
                category = 'SUNDRY EXPENSES'
                source = 'AUTO'
            else:
                category = 'MISC EXPENSES (REVIEW)'
                source = 'REVIEW'
    
    results.append({
        'DATE': date,
        'MONTH': month,
        'NARRATION': narr,
        'AMOUNT': amt,
        'TYPE': 'CREDIT' if is_credit else 'DEBIT',
        'CATEGORY': category,
        'SOURCE': source,
    })

rdf = pd.DataFrame(results)

# === PRINT SUMMARY ===
print("\n" + "=" * 75)
print("  FINAL CLASSIFICATION SUMMARY - FY 2024-25")
print("  Upamnyu International Education Pvt Ltd")
print("  A/c: Kotak Mahindra 0247296457, Sangamner")
print("=" * 75)

# --- INCOME ---
credits = rdf[rdf['TYPE'] == 'CREDIT']
print(f"\n{'─'*75}")
print(f"  INCOME SUMMARY (Total: Rs {credits['AMOUNT'].sum():,.0f})")
print(f"{'─'*75}")
inc_summary = credits.groupby('CATEGORY').agg(
    Count=('AMOUNT', 'count'),
    Total=('AMOUNT', 'sum')
).sort_values('Total', ascending=False)

for cat, row in inc_summary.iterrows():
    print(f"  {cat:<40} {int(row['Count']):>3}  Rs {row['Total']:>10,.0f}")
print(f"  {'─'*65}")
print(f"  {'TOTAL INCOME':<40} {int(credits.shape[0]):>3}  Rs {credits['AMOUNT'].sum():>10,.0f}")

# Break down: Business Income vs Investment/Other
biz_cats = ['SWAR YOGA CLASS INCOME', 'BASIC SWAR YOGA INCOME', 'WEIGHT LOSS PROGRAM INCOME', 'CLASS INCOME (AUTO)']
biz_income = credits[credits['CATEGORY'].isin(biz_cats)]['AMOUNT'].sum()
invest_income = credits[credits['CATEGORY'] == 'INVESTMENT RECEIVED']['AMOUNT'].sum()
other_income = credits['AMOUNT'].sum() - biz_income - invest_income
print(f"\n  >> Business Income (Classes): Rs {biz_income:,.0f}")
print(f"  >> Investment Received:       Rs {invest_income:,.0f}")
print(f"  >> Other/Misc Income:         Rs {other_income:,.0f}")

# --- EXPENSES ---
debits = rdf[rdf['TYPE'] == 'DEBIT']
print(f"\n{'─'*75}")
print(f"  EXPENSE SUMMARY (Total: Rs {debits['AMOUNT'].sum():,.0f})")
print(f"{'─'*75}")
exp_summary = debits.groupby('CATEGORY').agg(
    Count=('AMOUNT', 'count'),
    Total=('AMOUNT', 'sum')
).sort_values('Total', ascending=False)

print(f"\n  {'TALLY LEDGER':<40} {'#':>3}  {'AMOUNT':>12}  {'%':>5}")
print(f"  {'─'*65}")
total_exp = debits['AMOUNT'].sum()
for cat, row in exp_summary.iterrows():
    pct = row['Total'] / total_exp * 100 if total_exp > 0 else 0
    marker = " ⚠" if 'REVIEW' in cat else ""
    print(f"  {cat:<40} {int(row['Count']):>3}  Rs {row['Total']:>10,.0f}  {pct:>4.1f}%{marker}")
print(f"  {'─'*65}")
print(f"  {'GRAND TOTAL EXPENSES':<40} {int(debits.shape[0]):>3}  Rs {total_exp:>10,.0f}")

# --- TALLY GROUPS ---
print(f"\n{'─'*75}")
print(f"  TALLY LEDGER GROUPING (for Tally Entry)")
print(f"{'─'*75}")

TALLY_GROUPS = {
    'Direct Expenses (Teaching / Classes)': [
        'TEACHER REMUNERATION',
        'CLASS ORGANISER (ABHAY LAGAD)',
        'CLASS EXPENSES',
    ],
    'Indirect Expenses (Overheads)': [
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
        'MACBOOK EMI',
        'MOBILE PURCHASE',
        'MOBILE RECHARGE',
    ],
    'Marketing & Sales Promotion': [
        'FACEBOOK ADVERTISEMENT',
        'CANVA SUBSCRIPTION',
    ],
    'Travelling & Conveyance': [
        'TRAVELLING EXPENSES',
        'PETROL / FUEL',
        'VEHICLE REPAIR & MAINTENANCE',
    ],
    'Software & IT Expenses': [
        'ZOOM SUBSCRIPTION',
        'GOOGLE PLAY SUBSCRIPTION',
        'SUBSCRIPTION (ENTERTAINMENT)',
    ],
    'Taxes & Professional Fees': [
        'GOVT FEES',
        'TAX CONSULTATION',
        'INCOME TAX PAYMENT',
        'VASTU CONSULTATION',
        'DONATIONS',
    ],
    'Payments to Persons / Directors': [
        'UPAMNYU KALBURGI',
        'MOHAN/LAXMI KALBURGI',
        'TURYA MOHAN (SON)',
        'SHUBHAM ARVIND',
        'PANDURANG KRISHNA',
        'ADVANCE TO DIRECTOR',
        'PERSONAL EXPENSES',
        'PERSONAL/FAMILY',
        'CREDIT CARD PAYMENT',
        'DIVIDEND PAID',
    ],
    'Bank Transfer (Contra)': [
        'BANK TRANSFER (CONTRA)',
    ],
    'Fixed Assets / Land': [
        'LAND EXPENSE',
    ],
    'Needs Review ⚠': [
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
            pct = tot / total_exp * 100 if total_exp > 0 else 0
            print(f"     ├── {cat:<38} {cnt:>3}  Rs {tot:>10,.0f}  ({pct:.1f}%)")
        print(f"     └── {'SUBTOTAL':<38} {group_count:>3}  Rs {group_total:>10,.0f}")

# --- Items still needing review ---
review_items = rdf[(rdf['SOURCE'] == 'REVIEW') & (rdf['TYPE'] == 'DEBIT')]
if not review_items.empty:
    print(f"\n{'─'*75}")
    print(f"  ⚠  ITEMS NEEDING YOUR REVIEW ({len(review_items)} entries, Rs {review_items['AMOUNT'].sum():,.0f})")
    print(f"{'─'*75}")
    for _, r in review_items.sort_values('AMOUNT', ascending=False).head(30).iterrows():
        print(f"     {str(r['DATE'])[:10]} | Rs {r['AMOUNT']:>8,.0f} | {r['NARRATION'][:65]}")
    if len(review_items) > 30:
        print(f"     ... and {len(review_items) - 30} more items (see Excel for full list)")

# --- NET RESULT ---
print(f"\n{'═'*75}")
print(f"  NET RESULT")
print(f"{'═'*75}")
print(f"  Total Income    : Rs {credits['AMOUNT'].sum():>12,.0f}")
print(f"  Total Expenses  : Rs {debits['AMOUNT'].sum():>12,.0f}")
print(f"  Net Surplus     : Rs {credits['AMOUNT'].sum() - debits['AMOUNT'].sum():>12,.0f}")
print(f"\n  Opening Balance : Rs    37,440.78")
calc = 37440.78 + credits['AMOUNT'].sum() - debits['AMOUNT'].sum()
print(f"  Closing (Calc)  : Rs {calc:>12,.2f}")
print(f"  Closing (Actual): Rs    43,750.97")

diff = abs(calc - 43750.97)
if diff > 1:
    print(f"  ⚠  Difference   : Rs {diff:>12,.2f} (check if some rows missing)")

# Write Excel
OUT = os.path.expanduser("~/Downloads/SwarYoga_FY2024-25_FINAL.xlsx")
with pd.ExcelWriter(OUT, engine='openpyxl') as writer:
    rdf.to_excel(writer, sheet_name='All Transactions', index=False)
    inc_summary.to_excel(writer, sheet_name='Income Summary')
    exp_summary.to_excel(writer, sheet_name='Expense Summary')
    if not review_items.empty:
        review_items.to_excel(writer, sheet_name='Needs Review', index=False)

print(f"\n  ✅ Final Excel: {OUT}")
