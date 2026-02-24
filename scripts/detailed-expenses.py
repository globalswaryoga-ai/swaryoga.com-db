import pandas as pd
import re

file_path = "/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx"
df = pd.read_excel(file_path, sheet_name='Sheet1', header=0)
df.columns = ['DATE', 'MONTH', 'narration', 'chq', 'amount', 'EXP', 'INCOME_DETAILS', 'balance']

def parse_amount(val):
    if pd.isna(val):
        return 0.0
    s = str(val).strip().replace(',', '')
    num = re.sub(r'[^\d.]', '', s)
    return float(num) if num else 0.0

def is_credit(val):
    return '(Cr)' in str(val)

df['parsed_amount'] = df['amount'].apply(parse_amount)
df['is_credit'] = df['amount'].apply(is_credit)

credits = df[df['is_credit']]
debits = df[~df['is_credit']]

# ════════════════════════════════════════════════════════
# INCOME BREAKDOWN
# ════════════════════════════════════════════════════════
print("=" * 70)
print("  INCOME BREAKDOWN (Total Deposits)")
print("=" * 70)

# Class/Workshop Income
swar_yoga = credits[credits['narration'].apply(lambda x: any(k in str(x).upper() for k in ['SWAR', 'YOGA', 'SWARYOG'])) | 
                     credits['INCOME_DETAILS'].apply(lambda x: any(k in str(x).upper() for k in ['SWAR', 'YOGA']) if pd.notna(x) else False)]
# Filter out investment-tagged ones
swar_yoga = swar_yoga[~swar_yoga['INCOME_DETAILS'].apply(lambda x: 'INVEST' in str(x).upper() if pd.notna(x) else False)]

# Investment
invest = credits[credits['INCOME_DETAILS'].apply(lambda x: 'INVEST' in str(x).upper() if pd.notna(x) else False) |
                 credits['narration'].apply(lambda x: 'INVEST' in str(x).upper())]

# Cash to bank
cash = credits[credits['INCOME_DETAILS'].apply(lambda x: 'CASH' in str(x).upper() if pd.notna(x) else False)]

# Nepal
nepal = credits[credits['INCOME_DETAILS'].apply(lambda x: 'NEPAL' in str(x).upper() if pd.notna(x) else False)]

# Weight loss  
wlp = credits[credits['INCOME_DETAILS'].apply(lambda x: 'WEIGHT' in str(x).upper() if pd.notna(x) else False)]

# Basic swar yoga
basic = credits[credits['INCOME_DETAILS'].apply(lambda x: 'BASIC' in str(x).upper() if pd.notna(x) else False)]

# Light bill received
light_r = credits[credits['INCOME_DETAILS'].apply(lambda x: 'LIGHT' in str(x).upper() if pd.notna(x) else False)]

# Bank interest
bank_int = credits[credits['INCOME_DETAILS'].apply(lambda x: 'INTREST' in str(x).upper() or 'INTEREST' in str(x).upper() if pd.notna(x) else False)]

# Other
tagged_ids = set()
for subset in [swar_yoga, invest, cash, nepal, wlp, basic, light_r, bank_int]:
    tagged_ids.update(subset.index.tolist())
other_cr = credits[~credits.index.isin(tagged_ids)]

syl1 = credits[credits['INCOME_DETAILS'].apply(lambda x: 'SWAR YOGA L' in str(x).upper() if pd.notna(x) else False)]

print(f"\n  A. CLASS/WORKSHOP INCOME (Business Income):")
print(f"     Swar Yoga L-1:          Rs {syl1['parsed_amount'].sum():>12,.2f}  ({len(syl1)} entries)")
print(f"     Basic Swar Yoga:        Rs {basic['parsed_amount'].sum():>12,.2f}  ({len(basic)} entries)")
print(f"     Weight Loss Program:    Rs {wlp['parsed_amount'].sum():>12,.2f}  ({len(wlp)} entries)")
class_total = syl1['parsed_amount'].sum() + basic['parsed_amount'].sum() + wlp['parsed_amount'].sum()
print(f"     ─────────────────────────────────────")
print(f"     TOTAL CLASS INCOME:     Rs {class_total:>12,.2f}")

