import pandas as pd
import re

file_path = "/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx"
df = pd.read_excel(file_path, sheet_name='Sheet1', header=0)
df.columns = ['DATE', 'MONTH', 'narration', 'chq', 'amount', 'EXP', 'INCOME_DETAILS', 'balance']

# Show ALL unclassified rows grouped by month
neither = df[df['EXP'].isna() & df['INCOME_DETAILS'].isna()]
months_order = ['APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER','JANUARY','FEBRUARY','MARCH']

for month in months_order:
    m_df = neither[neither['MONTH'] == month]
    if len(m_df) == 0:
        continue
    print(f"\n{'='*80}")
    print(f"  UNCLASSIFIED: {month} ({len(m_df)} rows)")
    print(f"{'='*80}")
    for idx, row in m_df.iterrows():
        narr = str(row['narration']).replace('\n', ' ')[:65]
        amt = str(row['amount'])
        print(f"  Row {idx:3d} | {str(row['DATE'])[:10]} | {narr:65s} | {amt}")

# Also check: are there months missing entirely?
print(f"\n{'='*80}")
print("MONTHS IN DATA:")
for m in months_order:
    count = len(df[df['MONTH'] == m])
    unclass = len(neither[neither['MONTH'] == m])
    if count > 0:
        print(f"  {m:12s}: {count:3d} total rows, {unclass:3d} unclassified")
    else:
        print(f"  {m:12s}: NO DATA")
