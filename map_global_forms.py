import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add state variable
state_str = "const [googleAuthError, setGoogleAuthError] = useState('');"
new_state = state_str + "\n  const [globalLangLinks, setGlobalLangLinks] = useState<any>(null);"
content = content.replace(state_str, new_state)

# 2. Fetch it in loadFromApi
load_api_str = "if (data.crm_google_forms_list) setGoogleFormsList(JSON.parse(data.crm_google_forms_list));"
fetch_config_code = """
              if (data.crm_google_forms_list) setGoogleFormsList(JSON.parse(data.crm_google_forms_list));
              
              // Fetch global lang links mapped in form-questions
              try {
                const cfgRes = await fetch('/api/admin/crm/google-form-config');
                if (cfgRes.ok) {
                  const cfgData = await cfgRes.json();
                  if (cfgData.config) setGlobalLangLinks(cfgData.config);
                }
              } catch (e) {}
"""
content = content.replace(load_api_str, fetch_config_code.strip())

# 3. Update the fallback logic for googleFormUrl
old_fallback = """
    const savedGoogleFormUrl = localStorage.getItem('crm_google_form_url' + langSuffix) || localStorage.getItem('crm_google_form_url');
    if (savedGoogleFormUrl) {
      setGoogleFormUrl(savedGoogleFormUrl);
      setLinkedFormId(savedGoogleFormUrl);
    } else {
      setGoogleFormUrl('https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit');
      setLinkedFormId('https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit');
    }
"""

new_fallback = """
    const savedGoogleFormUrl = localStorage.getItem('crm_google_form_url' + langSuffix);
    if (savedGoogleFormUrl) {
      setGoogleFormUrl(savedGoogleFormUrl);
      setLinkedFormId(savedGoogleFormUrl);
    } else {
      const isOffer = selectedDashboardLang.includes('Offer');
      const baseLang = selectedDashboardLang.replace(' Workshop', '').replace(' Offer', '').trim();
      const mappedUrl = globalLangLinks?.[baseLang]?.[isOffer ? 'offer' : 'workshop'];
      
      const defaultUrl = mappedUrl || localStorage.getItem('crm_google_form_url') || 'https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit';
      setGoogleFormUrl(defaultUrl);
      setLinkedFormId(defaultUrl);
    }
"""

content = content.replace(old_fallback.strip(), new_fallback.strip())

# Also need to add globalLangLinks to the dependency array of the useEffect that contains this fallback
deps_str = "}, [selectedDashboardLang, isLoaded]);"
new_deps_str = "}, [selectedDashboardLang, isLoaded, globalLangLinks]);"
content = content.replace(deps_str, new_deps_str)

with open(file_path, 'w') as f:
    f.write(content)
print("done")
