#!/usr/bin/env python3
"""
Replace individual receipt entries with clean month-wise Swar Yoga receipts.
Creates one Receipt entry per month under "Swar Yoga" party name.
"""
from pymongo import MongoClient
from collections import defaultdict
from datetime import datetime
import os

# Read MongoDB URI
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env.local')
MONGO_URI = None
with open(env_path) as f:
    for line in f:
        if line.startswith('MONGODB_URI_MAIN='):
            MONGO_URI = line.split('=', 1)[1].strip().strip('"').strip("'")
            break

if not MONGO_URI:
    print("MONGODB_URI_MAIN not found")
    exit(1)

FY = "2024-25"
client = MongoClient(MONGO_URI)
db = client['swaryogaDB']
col = db['tally_manual_vouchers']

# ── Step 1: Analyze current receipts ──
receipts = list(col.find({'financialYear': FY, 'voucherType': 'Receipt'}).sort('date', 1))
print(f"Current receipts for FY {FY}: {len(receipts)}")

# Group by month
monthly = defaultdict(lambda: {'count': 0, 'total': 0.0, 'parties': []})
for r in receipts:
    month = r['date'][:7]  # YYYY-MM
    monthly[month]['count'] += 1
    monthly[month]['total'] += r['amount']
    monthly[month]['parties'].append(r['partyName'])

print("\nCurrent month-wise receipts:")
grand_total = 0
for m in sorted(monthly.keys()):
    d = monthly[m]
    grand_total += d['total']
    print(f"  {m}: {d['count']:3d} entries, Rs {d['total']:>10,.2f}")
print(f"  {'TOTAL':>7s}: {sum(d['count'] for d in monthly.values()):3d} entries, Rs {grand_total:>10,.2f}")

# ── Step 2: Delete old receipts ──
print(f"\nDeleting {len(receipts)} individual receipt entries...")
del_result = col.delete_many({'financialYear': FY, 'voucherType': 'Receipt'})
print(f"  Deleted: {del_result.deleted_count}")

# ── Step 3: Create month-wise Swar Yoga receipts ──
MONTH_NAMES = {
    '04': 'April', '05': 'May', '06': 'June', '07': 'July',
    '08': 'August', '09': 'September', '10': 'October', '11': 'November',
    '12': 'December', '01': 'January', '02': 'February', '03': 'March',
}

new_receipts = []
rcp_num = 0

for m in sorted(monthly.keys()):
    d = monthly[m]
    year = m[:4]
    month_num = m[5:7]
    month_name = MONTH_NAMES.get(month_num, month_num)
    
    # Last day of month for the date
    if month_num in ['04', '06', '09', '11']:
        last_day = 30
    elif month_num == '02':
        last_day = 29 if int(year) % 4 == 0 else 28
    else:
        last_day = 31
    
    rcp_num += 1
    
    # Unique parties for narration
    unique_parties = list(set(d['parties']))
    party_summary = f"{d['count']} transactions"
    if len(unique_parties) <= 5:
        party_summary += f" ({', '.join(unique_parties[:5])})"
    else:
        party_summary += f" ({', '.join(unique_parties[:3])}... +{len(unique_parties)-3} more)"
    
    doc = {
        'voucherType': 'Receipt',
        'voucherNumber': f"RCP-{rcp_num:04d}",
        'date': f"{year}-{month_num}-{last_day:02d}",
        'partyName': 'Swar Yoga',
        'ledgerName': f'Swar Yoga - {month_name} {year}',
        'amount': round(d['total'], 2),
        'narration': f"[Cr] Swar Yoga Income - {month_name} {year} | {party_summary}",
        'paymentMode': 'Bank',
        'financialYear': FY,
        'createdBy': 'system-import',
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    new_receipts.append(doc)

# ── Step 4: Insert new month-wise receipts ──
print(f"\nInserting {len(new_receipts)} month-wise Swar Yoga receipts:")
for r in new_receipts:
    print(f"  {r['date']} | {r['voucherNumber']} | Rs {r['amount']:>10,.2f} | {r['ledgerName']}")

if new_receipts:
    result = col.insert_many(new_receipts)
    print(f"\n✅ Inserted {len(result.inserted_ids)} month-wise receipt entries")

# ── Step 5: Verify ──
total_rcp = col.count_documents({'financialYear': FY, 'voucherType': 'Receipt'})
all_rcp = list(col.find({'financialYear': FY, 'voucherType': 'Receipt'}))
total_amt = sum(r['amount'] for r in all_rcp)
print(f"\nVerification:")
print(f"  Total Receipt entries: {total_rcp}")
print(f"  Total Receipt amount: Rs {total_amt:,.2f}")
print(f"  All under party: {set(r['partyName'] for r in all_rcp)}")

# Overall collection stats
total_all = col.count_documents({'financialYear': FY})
print(f"\n  Total FY {FY} entries (all types): {total_all}")

client.close()
print("\n✅ Done! Check CRM Tally → Receipts for month-wise Swar Yoga entries.")
