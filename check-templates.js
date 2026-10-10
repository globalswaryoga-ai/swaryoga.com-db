require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
async function run() {
  const res = await bunnyExecute({ sql: "SELECT data_json FROM templates_sql" });
  const templates = res.rows.map(r => JSON.parse(r.data_json));
  console.log("Templates count:", templates.length);
  if (templates.length > 0) {
      console.log("Sample languages:", templates.slice(0, 3).map(t => ({ name: t.name, lang: t.language })));
  }
}
run().catch(console.error);
