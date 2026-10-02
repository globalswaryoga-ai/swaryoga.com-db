require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./.next/server/app/api/admin/crm/receipts/route.js'); 
// wait, the above import won't work because bunnyExecute is in a lib file which is compiled into the webpack bundle.
