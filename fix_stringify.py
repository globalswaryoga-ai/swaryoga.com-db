import re

file_path = 'app/admin/crm/new-registration/page.tsx'

with open(file_path, 'r') as f:
    content = f.read()

safe_stringify_func = """
const safeStringify = (obj: any) => {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Avoid stringifying DOM elements or circular React internal objects
      if (value instanceof Element || value instanceof Event) return undefined;
      return value;
    });
  } catch (e) {
    return "[]";
  }
};
"""

if "const safeStringify" not in content:
    content = content.replace("export default function NewRegistrationPage() {", safe_stringify_func + "\nexport default function NewRegistrationPage() {")

# Replace JSON.stringify with safeStringify
content = content.replace('JSON.stringify', 'safeStringify')
# Fix the safeStringify declaration itself that we just replaced
content = content.replace('const safeStringify = (obj: any) => {\n  try {\n    return safeStringify(obj,', 'const safeStringify = (obj: any) => {\n  try {\n    return JSON.stringify(obj,')

with open(file_path, 'w') as f:
    f.write(content)
print("done")
