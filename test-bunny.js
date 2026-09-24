const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });
async function main() {
  const client = createClient({
    url: process.env.BUNNY_DATABASE_URL,
    authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN
  });
  const res = await client.execute("SELECT 1");
  console.log('Connected', res.rows);
}
main().catch(console.error);
