import pandas as pd
import re

file_path = "/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx"
df = pd.read_excel(file_path, sheet_name='Sheet1', header=0)

# Clean column names
df.columns = ['DATE', 'MONTH', 'narration', 'chq', 'amount', 'EXP', 'INCOME_DETAILS', 'balance']

def parse_amount(val):
    if pd.isna(val):
        return 0.0
    s = str(val).strip().replace(',', '')
    is_cr = '(Cr)' in s
    is_dr = '(Dr)' in s
    num = re.sub(r'[^\d.]', '', s)
    if not num:
        return 0.0
    amount = float(num)
    if is_dr:
        return amount  # Dr = outgoing but as positive for expense
    return amount

df['parsed_amount'] = df['amount'].apply(parse_amount)

print("=" * 70)
print("EXPENSE CATEGORIES")
print("=" * 70)
exp_cats = df['EXP'].dropna().unique()
for cat in sorted(exp_cats, key=str):
    subset = df[df['EXP'] == cat]
    total = subset['parsed_amount'].sum()
    count = len(subset)
    print(f"  {cat:40s} | {count:3d} entries | Rs {total:>12,.2f}")

print(f"\n{'=' * 70}")
print("INCOME CATEGORIES")
print("=" * 70)
inc_cats = df['INCOME_DETAILS'].dropna().unique()
for cat in sorted(inc_cats, key=str):
    subset = df[df['INCOME_DETAILS'] == cat]
    total = subset['parsed_amount'].sum()
    count = len(subset)
    print(f"  {cat:40s} | {count:3d} entries | Rs {total:>12,.2f}")

print(f"\n{'=' * 70}")
print("MONTHLY SUMMARY")
print("=" * 70)
months_order = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH']
for month in months_order:
    m_df = df[df['MONTH'] == month]
    if len(m_df) == 0:
        continue
    income_rows = m_df[m_df['INCOME_DETAILS'].notna()]
    expense_rows = m_df[m_df['EXP'].notna()]
    income_total = income_rows['parsed_amount'].sum()
    expense_total = expense_rows['parsed_amount'].sum()
    print(f"  {month:12s} | Income: Rs {income_total:>10,.2f} | Expenses: Rs {expense_total:>10,.2f} | Txns: {len(m_df)}")

print(f"\n{'=' * 70}")
print("TOTALS")
print("=" * 70)
income_rows = df[df['INCOME_DETAILS'].notna()]
expense_rows = df[df['EXP'].notna()]
print(f"  Total Income:   Rs {income_rows['parsed_amount'].sum():>12,.2f}")
print(f"  Total Expenses: Rs {expense_rows['parsed_amount'].sum():>12,.2f}")
print(f"  Net:            Rs {income_rows['parsed_amount'].sum() - expense_rows['parsed_amount'].sum():>12,.2f}")

print(f"\n{'=' * 70}")
print("ROWS WITH NEITHER CATEGORY (unclassified)")
print("=" * 70)
neither = df[df['EXP'].isna() & df['INCOME_DETAILS'].isna()]
print(f"  Count: {len(neither)}")
for _, row in neither.head(15).iterrows():
    print(f"  {str(row['DATE'])[:10]} | {str(row['narration'])[:55]} | {row['amount']}")

print(f"\n{'=' * 70}")
print("BANK STATEMENT SUMMARY (Table 10)")
print("=" * 70)
df2 = pd.read_excel(file_path, sheet_name='Table 10', header=None)
for _, row in df2.iterrows():
    print(f"  {row[0]} {row[1] if pd.notna(row[1]) else ''}")
