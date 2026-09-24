const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Hide the Field Key input from the UI
content = content.replace(
  /<div>\s*<label className="block text-xs font-bold text-slate-500 mb-1">Field Key \*<\/label>[\s\S]*?<\/div>/,
  `{/* Field Key auto-generated behind the scenes */}`
);

// 2. Auto-generate Field Key on save if empty
content = content.replace(
  /if \(!qData\.label\?\.en\?\.trim\(\)\) return showToast\('Please enter a question label', 'error'\);/g,
  `if (!qData.label?.en?.trim()) return showToast('Please enter a question label', 'error');
    
    // Auto-generate field key if missing
    let finalKey = qData.fieldKey || qData.label.en.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    if (!finalKey) finalKey = 'q_' + Math.random().toString(36).substr(2, 5);
    qData.fieldKey = finalKey;`
);

fs.writeFileSync(file, content);
console.log('Patched Field Key logic');
