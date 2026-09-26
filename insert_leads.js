const fs = require('fs');
const content = fs.readFileSync('app/admin/crm/new-registration/page.tsx', 'utf-8');
const lines = content.split('\n');

const startSearchString = '{/* Render Fetched Leads Inline in Forms Tab */}';
let startIdx = lines.findIndex(l => l.includes(startSearchString));
let wrapperStartIdx = startIdx - 2;

let wrapperEndIdx = -1;
let openDivs = 0;
for (let i = wrapperStartIdx; i < lines.length; i++) {
    const openMatches = lines[i].match(/<div/g);
    const closeMatches = lines[i].match(/<\/div/g);
    if (openMatches) openDivs += openMatches.length;
    if (closeMatches) openDivs -= closeMatches.length;
    if (openDivs === 0 && i > wrapperStartIdx) {
        wrapperEndIdx = i;
        break;
    }
}

if (wrapperEndIdx === -1) {
    console.error("Could not find end of Linked Leads component");
    process.exit(1);
}

const componentLines = lines.slice(wrapperStartIdx, wrapperEndIdx + 1);

const insertTag = '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
let insertIdx = lines.findIndex(l => l.includes(insertTag));

if (insertIdx === -1) {
    console.error("Could not find insertion point");
    process.exit(1);
}

const finalComponent = [
    '                {/* Render Fetched Leads Inline in All Data Tab */}',
    ...componentLines.map(l => '  ' + l) // indent slightly
];

lines.splice(insertIdx, 0, ...finalComponent);

fs.writeFileSync('app/admin/crm/new-registration/page.tsx', lines.join('\n'));
console.log("Successfully inserted Linked Leads component");
