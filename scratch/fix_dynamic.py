with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

old_dynamic = """  const dynamicColumns = useMemo(() => {
    const keys = new Set<string>();
    leadsData.forEach(lead => {
      if (lead.dynamicAnswers) {
        Object.keys(lead.dynamicAnswers).forEach(k => keys.add(k));
      }
    });"""

new_dynamic = """  const dynamicColumns = useMemo(() => {
    const keys = new Set<string>();
    leadsData.forEach(lead => {
      const answers = lead.dynamicAnswers || lead._rawRecord;
      if (answers) {
        Object.keys(answers).forEach(k => {
          if (k !== 'Timestamp' && k !== 'Email Address') keys.add(k);
        });
      }
    });"""

if old_dynamic in content:
    content = content.replace(old_dynamic, new_dynamic)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
