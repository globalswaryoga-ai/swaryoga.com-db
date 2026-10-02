const fs = require('fs');

function fixFiles() {
  const file1 = 'app/admin/crm/new-registration/_LeadsManagementTab.tsx';
  let c1 = fs.readFileSync(file1, 'utf8');
  c1 = c1.replace(
    /const \[batchDecisions, setBatchDecisions\] = useState<Record<string, \{ status: string; reason: string \}>>\(\(\) => \{/g,
    'const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>(() => {'
  );
  fs.writeFileSync(file1, c1);

  const file2 = 'app/admin/crm/workshop-offer/_LeadsManagementTab.tsx';
  let c2 = fs.readFileSync(file2, 'utf8');
  c2 = c2.replace(
    /const \[batchDecisions, setBatchDecisions\] = useState<Record<string, \{ status: string; reason: string \}>>\(\(\) => \{/g,
    'const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>(() => {'
  );
  fs.writeFileSync(file2, c2);

  const file3 = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
  let c3 = fs.readFileSync(file3, 'utf8');
  c3 = c3.replace(/await fetch\(msg\.imageUrl\);/g, 'await fetch(msg.imageUrl!);');
  fs.writeFileSync(file3, c3);
}

fixFiles();
