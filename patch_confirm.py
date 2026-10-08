with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "r") as f:
    content = f.read()

target1 = """                              onClick={async () => {
                                if (p.googleFormUrl && !p.googleFormUrl.includes('docs.google.com/forms') && !p.googleFormUrl.includes('forms.gle')) {
                                  toast.error('Please enter a valid Google Form URL');
                                  return;
                                }"""

replacement1 = """                              onClick={async () => {
                                if (p.linkedFormId && !window.confirm("Are you sure you want to change this workshop's configuration? If it was already working, changing this might disrupt your leads for the next 6 months.")) return;
                                if (p.googleFormUrl && !p.googleFormUrl.includes('docs.google.com/forms') && !p.googleFormUrl.includes('forms.gle')) {
                                  toast.error('Please enter a valid Google Form URL');
                                  return;
                                }"""

target2 = """                      onClick={async () => {
                        if (p.saveWorkshopSettings) {"""

replacement2 = """                      onClick={async () => {
                        if (p.linkedFormId && !window.confirm("Are you sure you want to change this workshop's mapping configuration? If it was already working, changing this might disrupt your leads for the next 6 months.")) return;
                        if (p.saveWorkshopSettings) {"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open("app/admin/crm/new-registration/_WorkshopFormTab.tsx", "w") as f:
    f.write(content)

print("done")
