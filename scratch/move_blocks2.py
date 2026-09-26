import sys

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'

with open(filepath, 'r') as f:
    lines = f.readlines()

start_idx = 2119
end_form_idx = 2773
end_leads_idx = 3363
forms_tab_idx = 3605

# Verify contents
print("start_idx:", lines[start_idx].strip())
print("end_form_idx:", lines[end_form_idx].strip())
print("end_leads_idx - 1:", lines[end_leads_idx-1].strip())
print("forms_tab_idx + 2:", lines[forms_tab_idx + 2].strip())

# Form setup block to keep and move
form_setup_block = lines[start_idx:end_form_idx]

# We need to find the correct index to insert into the forms tab.
# `forms_tab_idx` is where `{/* TAB 2: Workshop Forms */}` is.
# line[forms_tab_idx + 2] is `<div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">`
insert_idx = forms_tab_idx + 3

# Now let's assemble the new file
# 1. Everything up to start_idx
new_lines = lines[:start_idx]
# 2. Everything from end_leads_idx to insert_idx
new_lines += lines[end_leads_idx:insert_idx]
# 3. The form setup block
new_lines += form_setup_block
# 4. The rest of the file
new_lines += lines[insert_idx:]

with open(filepath, 'w') as f:
    f.writelines(new_lines)
print("File rewritten successfully.")
