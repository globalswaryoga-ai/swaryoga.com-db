require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkTemplates() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const templates = await db.collection('whatsapp_templates').find({}).limit(10).toArray();
  
  console.log('Your WhatsApp Templates:');
  console.log('========================');
  templates.forEach(t => {
    console.log(`- ${t.templateName || t.name} (status: ${t.status})`);
    if (t.buttons && t.buttons.length > 0) {
      console.log(`  └─ Has ${t.buttons.length} buttons: ${t.buttons.map(b => b.text).join(', ')}`);
    }
  });
  
  process.exit(0);
}

checkTemplates().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});