print(f"\n  B. OTHER INCOME:")
print(f"     Investment Received:    Rs {invest['parsed_amount'].sum():>12,.2f}  ({len(invest)} entries)")
print(f"     Cash to Bank:           Rs {cash['parsed_amount'].sum():>12,.2f}  ({len(cash)} entries)")
print(f"     Nepal Amount Received:  Rs {nepal['parsed_amount'].sum():>12,.2f}  ({len(nepal)} entries)")
print(f"     Light Bill Received:    Rs {light_r['parsed_amount'].sum():>12,.2f}  ({len(light_r)} entries)")
print(f"     Bank Interest:          Rs {bank_int['parsed_amount'].sum():>12,.2f}  ({len(bank_int)} entries)")
if len(other_cr) > 0:
    print(f"     Other/Refund:           Rs {other_cr['parsed_amount'].sum():>12,.2f}  ({len(other_cr)} entries)")
other_total = invest['parsed_amount'].sum() + cash['parsed_amount'].sum() + nepal['parsed_amount'].sum() + light_r['parsed_amount'].sum() + bank_int['parsed_amount'].sum() + other_cr['parsed_amount'].sum()
print(f"     ─────────────────────────────────────")
print(f"     TOTAL OTHER INCOME:     Rs {other_total:>12,.2f}")

print(f"\n  ═══════════════════════════════════════")
print(f"  GRAND TOTAL INCOME:        Rs {credits['parsed_amount'].sum():>12,.2f}")


# ════════════════════════════════════════════════════════
# DETAILED EXPENSE BREAKDOWN - ALL SMALL EXPENSES
# ════════════════════════════════════════════════════════
print(f"\n\n{'=' * 70}")
print("  ALL EXPENSES - DETAILED CATEGORIZATION")
print("=" * 70)

