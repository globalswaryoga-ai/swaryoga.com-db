const fs = require('fs');
const file = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove the input fields
content = content.replace(/<div className="flex items-center gap-3 w-\[500px\]">[\s\S]*?<\/div>/, '');

fs.writeFileSync(file, content);
