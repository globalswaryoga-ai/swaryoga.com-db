require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
async function run() {
  const res = await bunnyExecute({ sql: "SELECT data_json FROM leads_sql" });
  const allLeads = res.rows.map(r => JSON.parse(r.data_json));
  
  const metaLeads = allLeads.filter(l => 
      l.source === 'meta_instant_form' || 
      l.source === 'meta_leadgen' ||
      (l.labels || []).includes('meta_instant_form') ||
      (l.labels || []).includes('meta_leadgen')
  );
  
  const triggered = metaLeads.filter(l => l.metadata?.wtStatus);
  console.log("Total Triggered Meta Leads:", triggered.length);
  
  if (triggered.length > 0) {
      console.log("Recent 5 triggers:");
      triggered.slice(0, 5).forEach(l => {
          console.log(`- ${l.name} (${l.phoneNumber}): Status=${l.metadata?.wtStatus}, Error=${l.metadata?.wtError || 'None'}`);
      });
  }
}
run().catch(console.error);
