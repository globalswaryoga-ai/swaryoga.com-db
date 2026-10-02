const fs = require('fs');
function patchFile(file) {
  let c = fs.readFileSync(file, 'utf8');

  // Fix counts logic
  c = c.replace(
    /\} else if \(tab\.id === 'approval_1'\) \{[\s\n]+count = activeBatchLeads\.filter\(l => \{[\s\n]+const dec = batchDecisions\[l\.id\] \|\| \{\};[\s\n]+[^}]+\}\)\.length;/g,
    `} else if (tab.id === 'approval_1') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return (dec.status === 'approval_1' || dec.history?.includes('approval_1')) && !dec.isRejected && !dec.isRegistered;
        }).length;`
  );
  
  c = c.replace(
    /\} else if \(tab\.id === 'approval_2'\) \{[\s\n]+count = activeBatchLeads\.filter\(l => \{[\s\n]+const dec = batchDecisions\[l\.id\] \|\| \{\};[\s\n]+[^}]+\}\)\.length;/g,
    `} else if (tab.id === 'approval_2') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return (dec.status === 'approval_2' || dec.history?.includes('approval_2')) && !dec.isRejected && !dec.isRegistered;
        }).length;`
  );

  // Fix currentTabLeads logic
  c = c.replace(
    /if \(activeTab === 'approval_1'\) \{[\s\n]+return activeBatchLeads\.filter\(l => \{[\s\n]+const dec = batchDecisions\[l\.id\] \|\| \{\};[\s\n]+[^}]+\}\);[\s\n]+\}/g,
    `if (activeTab === 'approval_1') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        return (dec.status === 'approval_1' || dec.history?.includes('approval_1')) && !dec.isRejected && !dec.isRegistered;
      });
    }`
  );
  
  c = c.replace(
    /if \(activeTab === 'approval_2'\) \{[\s\n]+return activeBatchLeads\.filter\(l => \{[\s\n]+const dec = batchDecisions\[l\.id\] \|\| \{\};[\s\n]+[^}]+\}\);[\s\n]+\}/g,
    `if (activeTab === 'approval_2') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        return (dec.status === 'approval_2' || dec.history?.includes('approval_2')) && !dec.isRejected && !dec.isRegistered;
      });
    }`
  );
  
  fs.writeFileSync(file, c);
}

patchFile('app/admin/crm/new-registration/_LeadsManagementTab.tsx');
patchFile('app/admin/crm/workshop-offer/_LeadsManagementTab.tsx');
