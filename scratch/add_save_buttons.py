with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

import re

# 1. Inject saveWorkshopSettings function
inject_point = "  const handleDetailChange ="
save_func = """  const saveWorkshopSettings = async () => {
    if (!selectedWorkshop) return;
    try {
      const res = await fetch('/api/admin/crm/workshop-management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cohortId: selectedWorkshop.id,
          googleFormLink: googleFormUrl,
          metadata: {
            ...selectedWorkshop.metadata,
            googleFormMapping: fieldMapping,
            crmFields: crmFields,
            formFilterKeyword: selectedWorkshop.formFilterKeyword || ''
          }
        })
      });
      if (res.ok) {
        toast.success('Workshop settings saved successfully!');
      } else {
        toast.error('Failed to save workshop settings.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error saving settings.');
    }
  };

  const handleDetailChange ="""

content = content.replace(inject_point, save_func)


# 2. Update the dummy Save button in "Workshop Details"
old_save_details = """onClick={() => toast.success('Workshop details saved successfully!')}"""
new_save_details = """onClick={saveWorkshopSettings}"""
content = content.replace(old_save_details, new_save_details)


# 3. Add Save button to "Map Google Form Fields to CRM" section
old_mapping_header = """                                  <h4 className="font-bold text-slate-800 text-sm">Map Google Form Fields to CRM</h4>
                                  <button onClick={() => {"""

new_mapping_header = """                                  <h4 className="font-bold text-slate-800 text-sm">Map Google Form Fields to CRM</h4>
                                  <div className="flex gap-2">
                                    <button onClick={saveWorkshopSettings} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1 rounded font-bold transition-colors">
                                      Save Mapping
                                    </button>
                                    <button onClick={() => {"""

content = content.replace(old_mapping_header, new_mapping_header)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
