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
    if not num:
        return 0.0
    return float(num)

def is_cr(val):
    return '(Cr)' in str(val)

df['parsed_amount'] = df['amount'].apply(parse_amount)
df['is_credit'] = df['amount'].apply(is_cr)

# Normalize month names to ordering
month_map = {
    'APRIL': 1, 'MAY': 2, 'JUNE': 3, 'JULY': 4, 'AUG': 5, 'SEP': 6,
    'OCT': 7, 'NOV': 8, 'DEC': 9, 'JAN': 10, 'FEB': 11, 'MARCH': 12
}
month_names = {v: k for k, v in month_map.items()}
df['month_order'] = df['MONTH'].map(month_map)

print("=" * 80)
print("FULL YEAR SUMMARY BY MONTH")
print("=" * 80)

for mo in range(1, 13):
    mname = month_names[mo]
    m_df = df[df['month_order'] == mo]
    if len(m_df) == 0:
        print(f"{mname:8s}: NO DATA")
        continue
    classified = (m_df['EXP'].notna() | m_df['INCOME_DETAILS'].notna()).sum()
    unclassified = (m_df['EXP'].isna() & m_df['INCOME_DETAILS'].isna()).sum()
    income_total = m_df[m_df['INCOME_DETAILS'].notna()]['parsed_amount'].sum()
    expense_total = m_df[m_df['EXP'].notna()]['parsed_amount'].sum()
    print(f"{mname:8s}: {len(m_df):3d} rows | {classified:3d} classified, {unclassified:3d} TODO | Income: {income_total:>10,.0f} | Expense: {expense_total:>10,.0f}")

# Grand totals
print(f"\n{'=' * 80}")
print("EXPENSE CATEGORIES (standardized view)")
print("=" * 80)
exp_cats = df['EXP'].dropna().unique()
for cat in sorted(exp_cats, key=str):
    subset = df[df['EXP'] == cat]
    total = subset['parsed_amount'].sum()
    count = len(subset)
    print(f"  {str(cat):40s} | {count:3d} entries | Rs {total:>12,.0f}")
exp_total = df[df['EXP'].notna()]['parsed_amount'].sum()
print(f"  {'TOTAL CLASSIFIED EXPENSES':40s} |     total | Rs {exp_total:>12,.0f}")

print(f"\n{'=' * 80}")
print("INCOME CATEGORIES (standardized view)")
print("=" * 80)
inc_cats = df['INCOME_DETAILS'].dropna().unique()
for cat in sorted(inc_cats, key=str):
    subset = df[df['INCOME_DETAILS'] == cat]
    total = subset['parsed_amount'].sum()
    count = len(subset)
    print(f"  {str(cat):40s} | {count:3d} entries | Rs {total:>12,.0f}")
inc_total = df[df['INCOME_DETAILS'].notna()]['parsed_amount'].sum()
print(f"  {'TOTAL CLASSIFIED INCOME':40s} |     total | Rs {inc_total:>12,.0f}")

# What the unclassified look like
print(f"\n{'=' * 80}")
print("UNCLASSIFIED ANALYSIS - Narration keywords for auto-categorization")
print("=" * 80)
unclass = df[df['EXP'].isna() & df['INCOME_DETAILS'].isna()]
print(f"Total unclassified: {len(unclass)}")
print(f"  Credits (income): {unclass[unclass['is_credit']].shape[0]}")
print(f"  Debits (expense): {unclass[~unclass['is_credit']].shape[0]}")

# Pattern analysis for unclassified debits
debits = unclass[~unclass['is_credit']]
print(f"\n--- Debit patterns ({len(debits)} rows) ---")
patterns = {
    'FACEBOOK/META': 0, 'MOHAN PANDURANG/LAXMI MOHAN': 0, 'UPAMANYU': 0,
    'RENT': 0, 'MSEDCL/LIGHT': 0, 'DIESEL/DISEL': 0, 'ZOMATO/FOOD': 0,
    'GOOGLE ADS/PLAY': 0, 'MOBILE/JIO/RECHARGE': 0, 'TRAVELLING': 0,
    'MACBOOK/MAC': 0, 'ONE PLUS/ONEPLUS': 0, 'EMI': 0,
    'BELOW 500': 0, 'OTHER': 0
}
for _, row in debits.iterrows():
    narr = str(row['narration']).upper()
    amt = row['parsed_amount']
    if 'FACEBOOK' in narr or 'META' in narr or 'FACEBOOKADSM' in narr:
        patterns['FACEBOOK/META'] += amt
    elif 'MSEDCL' in narr or 'LIGHT' in narr:
        patterns['MSEDCL/LIGHT'] += amt
    elif 'DISEL' in narr or 'DIESEL' in narr or 'PETROL' in narr:
        patterns['DIESEL/DISEL'] += amt
    elif 'MACBOOK' in narr or 'MAC BOOK' in narr or ('LAXMI MOHAN' in narr and amt >= 10000):
        patterns['MACBOOK/MAC'] += amt
    elif 'ONE PLUS' in narr or 'ONEPLUS' in narr:
        patterns['ONE PLUS/ONEPLUS'] += amt
    elif 'UPAMANYU' in narr or 'UPAMNYU' in narr:
        patterns['UPAMANYU'] += amt
    elif 'RENT' in narr:
        patterns['RENT'] += amt
    elif 'ZOMATO' in narr or 'FOOD' in narr or 'DOMINOS' in narr or 'HOTEL' in narr:
        patterns['ZOMATO/FOOD'] += amt
    elif 'GOOGLE' in narr:
        patterns['GOOGLE ADS/PLAY'] += amt
    elif 'JIO' in narr or 'RECHARGE' in narr:
        patterns['MOBILE/JIO/RECHARGE'] += amt
    elif 'TRAVEL' in narr:
        patterns['TRAVELLING'] += amt
    elif ('MOHAN PANDURANG' in narr or 'LAXMI MOHAN' in narr) and 'MACBOOK' not in narr:
        patterns['MOHAN PANDURANG/LAXMI MOHAN'] += amt
    elif 'EMI' in narr:
        patterns['EMI'] += amt
    elif amt < 500:
        patterns['BELOW 500'] += amt
    else:
        patterns['OTHER'] += amt
        
for p, amt in sorted(patterns.items(), key=lambda x: -x[1]):
    if amt > 0:
        print(f"  {p:35s} Rs {amt:>12,.0f}")

# Credits (income) in unclassified
credits = unclass[unclass['is_credit']]
print(f"\n--- Credit patterns ({len(credits)} rows - potential income) ---")
for _, row in credits.iterrows():
    narr = str(row['narration']).replace('\n', ' ')[:60]
    print(f"  {str(row['DATE'])[:10]} | {narr:60s} | Rs {row['parsed_amount']:>10,.0f}")
