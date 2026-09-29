const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const client = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN
});
async function run() {
  const res = await client.execute('SELECT document_id, data_json FROM whatsapp_templates_sql');
  for (const row of res.rows) {
    try {
      JSON.parse(row.data_json);
    } catch(e) {
      console.log('BAD JSON on ID:', row.document_id, e);
    }
  }
  console.log('Checked all', res.rows.length, 'templates.');
}
run();
