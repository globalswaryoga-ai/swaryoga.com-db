const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/form-questions/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix PUT -> PATCH and URL for Edit
content = content.replace(
  /const url = editingQId \? `\/api\/admin\/form-questions\/\$\{editingQId\}` : `\/api\/admin\/form-questions`;/g,
  `const url = editingQId ? \`/api/admin/form-questions?id=\${editingQId}\` : '/api/admin/form-questions';`
);

content = content.replace(
  /const method = editingQId \? 'PUT' : 'POST';/g,
  `const method = editingQId ? 'PATCH' : 'POST';`
);

// Fix DELETE URL
content = content.replace(
  /const res = await fetch\(`\/api\/admin\/form-questions\/\$\{id\}`/g,
  `const res = await fetch(\`/api/admin/form-questions?id=\${id}\``
);

fs.writeFileSync(file, content);
console.log('Patched API methods and endpoints');
