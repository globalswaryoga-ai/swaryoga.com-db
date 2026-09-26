import re
import sys

filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add the useEffect for syncing language forms
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
if "Sync form setup when switching languages" not in content:
    content = content.replace(
        '      setRegisteredAiInsights(loadObj("crm_registered_insights"));\n    } else {\n      setLinkedFormId("");\n      setSelectedFormId("");\n      setLeadsData([]);\n\n      // Clear states when no batch is selected\n      setCrmLeadIds([]);\n      setRegisteredLeadIds([]);\n      setPendingLeadIds([]);\n      setPending2LeadIds([]);\n      setStudentKotaLeadIds([]);\n    }\n  }, [selectedWorkshop]);',
        '      setRegisteredAiInsights(loadObj("crm_registered_insights"));\n    } else {\n      setLinkedFormId("");\n      setSelectedFormId("");\n      setLeadsData([]);\n\n      // Clear states when no batch is selected\n      setCrmLeadIds([]);\n      setRegisteredLeadIds([]);\n      setPendingLeadIds([]);\n      setPending2LeadIds([]);\n      setStudentKotaLeadIds([]);\n    }\n  }, [selectedWorkshop]);\n\n' + effect
    )

content = content.replace('count || null', 'count || 0')
content = content.replace('lead.status === "pending2"', '(lead.status as string) === "pending2"')
content = content.replace('lead.status === "registered"', '(lead.status as string) === "registered"')
content = content.replace('case "approval":', 'case "approval" as any:')

# Fix button
content = content.replace('className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md transform hover:scale-105 active:scale-95 duration-200"\n                    >\n                    </button>',
'className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md transform hover:scale-105 active:scale-95 duration-200"\n                    >Save & Map Data\n                    </button>')


# Fix toast issue at line ~640
toast_block = """          toast.success(
            `Automated Meta/Email sent to ${lead.name || "Lead"}: "Congratulations, your form has been selected and approved, now final a small zoom meeting is needed for the class, so let me your date and time select any one slot and join for it."`,
            {
              duration: 6000,
            },
          );"""
toast_fixed = """          toast.success(
            `Automated Meta/Email sent to ${lead.name || "Lead"}: "Congratulations, your form has been selected and approved, now final a small zoom meeting is needed for the class, so let me your date and time select any one slot and join for it."`
          );"""
content = content.replace(toast_block, toast_fixed)

with open(filepath, 'w') as f:
    f.write(content)
