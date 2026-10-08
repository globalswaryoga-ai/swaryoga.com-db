import os

langs = ['english', 'hindi', 'marathi', 'kannada']
base_dir = 'app/admin/crm/new-registration'

for lang in langs:
    path = os.path.join(base_dir, lang, 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()

    # The issue: the files share localStorage keys like 'crm_selected_workshop', 'crm_google_form_url', etc.
    # We will suffix all these keys to be completely isolated, except for crm_token, adminToken, crm_workshops (maybe? no, let's isolate workshops too so they don't leak).
    # Wait, crm_token is used for authentication.
    
    # Let's replace 'crm_' with 'crm_{lang}_'
    content = content.replace("'crm_", f"'crm_{lang}_")
    
    # Fix back the ones that must be shared globally across the entire CRM
    content = content.replace(f"'crm_{lang}_token'", "'crm_token'")
    
    # Also, we should remove the logic that falls back to the old un-suffixed keys, to prevent old English data from leaking in.
    # Replace: `|| localStorage.getItem('crm_form_source')`
    # Replace: `|| localStorage.getItem('crm_selected_form_id')`
    
    import re
    # Remove fallback reads from old keys
    content = re.sub(r"\|\|\s*localStorage\.getItem\('crm_(?:[a-z_]+)'\)", "", content)

    # Let's also fix `langSuffix`. It was `_${selectedDashboardLang}` (e.g. `_Marathi Workshop`).
    # We don't need `langSuffix` anymore since we are prefixing everything with `crm_{lang}_`!
    # But it's safer to just leave `langSuffix` alone since it appends at the end, making the key `crm_marathi_google_form_url_Marathi Workshop`, which is highly unique and perfectly isolated.

    with open(path, 'w') as f:
        f.write(content)

print("done")