def categorize_debit(narr_raw, amt, exp_label):
    narr = str(narr_raw).upper()
    
    # Already labeled in original data
    if pd.notna(exp_label):
        return str(exp_label)
    
    # Facebook / Meta
    if any(k in narr for k in ['FACEBOOK', 'META ADS', 'FACEBOOKADSM', 'META/']):
        return 'FACEBOOK ADV'
    # Google Ads
    if 'GOOGLE ADS' in narr:
        return 'GOOGLE ADS'
    # Electricity (MSEDCL)
    if 'MSEDCL' in narr:
        return 'LIGHT BILL'
    # MacBook
    if 'MACBOOK' in narr or 'MAC BOOK' in narr or ('LAXMI MOHAN' in narr and 'MAC' in narr):
        return 'MACBOOK EMI'
    # OnePlus / L&T Finance EMI
    if 'LNTFINANCIALSER' in narr or 'ONE PLUS' in narr:
        return 'MOBILE-ONE PLUS EMI'
    # Upamanyu
    if 'UPAMANYU' in narr or 'UPAMNYU' in narr:
        return 'UPAMNYU KALBURGI'
    # Prasanna PG (Upamanyu's PG)
    if 'PRASANNA PG' in narr:
        return 'UPAMNYU KALBURGI'
    # Diesel/Petrol
    if any(k in narr for k in ['DISEL', 'DIESEL', 'PETROL PUMP', 'HP PETROL', 'SWAMIRAJ PETROL']):
        return 'CAR DIESEL'
    # Car expenses
    if any(k in narr for k in ['CAR WASH', 'CAR TAPE', 'TRIPPLE C CAR', 'CAR EXPENSE', 'MANI MOTORS', 'GURUKRUPA ENTER']):
        return 'CAR EXPENSES'
    if 'SHREE GANESHA' in narr and amt > 5000:
        return 'CAR EXPENSES'
    # Mobile recharge (Jio)
    if 'JIO PREPAID' in narr or 'JIO RECHARGE' in narr:
        return 'MOBILE RECHARGE'
    # Google Play
    if 'GOOGLE PLAY' in narr:
        return 'GOOGLE PLAY SUBSCRIPTION'
    # Rent
    if '/RENT' in narr or narr.endswith('RENT') or 'KAILAS RAH' in narr:
        return 'OFFICE RENT'
    # Internet
    if 'SUMIT ANIL' in narr:
        return 'INTERNET (NET RECHARGE)'
    if 'GODADDY' in narr:
        return 'INTERNET (DOMAIN/HOSTING)'
    # Zoom
    if 'ZOOM' in narr:
        return 'ZOOM SUBSCRIPTION'
    # Zomato / Food / Hotel
    if any(k in narr for k in ['ZOMATO', 'DOMINOS', 'HOTEL JT', 'HOTEL VRUNDAVAN']):
        return 'FOOD & REFRESHMENT'
    if '/FOOD' in narr:
        return 'FOOD & REFRESHMENT'
    # Travel (IRCTC, redbus)
    if any(k in narr for k in ['IRCTC', 'REDBUS', 'TRAVEL']):
        return 'TRAVELLING EXP'
    # Class diesel
    if 'CLASS DISEL' in narr:
        return 'CLASS EXP (DIESEL)'
    # Bank charges
    if narr.startswith('CHR') or 'CHRG:' in narr or 'POS DECL' in narr or 'IMPS TRANSACTION' in narr:
        return 'BANK CHARGES'
    # Mohan Pandurang / Laxmi Mohan (teacher)
    if 'MOHAN PANDURANG' in narr or 'LAXMI MOHAN KAL' in narr:
        if amt >= 5000:
            return 'TEACHER REMUNERATION-MOHAN'
        return 'SMALL EXP (MOHAN KALBURGI)'
    # Pandurang Krishna
    if 'PANDURANG KRISH' in narr:
        return 'PANDURANG KRISHNA'
    # Investment return / Dividend
    if 'DIVIDEND' in narr or 'DIVIDENT' in narr:
        return 'DIVIDEND PAID'
    if 'MANJINDER' in narr:
        return 'INVESTMENT RETURN PAID'
    # Printing/Stationery
    if 'SHREE COMPUTER' in narr or 'PRINTING' in narr:
        return 'PRINTING & STATIONERY'
    # Medicine
    if 'MEDICIN' in narr or 'MEDICAL' in narr or 'CHANDAN MEDICIN' in narr:
        return 'MEDICAL EXP'
    # Tally software
    if 'COMHARD' in narr or 'TALLY' in narr:
        return 'TALLY SOFTWARE'
    # Amazon (office supplies)
    if 'AMAZON' in narr:
        return 'OFFICE SUPPLIES (AMAZON)'
    # Water filter
    if 'RAJESH RAMCHAND' in narr and ('WATET' in narr or 'WATER' in narr or 'FILTER' in narr):
        return 'WATER FILTER'
    if 'RAJESH RAMCHAND' in narr:
        return 'OFFICE MAINTENANCE'
    # MAHA VASTU
    if 'MAHA VASTU' in narr:
        return 'VASTU CONSULTATION'
    # Swamini cosmetics / personal of Meera
    if 'SWAMINI COSMETI' in narr:
        return 'PERSONAL EXP'
    # Kirankumar
    if 'KIRANKUMAR' in narr:
        return 'CLASS EXP'
    # PhonePe large
    if 'PHONEPE' in narr:
        return 'UPI PAYMENT (REVIEW)'
    # Nitin Suresh
    if 'NITIN SURESH' in narr:
        return 'CLASS EXP'
    # Prajwal
    if 'PRAJWAL' in narr:
        return 'SMALL OFFICE EXP'
    # Megha Malani
    if 'MEGHA MALANI' in narr:
        return 'OFFICE EXP'
    # Rahul Dashrath
    if 'RAHUL DASHRATH' in narr:
        return 'CLASS EXP'
    # HDFC credit
    if 'HDFC BANK CREDI' in narr:
        return 'CREDIT CARD PAYMENT'
    # Arvind Kalburgi
    if 'ARVIND KALBURGI' in narr:
        return 'PERSONAL/FAMILY'
    # Fruit/Grocery
    if any(k in narr for k in ['SHRAVAN', 'FRUIT', 'FUOT', 'PARIVAR KIRANA', 'KIRANA']):
        return 'GROCERY & PROVISIONS'
    # SACHIN LAXMAN
    if 'SACHIN LAXMAN' in narr:
        return 'OFFICE MAINTENANCE'
    # SACHIN SUBHASH
    if 'SACHIN SUBHASH' in narr:
        return 'OFFICE EXP'
    # Bishi / Chit fund
    if 'BISHI' in narr:
        return 'BISHI (CHIT FUND)'
    # Software purchase
    if 'SOFTWAR' in narr:
        return 'SOFTWARE EXP'
    # Computer purchase
    if 'COMPUTER' in narr:
        return 'COMPUTER & ACCESSORIES'
    # Sangamner Taluka
    if 'SANGAMNER TALUK' in narr:
        return 'GOVT FEES'
    # Non-tax receipt
    if 'NON TAX' in narr:
        return 'GOVT FEES'
    # Pramod / videography
    if 'PRAMOD' in narr:
        return 'OFFICE EXP'
    # Pravin Machhind
    if 'PRAVIN MACHHIND' in narr:
        return 'OFFICE EXP'
    # VIJAY SHESHARAO
    if 'VIJAY SHESHARAO' in narr:
        return 'OFFICE EXP'
    # SHAIKH LIYAKHAT
    if 'SHAIKH' in narr:
        return 'OFFICE EXP'
    # SARDAR AMIN
    if 'SARDAR AMIN' in narr:
        return 'OFFICE EXP'
    # SIVAN
    if 'SIVAN' in narr:
        return 'OFFICE EXP'
    # RANJIT KUMAR
    if 'RANJIT' in narr:
        return 'FOOD & REFRESHMENT'

    # Amount-based fallback
    if amt < 500:
        return 'SMALL OFFICE EXP (<500)'
    return 'MISC EXP (REVIEW)'

