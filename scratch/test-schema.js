const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
async function test() {
  const client = createClient({ url: process.env.BUNNY_DATABASE_URL?.trim(), authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN?.trim() });
  const res = await client.execute("PRAGMA table_info(mongo_documents)");
  console.log(res.rows);
}
test();
