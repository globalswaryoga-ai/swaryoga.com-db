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
  
  const approved = metaLeads.filter(l => l.status === 'approved');
  console.log("Approved leads:", approved.length);
  
  const eligible = approved.filter(l => l.metadata?.ai9WEligible === true);
  console.log("Eligible leads (ai9WEligible=true):", eligible.length);
  
  const triggered = approved.filter(l => l.metadata?.wtStatus);
  console.log("Triggered leads (has wtStatus):", triggered.length);
  
  const notTriggered = eligible.filter(l => !l.metadata?.wtStatus);
  console.log("Eligible but NOT triggered:", notTriggered.length);
  
  if (notTriggered.length > 0) {
      console.log("First not triggered:", notTriggered[0].name, "approvedAt:", notTriggered[0].metadata?.approvedAt);
  }
}
run().catch(console.error);
