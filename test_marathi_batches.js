const fs = require('fs');
const contents = fs.readFileSync('/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/marathi/page.tsx', 'utf8');
const regex = /language:\s*([^\n]+)/g;
let m;
while ((m = regex.exec(contents)) !== null) {
    console.log(m[1]);
}
