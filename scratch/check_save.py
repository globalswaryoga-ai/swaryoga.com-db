filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const updatedWorkshops = workshops.map((w) => {' in line:
        for j in range(i, i+30):
            print(f"{j}: {lines[j].strip()}")
        break
