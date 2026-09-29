const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const client = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN
});
async function run() {
  const res = await client.execute('SELECT COUNT(*) as count FROM whatsapp_templates_sql');
  console.log('Total templates:', res.rows[0].count);
  const res2 = await client.execute('SELECT template_name, language, created_by FROM whatsapp_templates_sql LIMIT 5');
  console.log('Templates:', res2.rows);
}
run();
