import os

path = 'app/admin/crm/sales/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("value={'0'}={", "value={")
content = content.replace("value={'0'}=\"", "value=\"")

# We still need to fix the original TS errors where number was assigned to value
# error TS2322: Type 'number' is not assignable to type 'string'.
# Let's fix lines around 2039-2041 (probably `<option value={someNumber}>`)
# We will just replace value={index} with value={String(index)} if there are any.
import re
content = re.sub(r'value=\{([0-9]+)\}', r'value={String(\1)}', content)
content = re.sub(r'value=\{i\}', r'value={String(i)}', content)
content = re.sub(r'value=\{y\}', r'value={String(y)}', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed sales page")