# Apply detailed categorization
debits = debits.copy()
debits['DETAIL_CAT'] = debits.apply(lambda r: categorize_debit(r['narration'], r['parsed_amount'], r['EXP']), axis=1)

# Print summary by category
cats = debits.groupby('DETAIL_CAT').agg(
    count=('parsed_amount', 'count'),
    total=('parsed_amount', 'sum')
).sort_values('total', ascending=False)

grand_exp = debits['parsed_amount'].sum()
print(f"\n  {'CATEGORY':<35s} | {'COUNT':>5s} | {'TOTAL':>14s} | {'%':>5s}")
print(f"  {'─'*35}─┼─{'─'*5}─┼─{'─'*14}─┼─{'─'*5}")
for cat, row in cats.iterrows():
    pct = (row['total'] / grand_exp * 100) if grand_exp > 0 else 0
    print(f"  {cat:<35s} | {int(row['count']):>5d} | Rs {row['total']:>10,.0f} | {pct:>4.1f}%")
print(f"  {'─'*35}─┼─{'─'*5}─┼─{'─'*14}─┼─{'─'*5}")
print(f"  {'GRAND TOTAL EXPENSES':<35s} | {len(debits):>5d} | Rs {grand_exp:>10,.0f} | 100%")

# Now show EACH small category in detail
print(f"\n\n{'=' * 70}")
print("  SMALL EXPENSES - ITEM-WISE DETAIL")
print("=" * 70)

small_cats = [
    'SMALL OFFICE EXP (<500)', 'SMALL EXP (MOHAN KALBURGI)',
    'FOOD & REFRESHMENT', 'GROCERY & PROVISIONS', 'PRINTING & STATIONERY',
    'MEDICAL EXP', 'TALLY SOFTWARE', 'OFFICE SUPPLIES (AMAZON)',
    'WATER FILTER', 'VASTU CONSULTATION', 'PERSONAL EXP',
    'OFFICE MAINTENANCE', 'GOVT FEES', 'SOFTWARE EXP',
    'GOOGLE PLAY SUBSCRIPTION', 'ZOOM SUBSCRIPTION',
    'INTERNET (NET RECHARGE)', 'INTERNET (DOMAIN/HOSTING)',
    'CREDIT CARD PAYMENT', 'PERSONAL/FAMILY', 'BISHI (CHIT FUND)',
    'CLASS EXP (DIESEL)', 'COMPUTER & ACCESSORIES',
    'MISC EXP (REVIEW)', 'UPI PAYMENT (REVIEW)',
    'PANDURANG KRISHNA',
]

for cat in small_cats:
    subset = debits[debits['DETAIL_CAT'] == cat]
    if len(subset) == 0:
        continue
    total = subset['parsed_amount'].sum()
    print(f"\n  ── {cat} (Rs {total:,.0f}, {len(subset)} entries) ──")
    for _, r in subset.sort_values('DATE').iterrows():
        narr = str(r['narration']).replace('\n', ' ')[:55]
        dt = str(r['DATE'])[:10]
        print(f"     {dt} | Rs {r['parsed_amount']:>8,.0f} | {narr}")

# Final cross-check
print(f"\n\n{'=' * 70}")
print("  CROSS-CHECK WITH BANK STATEMENT")
print("=" * 70)
print(f"  Bank: Total Withdrawals = Rs 12,85,586.53")
print(f"  Our : Total Debits      = Rs {grand_exp:>12,.2f}")
print(f"  Bank: Total Deposits    = Rs 12,91,896.72")
print(f"  Our : Total Credits     = Rs {credits['parsed_amount'].sum():>12,.2f}")
print(f"  Bank: Opening Balance   = Rs    37,440.78")
print(f"  Bank: Closing Balance   = Rs    43,750.97")
print(f"  Calc: 37440.78 + {credits['parsed_amount'].sum():.2f} - {grand_exp:.2f} = {37440.78 + credits['parsed_amount'].sum() - grand_exp:.2f}")
