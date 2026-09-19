const { config } = require('dotenv');
config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');

async function main() {
  const result = await bunnyExecute({ sql: "SELECT name FROM sqlite_master WHERE type='table';" });
  console.log(result);
}

main().catch(console.error);
