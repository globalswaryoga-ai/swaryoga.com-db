import { bunnyExecute } from './lib/bunnyDatabase.js';

async function resetLeads() {
    try {
        const rows = await bunnyExecute({ sql: "SELECT document_id, data_json FROM leads_sql" });
        for (const row of rows.rows) {
            const lead = JSON.parse(row.data_json);
            if (lead.status === 'approved' || lead.status?.startsWith('stage_')) {
                lead.status = 'new';
                if (lead.metadata) {
                    delete lead.metadata.wtStatus;
                    delete lead.metadata.wtError;
                }
                await bunnyExecute({
                    sql: "UPDATE leads_sql SET data_json = ? WHERE document_id = ?",
                    args: [JSON.stringify(lead), lead._id || lead.id]
                });
                console.log(`Reset lead ${lead.name || lead.phoneNumber}`);
            }
        }
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
}
resetLeads();
