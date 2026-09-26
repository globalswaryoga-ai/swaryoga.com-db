const fs = require('fs');

const pageContent = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf-8');
const pageLines = pageContent.split('\n');

const compContent = fs.readFileSync('/tmp/leads_component.tsx', 'utf-8');
const compLines = compContent.split('\n');

// Drop the last empty line if it exists
if (compLines[compLines.length - 1] === '') {
    compLines.pop();
}

const insertTag = '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
let insertIdx = pageLines.findIndex(l => l.includes(insertTag));

if (insertIdx === -1) {
    console.error("Could not find insertion point");
    process.exit(1);
}

const finalComponent = [
    '                {/* Render Fetched Leads Inline in All Data Tab */}',
    ...compLines
];

pageLines.splice(insertIdx, 0, ...finalComponent);

fs.writeFileSync('app/admin/crm/new-registration/page.tsx', pageLines.join('\n'));
console.log("Successfully inserted component of size", finalComponent.length);
