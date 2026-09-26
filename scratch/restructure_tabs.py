import re

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()
    lines = content.split('\n')

# Find key line numbers
forms_tab_start = None  # line with: {activeTab === 'forms' && (
forms_tab_wrapper_open = None  # line with the outer div
form_setup_start = None  # line with: <div className="bg-white rounded-2xl shadow-sm border... overflow-hidden">
form_setup_end = None  # line after Save & Map Data button area -> {/* Render Fetched Leads... */}
forms_tab_end = None  # line 2195 approx

for i, line in enumerate(lines):
    stripped = line.strip()
    if "{/* TAB 2: Workshop Forms */}" in stripped and forms_tab_start is None:
        forms_tab_start = i
    if '{activeTab === \'forms\' && (' in stripped and forms_tab_start is not None and forms_tab_wrapper_open is None:
        forms_tab_wrapper_open = i
    if '{/* Render Fetched Leads Inline in Forms Tab */}' in stripped:
        form_setup_end = i
    if '{/* TAB 3: Leads Management */}' in stripped:
        forms_tab_end = i

print(f"forms_tab_start: {forms_tab_start+1}")
print(f"forms_tab_wrapper_open: {forms_tab_wrapper_open+1}")
print(f"form_setup_end (Render Fetched Leads): {form_setup_end+1}")
print(f"forms_tab_end (TAB 3): {forms_tab_end+1}")

# Print the lines so we can see context  
print("\nLines around form_setup_end:")
for i in range(form_setup_end-3, form_setup_end+3):
    print(f"  {i+1}: {lines[i]}")
