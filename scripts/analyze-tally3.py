import pandas as pd
import re

file_path = "/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111.xlsx"
df = pd.read_excel(file_path, sheet_name='Sheet1', header=0)
df.columns = ['DATE', 'MONTH', 'narration', 'chq', 'amount', 'EXP', 'INCOME_DETAILS', 'balance']

print("=== ALL UNIQUE MONTH VALUES ===")
print(df['MONTH'].value_counts(dropna=False).to_string())

print("\n=== ROWS WITH NaN MONTH ===")
nan_month = df[df['MONTH'].isna()]
print(f"Count: {len(nan_month)}")
for _, row in nan_month.head(5).iterrows():
    print(f"  {str(row['DATE'])[:10]} | {str(row['narration'])[:50]} | {row['amount']}")

print("\n=== DATE RANGE ===")
dates = pd.to_datetime(df['DATE'], errors='coerce')
print(f"Min date: {dates.min()}")
print(f"Max date: {dates.max()}")

print("\n=== ROWS PER ACTUAL MONTH (from DATE column) ===")
df['actual_month'] = dates.dt.to_period('M')
print(df['actual_month'].value_counts(dropna=False).sort_index().to_string())

print("\n=== TOTAL ROW COUNT ===")
print(f"Total rows: {len(df)}")
print(f"Rows with valid date: {dates.notna().sum()}")
print(f"Rows with valid month label: {df['MONTH'].notna().sum()}")

# Check Table 1 for missing months
print("\n\n=== TABLE 1 (raw bank statement) - Row Count ===")
df1 = pd.read_excel(file_path, sheet_name='Table 1', header=None)
print(f"Table 1 rows: {len(df1)}")
print("First few: ", df1[0].head(3).tolist())
