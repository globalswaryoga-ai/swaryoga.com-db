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

def is_debit(val):
    s = str(val)
    return '(Dr)' in s or ('(Cr)' not in s and s.replace(',','').replace('.','').replace(' ','').isdigit())

df['parsed_amount'] = df['amount'].apply(parse_amount)
df['is_debit'] = df['amount'].apply(is_debit)

# Only debits (money going OUT)
debits = df[df['is_debit']]

def search_person(name_keywords, label):
    mask = debits['narration'].apply(lambda x: any(k in str(x).upper() for k in name_keywords))
    subset = debits[mask]
    total = subset['parsed_amount'].sum()
    print(f"\n{'='*70}")
    print(f"  {label}")
    print(f"  Total: Rs {total:,.2f} ({len(subset)} transactions)")
    print(f"{'='*70}")
    for _, row in subset.iterrows():
        narr = str(row['narration']).replace('\n', ' ')[:65]
        dt = str(row['DATE'])[:10]
        print(f"  {dt} | Rs {row['parsed_amount']:>10,.2f} | {narr}")
    return total

t1 = search_person(['MOHAN PANDURANG', 'MOHAN PANDURA'], 'MOHAN PANDURANG KALBURGI (payments TO Mohan)')
t2 = search_person(['LAXMI MOHAN KAL'], 'LAXMI MOHAN KALBURGI (payments TO Laxmi)')
t3 = search_person(['PANDURANG KRISH'], 'PANDURANG KRISHNA (payments TO Pandurang Krishna)')
t4 = search_person(['UPAMANYU', 'UPAMNYU'], 'UPAMANYU KALBURGI (payments TO Upamanyu)')

print(f"\n{'='*70}")
print(f"  SUMMARY - TOTAL EXPENSES BY PERSON")
print(f"{'='*70}")
print(f"  Mohan Pandurang Kalburgi:   Rs {t1:>12,.2f}")
print(f"  Laxmi Mohan Kalburgi:       Rs {t2:>12,.2f}")
print(f"  Pandurang Krishna:          Rs {t3:>12,.2f}")
print(f"  Upamanyu Kalburgi:          Rs {t4:>12,.2f}")
print(f"  {'─'*50}")
print(f"  GRAND TOTAL (all 4):        Rs {t1+t2+t3+t4:>12,.2f}")

# Investment received
print(f"\n\n{'='*70}")
print(f"  INVESTMENT RECEIVED (Credits)")
print(f"{'='*70}")
credits = df[~df['is_debit']]
inv_keywords = ['INVESTMENT', 'INVEST']
inv_mask = credits['INCOME_DETAILS'].apply(lambda x: any(k in str(x).upper() for k in inv_keywords)) | \
           credits['narration'].apply(lambda x: 'INVEST' in str(x).upper())
inv_rows = credits[inv_mask]
inv_total = inv_rows['parsed_amount'].sum()
for _, row in inv_rows.iterrows():
    narr = str(row['narration']).replace('\n', ' ')[:55]
    dt = str(row['DATE'])[:10]
    inc = str(row['INCOME_DETAILS']) if pd.notna(row['INCOME_DETAILS']) else ''
    print(f"  {dt} | Rs {row['parsed_amount']:>10,.2f} | {inc:30s} | {narr}")
print(f"  {'─'*50}")
print(f"  TOTAL INVESTMENT RECEIVED:  Rs {inv_total:>12,.2f}")
