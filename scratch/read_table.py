with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    lines = f.readlines()
start = -1
end = -1
for i, line in enumerate(lines):
    if 'tab2Leads.length > 0' in line:
        start = i - 15
    if 'tab2Leads.map((lead, i)' in line:
        end = i + 40
        break
print("".join(lines[start:end]))
