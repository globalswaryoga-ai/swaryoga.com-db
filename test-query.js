require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
async function test() {
  const res = await bunnyExecute({ sql: "SELECT data_json FROM leads_sql" });
  console.log(res.rows.filter(r => {
    try {
      const parsed = JSON.parse(r.data_json);
      return !!parsed.metadata?.wtStatus;
    } catch(e) { return false; }
  }).length);
}
test().catch(console.error);
