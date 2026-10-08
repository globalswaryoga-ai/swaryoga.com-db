with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "r") as f:
    content = f.read()

target1 = """                        {/* Mapping UI will be rendered below when a form is selected and its fields are fetched */}
                        {(Object.keys(googleFormQuestionMap).length > 0 || isManualFormId) && formSource === 'google' && (
                          <div className="mt-6 pt-4 border-t border-slate-200">"""

replacement1 = """                        {/* Mapping UI will be rendered below when a form is selected and its fields are fetched */}
                        {((Object.keys(googleFormQuestionMap).length > 0 || (leadsData && leadsData.length > 0 && leadsData[0]._rawRecord)) || isManualFormId) && formSource === 'google' && (
                          <div className="mt-6 pt-4 border-t border-slate-200">
                            {(() => {
                              if (Object.keys(googleFormQuestionMap).length === 0 && leadsData && leadsData.length > 0 && leadsData[0]._rawRecord) {
                                const rawKeys = Object.keys(leadsData[0]._rawRecord);
                                rawKeys.forEach(k => {
                                  googleFormQuestionMap[k] = k;
                                });
                              }
                              return null;
                            })()}"""

content = content.replace(target1, replacement1)

with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "w") as f:
    f.write(content)

print("done")
