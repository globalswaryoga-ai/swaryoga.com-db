filepath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Replace the save logic to target the selected workshop instead of the whole language
old_save_logic = """                        const updatedWorkshops = workshops.map((w) => {
                          if (w.language === selectedDashboardLang) {
                            return {
                              ...w,
                              formId: newFormId,
                              googleFormMapping: newMapping,
                            };
                          }
                          return w;
                        });

                        setWorkshops(updatedWorkshops);

                        if (
                          selectedWorkshop &&
                          (selectedWorkshop.language ===
                            selectedDashboardLang ||
                            (!selectedWorkshop.language &&
                              selectedDashboardLang === "English"))
                        ) {
                          setSelectedWorkshop({
                            ...selectedWorkshop,
                            formId: newFormId,
                            googleFormMapping: newMapping,
                          });
                        }"""

new_save_logic = """                        const updatedWorkshops = workshops.map((w) => {
                          if (w.id === selectedWorkshop?.id) {
                            return {
                              ...w,
                              formId: newFormId,
                              googleFormMapping: newMapping,
                            };
                          }
                          return w;
                        });

                        setWorkshops(updatedWorkshops);

                        if (selectedWorkshop) {
                          setSelectedWorkshop({
                            ...selectedWorkshop,
                            formId: newFormId,
                            googleFormMapping: newMapping,
                          });
                        }"""

if old_save_logic in content:
    content = content.replace(old_save_logic, new_save_logic)
    with open(filepath, 'w') as f:
        f.write(content)
    print("Successfully updated save logic.")
else:
    print("Could not find exact block. Let's find it with regex.")
