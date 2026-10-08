import os

langs = ['english', 'hindi', 'marathi', 'kannada']
base_dir = 'app/admin/crm/new-registration'

for lang in langs:
    path = os.path.join(base_dir, lang, 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()

    # Replace the undefined variable with the correct one
    content = content.replace("masterViewLanguageFilteredLeads", "displayLeads")

    with open(path, 'w') as f:
        f.write(content)

print("done")
