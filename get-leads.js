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
  console.log("Total Meta Leads:", metaLeads.length);
  
  const approved = metaLeads.filter(l => l.status === 'approved');
  console.log("Approved Meta Leads:", approved.length);
  
  const eligible = approved.filter(l => l.metadata?.ai9WEligible === true);
  console.log("Eligible Meta Leads:", eligible.length);
  
  const withApprovedAt = eligible.filter(l => l.metadata?.approvedAt);
  console.log("With approvedAt:", withApprovedAt.length);
  
  const now = Date.now();
  const pastDelay = withApprovedAt.filter(l => (now - new Date(l.metadata.approvedAt).getTime()) >= (5 * 60 * 1000));
  console.log("Past Delay (5 min):", pastDelay.length);
  
  const withoutWtStatus = pastDelay.filter(l => !l.metadata?.wtStatus);
  console.log("Without wtStatus:", withoutWtStatus.length);
  
  const triggered = metaLeads.filter(l => l.metadata?.wtStatus);
  console.log("Total Triggered:", triggered.length);
}
run().catch(console.error);
