const fs = require('fs');

const file1 = 'app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let c1 = fs.readFileSync(file1, 'utf8');

if (!c1.includes('getCategoryLabel')) {
  c1 = c1.replace(
    /const toggleLeadSelection = \(leadId: string\) => \{/,
    `const getCategoryLabel = (id: string) => {
    const tab = SIDEBAR_TABS.find((t: any) => t.id === id);
    return tab ? tab.label : id.replace(/_/g, ' ');
  };

  const toggleLeadSelection = (leadId: string) => {`
  );
  
  c1 = c1.replace(
    /\{leadStatus.replace\(\/_\/g, ' '\)\}/g,
    '{getCategoryLabel(leadStatus)}'
  );

  fs.writeFileSync(file1, c1);
}

