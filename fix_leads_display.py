import re

file_path = 'app/admin/crm/new-registration/page.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace masterViewLanguageFilteredLeads definition
new_display_leads_code = """
  const displayLeads = useMemo(() => {
    if (!selectedWorkshop) {
      const currentBaseLang = getBaseLanguage(selectedDashboardLang);
      return (leadsData || []).filter(l => {
        if (!l) return false;
        const leadLang = l.language || l.workshopName || l.formName;
        if (!leadLang) return true;
        return getBaseLanguage(leadLang) === currentBaseLang;
      });
    }

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

    return leadsData || [];
  }, [leadsData, selectedDashboardLang, selectedWorkshop]);
"""

content = re.sub(
    r'const masterViewLanguageFilteredLeads = useMemo\(\(\) => \{.*?\},\s*\[leadsData,\s*selectedDashboardLang\]\);',
    new_display_leads_code.strip(),
    content,
    flags=re.DOTALL
)

# Replace the getDynamicBatchLeads usage of masterViewLanguageFilteredLeads
content = content.replace('masterViewLanguageFilteredLeads || []', 'leadsData || []')

# Update the prop passed to LeadsTable
content = content.replace(
    'leadsData={masterViewLanguageFilteredLeads.length > 0 ? masterViewLanguageFilteredLeads : leadsData}',
    'leadsData={displayLeads}'
)

with open(file_path, 'w') as f:
    f.write(content)
print("done")
