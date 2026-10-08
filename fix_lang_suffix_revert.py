import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace("setAndCollect('crm_workshops' + langSuffix, safeStringify(workshops));", "setAndCollect('crm_workshops', safeStringify(workshops));")

with open(file_path, 'w') as f:
    f.write(content)
print("done")
