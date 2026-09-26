import re

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

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
        // Clear if no form is found for this language
        setLinkedFormId("");
        setSelectedFormId("");
        setGoogleFormUrl("");
      }
    }
  }, [selectedDashboardLang, activeTab, workshops]);
"""

# Insert it after the existing useEffect that handles selectedWorkshop
content = content.replace(
    '      setRegisteredAiInsights(loadObj("crm_registered_insights"));\n    } else {\n      setLinkedFormId("");\n      setSelectedFormId("");\n      setLeadsData([]);\n\n      // Clear states when no batch is selected\n      setCrmLeadIds([]);\n      setRegisteredLeadIds([]);\n      setPendingLeadIds([]);\n      setPending2LeadIds([]);\n      setStudentKotaLeadIds([]);\n    }\n  }, [selectedWorkshop]);',
    '      setRegisteredAiInsights(loadObj("crm_registered_insights"));\n    } else {\n      setLinkedFormId("");\n      setSelectedFormId("");\n      setLeadsData([]);\n\n      // Clear states when no batch is selected\n      setCrmLeadIds([]);\n      setRegisteredLeadIds([]);\n      setPendingLeadIds([]);\n      setPending2LeadIds([]);\n      setStudentKotaLeadIds([]);\n    }\n  }, [selectedWorkshop]);\n\n' + effect
)

# Wait, what about isFormSetupCollapsed? Let's make it always expanded when they switch tabs to make it super obvious.
# Wait, let's keep it expanded.

with open(filepath, 'w') as f:
    f.write(content)
print("Updated page.tsx with form sync!")
