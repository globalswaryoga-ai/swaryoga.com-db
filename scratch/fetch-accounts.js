const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
const { cleanMongoJson } = require('./scratch/bunny.js');

async function test() {
  const client = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
  const res = await client.execute("SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'");
  const accounts = [];
  for (const row of res.rows) {
    const raw = JSON.parse(row.document_json);
    const cleaned = cleanMongoJson(raw);
    accounts.push(cleaned);
  }
  console.log(JSON.stringify(accounts, null, 2));
}
test();
