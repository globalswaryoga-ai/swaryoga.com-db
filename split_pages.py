import os

base_dir = 'app/admin/crm/new-registration'
languages = [
    ('english', 'English'),
    ('hindi', 'Hindi'),
    ('marathi', 'Marathi'),
    ('kannada', 'Kannada')
]

with open(os.path.join(base_dir, 'page.tsx'), 'r') as f:
    content = f.read()

# Fix imports
content = content.replace("from './_WorkshopFormTab'", "from '../_WorkshopFormTab'")
content = content.replace("from './_LeadsManagementTab'", "from '../_LeadsManagementTab'")
content = content.replace("from './_WhatsAppMessengerTab'", "from '../_WhatsAppMessengerTab'")

# Fix tab navigation logic in UI
# Old: 
# onClick={() => {
#   setSelectedDashboardLang(lang);
#   const masterWorkshop = workshops.find((w: any) => matchesLanguage(w, lang));
#   setSelectedWorkshop(masterWorkshop || null);
# }}
# New: onClick={() => router.push(`/admin/crm/new-registration/${lang.split(' ')[0].toLowerCase()}`)}

import re
old_click_logic = r"""onClick=\{\(\) => \{\s*setSelectedDashboardLang\(lang\);\s*const masterWorkshop = workshops\.find\(\(w: any\) => matchesLanguage\(w, lang\)\);\s*setSelectedWorkshop\(masterWorkshop \|\| null\);\s*\}\}"""
new_click_logic = "onClick={() => router.push(`/admin/crm/new-registration/${lang.split(' ')[0].toLowerCase()}`)}"
content = re.sub(old_click_logic, new_click_logic, content)

for route, lang_name in languages:
    lang_content = content
    # Hardcode selectedDashboardLang initialization
    # Old: const [selectedDashboardLang, setSelectedDashboardLang] = useState<string>('English Workshop');
    old_state = "const [selectedDashboardLang, setSelectedDashboardLang] = useState<string>('English Workshop');"
    new_state = f"const [selectedDashboardLang, setSelectedDashboardLang] = useState<string>('{lang_name} Workshop');"
    lang_content = lang_content.replace(old_state, new_state)
    
    with open(os.path.join(base_dir, route, 'page.tsx'), 'w') as f:
        f.write(lang_content)

# Now rewrite the main page.tsx to just be a redirect to /english
redirect_content = """
import { redirect } from 'next/navigation';

export default function RedirectToEnglish() {
  redirect('/admin/crm/new-registration/english');
}
"""
with open(os.path.join(base_dir, 'page.tsx'), 'w') as f:
    f.write(redirect_content.strip())

print("done")
