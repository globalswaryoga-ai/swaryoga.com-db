require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');

async function run() {
    const res = await bunnyExecute({ sql: "SELECT data_json, updated_at FROM leads_sql WHERE json_extract(data_json, '$.status') = 'approved' AND json_extract(data_json, '$.metadata.wtStatus') = 'failed' ORDER BY updated_at ASC LIMIT 10" });
    for(const r of res.rows) {
        const lead = JSON.parse(r.data_json);
        console.log("Time:", r.updated_at, "Lead:", lead.phoneNumber, "Error:", lead.metadata?.wtError);
    }
}
run().catch(console.error);
