require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');

async function run() {
    const res = await bunnyExecute({ sql: "SELECT * FROM whatsapp_broadcast_runs_sql LIMIT 5" });
    console.log(res.rows);
}
run().catch(console.error);
