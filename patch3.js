const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    /return dec\.status === tab\.id && !dec\.isRejected && !dec\.isRegistered;/g,
    `return (dec.status === tab.id || dec.history?.includes(tab.id)) && !dec.isRejected && !dec.isRegistered;`
  );

  fs.writeFileSync(file, content);
}

patchFile('app/admin/crm/workshop-offer/_LeadsManagementTab.tsx');
patchFile('app/admin/crm/new-registration/_LeadsManagementTab.tsx');
