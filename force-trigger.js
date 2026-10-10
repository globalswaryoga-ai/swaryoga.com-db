require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
async function run() {
  const res = await bunnyExecute({ sql: "SELECT document_id, data_json FROM leads_sql" });
  const allLeads = res.rows.map(r => JSON.parse(r.data_json));
  
  const metaLeads = allLeads.filter(l => 
      l.source === 'meta_instant_form' || 
      l.source === 'meta_leadgen' ||
      (l.labels || []).includes('meta_instant_form') ||
      (l.labels || []).includes('meta_leadgen')
  );
  
  const eligible = metaLeads.filter(l => l.metadata?.ai9WEligible === true && !l.metadata?.wtStatus);
  console.log("Eligible leads to force trigger:", eligible.length);
  
  if (eligible.length > 0) {
      const ids = eligible.map(l => l._id || l.id);
      
      const payload = {
          ids: ids.slice(0, 10), // Try first 10
          template: 'meta_welcome_message' // WE NEED A VALID TEMPLATE NAME HERE! Let's hope this exists.
      };
      
      const resp = await fetch('http://localhost:3000/api/admin/crm/meta-leads/trigger-wt-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      
      const text = await resp.text();
      console.log("Trigger API Response:", text);
  }
}
run().catch(console.error);
