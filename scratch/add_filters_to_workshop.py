with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

import re

# 1. Update saveWorkshopSettings to include mainFilter and subFilter
old_save = """            googleFormMapping: fieldMapping,
            crmFields: crmFields,
            formFilterKeyword: selectedWorkshop.formFilterKeyword || ''
          }"""
          
new_save = """            googleFormMapping: fieldMapping,
            crmFields: crmFields,
            formFilterKeyword: selectedWorkshop.formFilterKeyword || '',
            mainFilter: leadsFilter,
            subFilter: leadsSubFilter
          }"""
          
content = content.replace(old_save, new_save)


# 2. When selecting a workshop, load mainFilter and subFilter
old_select = """      if (ws.googleFormMapping) setFieldMapping(ws.googleFormMapping);"""

new_select = """      if (ws.googleFormMapping) setFieldMapping(ws.googleFormMapping);
      if (ws.metadata?.mainFilter) setLeadsFilter(ws.metadata.mainFilter);
      else setLeadsFilter('');
      if (ws.metadata?.subFilter) setLeadsSubFilter(ws.metadata.subFilter);
      else setLeadsSubFilter('');"""

content = content.replace(old_select, new_select)


# 3. Modify AI-4 to use workshop's saved filters OR current state filters
old_ai4_filters = """                if (leadsFilter || leadsSubFilter || leadsSubSubFilter) {
                  leadsToMove = newLeads.filter((lead: any) => {
                    const f1 = !leadsFilter || (() => {"""

new_ai4_filters = """                const currentMain = leadsFilter || ws?.metadata?.mainFilter || '';
                const currentSub = leadsSubFilter || ws?.metadata?.subFilter || '';
                if (currentMain || currentSub || leadsSubSubFilter) {
                  leadsToMove = newLeads.filter((lead: any) => {
                    const f1 = !currentMain || (() => {
                      const vals = [
                        lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                        ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : [])
                      ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                      return vals.some((v: any) => v.includes(currentMain.toLowerCase()));
                    })();
                    const f2 = !currentSub || (() => {
                      const vals = [
                        lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                        ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : [])
                      ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                      return vals.some((v: any) => v.includes(currentSub.toLowerCase()));
                    })();
                    const f3 = !leadsSubSubFilter || (() => {"""

content = content.replace(old_ai4_filters, new_ai4_filters)
content = content.replace("                    return f1 && f2 && f3;", "                    return f1 && f2 && f3;") # just to make sure, actually f3 logic needs fixing if it uses leadsFilter! Wait, it uses leadsSubSubFilter, which is untouched.

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
