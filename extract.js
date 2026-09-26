const fs = require('fs');

const code = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf8');
const lines = code.split('\n');

const startIndex = lines.findIndex(l => l.includes("{(activeTab === 'forms' || (!selectedWorkshop && activeTab === 'all_leads')) && ("));
let endIndex = startIndex;
let braceCount = 0;
let foundFirstBrace = false;

for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '(') { braceCount++; foundFirstBrace = true; }
    if (line[j] === ')') { braceCount--; }
  }
  if (foundFirstBrace && braceCount === 0) {
    endIndex = i;
    break;
  }
}

// Ensure we found it
console.log('Form block:', startIndex, 'to', endIndex);

const formBlock = lines.slice(startIndex + 1, endIndex).join('\n'); // omit the {(...)} wrapper

const renderFunc = `
  const renderWorkshopForm = () => {
    return (
${formBlock}
    );
  };
`;

const returnIndex = lines.findIndex(l => l.startsWith('  return ('));

// Replace the original block with a call
const newBlock = `              {(activeTab === 'forms') && renderWorkshopForm()}`;

lines.splice(startIndex, endIndex - startIndex + 1, newBlock);

// Insert render func
lines.splice(returnIndex, 0, renderFunc);

fs.writeFileSync('app/admin/crm/new-registration/page.tsx.tmp', lines.join('\n'));
console.log('Written to page.tsx.tmp');
