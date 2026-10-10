require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
async function run() {
  const res = await bunnyExecute({ sql: "SELECT document_id, data_json FROM leads_sql" });
  let count = 0;
  for (const r of res.rows) {
      const lead = JSON.parse(r.data_json);
      if ((lead.source === 'meta_instant_form' || lead.source === 'meta_leadgen' || (lead.labels || []).includes('meta_instant_form') || (lead.labels || []).includes('meta_leadgen'))) {
          if (lead.status === 'approved' && lead.metadata?.wtStatus) {
              lead.metadata.wtStatus = null;
              lead.metadata.wtError = null;
              lead.metadata.wtLastTemplates = null;
              
              await bunnyExecute({
                  sql: `UPDATE leads_sql SET data_json = ? WHERE document_id = ?`,
                  args: [JSON.stringify(lead), r.document_id]
              });
              count++;
          }
      }
  }
  console.log(`Reset wtStatus for ${count} leads to allow retry.`);
}
run().catch(console.error);
