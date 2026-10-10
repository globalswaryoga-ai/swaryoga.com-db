require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');

async function run() {
    const res = await bunnyExecute({ sql: "SELECT data_json FROM leads_sql ORDER BY updated_at ASC" });
    for(const r of res.rows) {
        const lead = JSON.parse(r.data_json);
        if (lead.metadata?.wtStatus === 'failed') {
            console.log("Failed lead:", lead.phoneNumber, "Error:", lead.metadata.wtError);
        }
    }
}
run().catch(console.error);
