import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace setAndCollect('crm_selected_workshop', safeStringify(selectedWorkshop));
# with setAndCollect('crm_selected_workshop' + langSuffix, safeStringify(selectedWorkshop));

# First find where langSuffix is defined and move it UP
lang_suffix_def = "const langSuffix = `_${selectedDashboardLang}`;"
content = content.replace(lang_suffix_def, "")
content = content.replace("const setAndCollect = (k: string, v: string) => {", lang_suffix_def + "\n      const setAndCollect = (k: string, v: string) => {")

# Now apply langSuffix to all core keys
content = content.replace("setAndCollect('crm_workshops', safeStringify(workshops));", "setAndCollect('crm_workshops' + langSuffix, safeStringify(workshops));")
content = content.replace("setAndCollect('crm_selected_workshop', safeStringify(selectedWorkshop));", "setAndCollect('crm_selected_workshop' + langSuffix, safeStringify(selectedWorkshop));")

with open(file_path, 'w') as f:
    f.write(content)
print("done")
