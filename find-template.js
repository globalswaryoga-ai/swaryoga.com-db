require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');

async function run() {
    const res = await bunnyExecute({ sql: "SELECT data_json, updated_at FROM leads_sql WHERE json_extract(data_json, '$.metadata.wtStatus') = 'failed'" });
    for(const r of res.rows) {
        const lead = JSON.parse(r.data_json);
        const err = lead.metadata?.wtError || '';
        if (!err.includes('circuit breaker')) {
            console.log("FIRST ERROR:", lead.phoneNumber, err);
            // find the broadcast run message to get the template name
            const msgRes = await bunnyExecute({
                sql: "SELECT data_json FROM broadcast_run_messages_sql WHERE json_extract(data_json, '$.phone') = ? ORDER BY created_at DESC LIMIT 1",
                args: [lead.phoneNumber]
            });
            if (msgRes.rows.length > 0) {
                const msg = JSON.parse(msgRes.rows[0].data_json);
                console.log("Template sent:", msg.templateName);
            }
        }
    }
}
run().catch(console.error);
