import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

bad_str = """  useEffect(() => {
    if (!isLoaded) return;
    
    
    const savedFormSource = localStorage.getItem('crm_form_source' + langSuffix) || localStorage.getItem('crm_form_source');"""

good_str = """  useEffect(() => {
    if (!isLoaded) return;
    
    const langSuffix = `_${selectedDashboardLang}`;
    const savedFormSource = localStorage.getItem('crm_form_source' + langSuffix) || localStorage.getItem('crm_form_source');"""

content = content.replace(bad_str, good_str)

with open(file_path, 'w') as f:
    f.write(content)
print("done")
