import sys

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'

with open(filepath, 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<Users size={18} /> Save & Map Data' in line:
        print(f"Line {i}: {line.strip()}")
        for j in range(i+1, i+6):
            print(f"Line {j}: {lines[j].strip()}")
        break
