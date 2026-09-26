import sys

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'

with open(filepath, 'r') as f:
    lines = f.readlines()

# 1. Find the Form Setup block in `forms` tab (lines to copy)
start_form_idx = -1
end_form_idx = -1

for i, line in enumerate(lines):
    if '{/* TAB 2: Workshop Forms */}' in line:
        # The form setup is right after this
        for j in range(i, i+1000):
            if 'className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 w-full"' in lines[j]:
                start_form_idx = j
                break
        
        # Now find the end of the form setup block (the Save & Map Data button div)
        for j in range(start_form_idx, start_form_idx+1000):
            if '<Users size={18} /> Save & Map Data' in lines[j]:
                end_form_idx = j + 2  # The closing </div> and </div>
                break
        break

print(f"Form block starts at {start_form_idx}, ends at {end_form_idx}")

# 2. Extract the form block
form_block = lines[start_form_idx:end_form_idx+1]

# 3. We need to replace the Save logic in this copied block to target `selectedDashboardLang`
# Let's find the save logic inside the form_block
for i, line in enumerate(form_block):
    if 'if (w.id === selectedWorkshop?.id) {' in line:
        form_block[i] = '                          if (w.language === selectedDashboardLang) {\n'
    if 'if (selectedWorkshop) {' in line:
        form_block[i] = '                        if (\n                          selectedWorkshop &&\n                          (selectedWorkshop.language ===\n                            selectedDashboardLang ||\n                            (!selectedWorkshop.language &&\n                              selectedDashboardLang === "English"))\n                        ) {\n'

# 4. Find where to insert it in `all_data` tab
insert_idx = -1
for i, line in enumerate(lines):
    if '{/* TAB 0: Leads All Data (Master Dashboard) */}' in line:
        for j in range(i, i+1000):
            if 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"' in lines[j]:
                insert_idx = j
                break
        break

print(f"Insert into all_data at {insert_idx}")

# 5. Insert and save
new_lines = lines[:insert_idx] + form_block + lines[insert_idx:]

with open(filepath, 'w') as f:
    f.writelines(new_lines)
print("File updated!")
