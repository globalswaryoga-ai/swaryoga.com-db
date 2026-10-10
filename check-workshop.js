require('dotenv').config({ path: '.env.local' });
const { bunnyExecute } = require('./lib/bunnyDatabase');
async function run() {
  const res = await bunnyExecute({ sql: "SELECT data_json FROM workshops_sql" });
  const workshops = res.rows.map(r => JSON.parse(r.data_json));
  
  const w = workshops.find(w => w.language === 'English' && (w.name.includes('Meta') || w.name.includes('AI') || true));
  
  workshops.forEach(w => {
      console.log(`Workshop: ${w.name}`);
      console.log(`  AI-9E Active:`, w.metadata?.ai9Config?.stage5_whatsapp?.isActive);
      console.log(`  WT Template:`, w.metadata?.wtSettings?.approved?.template);
  });
}
run().catch(console.error);
