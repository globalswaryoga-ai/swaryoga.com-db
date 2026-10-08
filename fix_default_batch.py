import os

langs = [
    ('english', 'English'),
    ('hindi', 'Hindi'),
    ('marathi', 'Marathi'),
    ('kannada', 'Kannada')
]

base_dir = 'app/admin/crm/new-registration'

for lang, lang_name in langs:
    path = os.path.join(base_dir, lang, 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()

    # Replace English swar yoga with the correct language
    content = content.replace("id: 'w_english_swar_yoga'", f"id: 'w_{lang}_swar_yoga'")
    content = content.replace("name: 'English swar yoga'", f"name: '{lang_name} swar yoga'")
    
    # Be careful not to replace all 'English' strings indiscriminately, just the language field in defaultBatch
    content = content.replace("language: 'English'\n    };", f"language: '{lang_name}'\n    }};")

    with open(path, 'w') as f:
        f.write(content)

print("done")
