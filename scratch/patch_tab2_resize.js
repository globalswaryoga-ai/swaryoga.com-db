const fs = require('fs');
const file = 'app/admin/crm/new-registration/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const t2HeadStart = code.indexOf('<th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>');

if (t2HeadStart > 0) {
  console.log('Found Tab 2 headers!');
} else {
  console.log('Could not find Tab 2 headers');
}
