const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const { cleanMongoJson } = require('./bunny.js');
async function test() {
  const client = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
  const res = await client.execute("SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts' LIMIT 1");
  const raw = res.rows[0].document_json;
  const cleaned = cleanMongoJson(JSON.parse(raw));
  console.log(JSON.stringify(cleaned, null, 2).includes('$numberInt'));
  console.log(JSON.stringify(cleaned, null, 2).includes('$numberLong'));
}
test();
