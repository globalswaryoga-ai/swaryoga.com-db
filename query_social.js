require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN
});
async function run() {
  const res = await client.execute("SELECT * FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'");
  console.log(res.rows);
}
run();
