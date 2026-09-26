import re

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Find the Form Setup Block inside activeTab === "forms"
# It starts with: <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 w-full">
# And ends before: <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
forms_tab_start = content.find('          {activeTab === "forms" && (')
if forms_tab_start == -1:
    print("Could not find forms tab")
    exit(1)

form_block_start = content.find('<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 w-full">', forms_tab_start)
form_block_end = content.find('                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">', form_block_start)

if form_block_start == -1 or form_block_end == -1:
    print("Could not find form block boundaries")
    exit(1)

form_block = content[form_block_start:form_block_end]

# Modify the form block to save for the language
form_block = form_block.replace(
    'if (w.id === selectedWorkshop?.id) {',
    'if (w.language === selectedDashboardLang) {'
)

form_block = form_block.replace(
    'if (selectedWorkshop) {',
    'if (selectedWorkshop && (selectedWorkshop.language === selectedDashboardLang || (!selectedWorkshop.language && selectedDashboardLang === "English"))) {'
)

# 2. Insert it into the all_data tab
all_data_start = content.find('          {activeTab === "all_data" && (')
if all_data_start == -1:
    print("Could not find all_data tab")
    exit(1)
    
insert_pos = content.find('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">', all_data_start)
if insert_pos == -1:
    print("Could not find insertion point in all_data tab")
    exit(1)

content = content[:insert_pos] + form_block + '\n                ' + content[insert_pos:]

# 3. Add the useEffect
effect = """
  // Sync form setup when switching languages in the master dashboard
  useEffect(() => {
    if (activeTab === "all_data" && workshops.length > 0) {
      const firstBatchInLang = workshops.find(
        (w) => w.language === selectedDashboardLang || (!w.language && selectedDashboardLang === "English")
      );
      if (firstBatchInLang?.formId) {
        setLinkedFormId(firstBatchInLang.formId);
        setSelectedFormId(firstBatchInLang.formId);
        if (firstBatchInLang.formId.includes('google.com')) {
          setGoogleFormUrl(firstBatchInLang.formId);
          setFormSource('google');
        }
        if (firstBatchInLang.googleFormMapping) {
          setFormMappings(firstBatchInLang.googleFormMapping);
        }
      } else {
        setLinkedFormId("");
        setSelectedFormId("");
        setGoogleFormUrl("");
      }
    }
  }, [selectedDashboardLang, activeTab, workshops]);
"""

content = content.replace(
    '      setRegisteredAiInsights(loadObj("crm_registered_insights"));\n    } else {\n      setLinkedFormId("");\n      setSelectedFormId("");\n      setLeadsData([]);\n\n      // Clear states when no batch is selected\n      setCrmLeadIds([]);\n      setRegisteredLeadIds([]);\n      setPendingLeadIds([]);\n      setPending2LeadIds([]);\n      setStudentKotaLeadIds([]);\n    }\n  }, [selectedWorkshop]);',
    '      setRegisteredAiInsights(loadObj("crm_registered_insights"));\n    } else {\n      setLinkedFormId("");\n      setSelectedFormId("");\n      setLeadsData([]);\n\n      // Clear states when no batch is selected\n      setCrmLeadIds([]);\n      setRegisteredLeadIds([]);\n      setPendingLeadIds([]);\n      setPending2LeadIds([]);\n      setStudentKotaLeadIds([]);\n    }\n  }, [selectedWorkshop]);\n\n' + effect
)

with open(filepath, 'w') as f:
    f.write(content)

print("Successfully restored Form block to dashboard!")
