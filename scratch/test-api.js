const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
async function test() {
  const url = process.env.BUNNY_DATABASE_URL?.trim();
  const authToken = process.env.BUNNY_DATABASE_AUTH_TOKEN?.trim();
  const client = createClient({ url, authToken });
  const res = await client.execute("SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'");
  console.log("Success! Found rows:", res.rows.length);
}
test();
