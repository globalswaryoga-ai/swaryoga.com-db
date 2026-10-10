require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');

async function run() {
    const res = await bunnyExecute({ sql: "SELECT data_json, updated_at FROM leads_sql WHERE json_extract(data_json, '$.metadata.wtStatus') = 'failed'" });
    for(const r of res.rows) {
        const lead = JSON.parse(r.data_json);
        const err = lead.metadata?.wtError || '';
        if (!err.includes('circuit breaker')) {
            console.log("FIRST ERROR:", lead.phoneNumber, err);
        }
    }
}
run().catch(console.error);
