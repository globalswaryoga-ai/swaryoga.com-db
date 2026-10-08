import os

langs = ['english', 'hindi', 'marathi', 'kannada']
base_dir = 'app/admin/crm/new-registration'
english_url = 'https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit'

for lang in langs:
    path = os.path.join(base_dir, lang, 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()

    # If it's english, we can keep the english fallback, but let's just make them all empty to be perfectly consistent and safe
    content = content.replace(f"'{english_url}'", "''")
    content = content.replace(f"|| '{english_url}'", "|| ''")

    # There's a defaultBatch initialized with the english URL
    # id: 'w_english_swar_yoga', name: 'English swar yoga', etc.
    # We should probably clear that out too, or at least replace the URL.
    
    with open(path, 'w') as f:
        f.write(content)

print("done")
