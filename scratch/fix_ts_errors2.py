import re

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

lines = content.split('\n')

for i, line in enumerate(lines):
    # Fix the count || null logic
    if 'setWorkshopStudents(count || ' in line and 'null' in line:
        lines[i] = line.replace('count || null', 'count || 0')
    elif 'setWorkshopLeads(count || ' in line and 'null' in line:
        lines[i] = line.replace('count || null', 'count || 0')
    elif 'setWorkshopPending(count || ' in line and 'null' in line:
        lines[i] = line.replace('count || null', 'count || 0')
    elif 'setWorkshopPending2(count || ' in line and 'null' in line:
        lines[i] = line.replace('count || null', 'count || 0')
    elif 'setWorkshopStudentKota(count || ' in line and 'null' in line:
        lines[i] = line.replace('count || null', 'count || 0')

    # Fix the comparison issue
    if 'lead.status === "pending2"' in line:
        lines[i] = line.replace('lead.status === "pending2"', '(lead.status as string) === "pending2"')
        
    if 'lead.status === "registered"' in line:
        lines[i] = line.replace('lead.status === "registered"', '(lead.status as string) === "registered"')

with open(filepath, 'w') as f:
    f.write('\n'.join(lines))
