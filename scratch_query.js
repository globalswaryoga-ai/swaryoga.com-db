const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function run() {
  const url = process.env.BUNNY_DATABASE_URL;
  const authToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("No URL");
  
  const client = createClient({ url, authToken });
  const result = await client.execute("SELECT document_id, status, json_extract(data_json, '$.failureReason') as failureReason FROM meta_messages_sql WHERE status = 'failed' ORDER BY created_at DESC LIMIT 3");
  console.log(result.rows);
}
run();
