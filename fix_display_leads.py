import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix displayLeads to only filter by keyword if formSource is 'google' or if lead._rawRecord exists
old_display_leads = """
    if (selectedWorkshop.formFilterKeyword) {
      const keywords = String(selectedWorkshop.formFilterKeyword).toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
      const ai7MappedQuestion = selectedWorkshop.metadata?.googleFormMapping?.['AI-7'] || selectedWorkshop.metadata?.googleFormMapping?.['ai7'];
      return (leadsData || []).filter((lead: any) => {
        if (lead._rawRecord && ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
          return keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k));
        }
        return false;
      });
    }
"""

new_display_leads = """
    if (selectedWorkshop.formFilterKeyword && formSource === 'google') {
      const keywords = String(selectedWorkshop.formFilterKeyword).toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
      const ai7MappedQuestion = selectedWorkshop.metadata?.googleFormMapping?.['AI-7'] || selectedWorkshop.metadata?.googleFormMapping?.['ai7'];
      return (leadsData || []).filter((lead: any) => {
        if (lead._rawRecord && ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
          return keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k));
        }
        return false;
      });
    }
"""

content = content.replace(old_display_leads.strip(), new_display_leads.strip())

# Need to add formSource to dependencies of the useMemo
deps_old = "}, [leadsData, selectedDashboardLang, selectedWorkshop]);"
deps_new = "}, [leadsData, selectedDashboardLang, selectedWorkshop, formSource]);"
content = content.replace(deps_old, deps_new)

with open(file_path, 'w') as f:
    f.write(content)
print("done")
