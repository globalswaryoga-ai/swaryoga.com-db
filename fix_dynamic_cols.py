import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix dynamicColumns to always exclude standard keys, regardless of mapping
old_dynamic = """
    const filteredKeys = allKeys.filter(k => !hiddenMappedValues.includes(k));
"""

new_dynamic = """
    // Always exclude keys that we already render as standard columns, regardless of mapping
    const exactStandardKeys = ['NAME', 'WHATSAPP', 'MOBILE', 'PHONE', 'EMAIL'];
    const filteredKeys = allKeys.filter(k => 
      !hiddenMappedValues.includes(k) && 
      !exactStandardKeys.includes(k.toUpperCase())
    );
"""

content = content.replace(old_dynamic.strip(), new_dynamic.strip())

with open(file_path, 'w') as f:
    f.write(content)
print("done")
