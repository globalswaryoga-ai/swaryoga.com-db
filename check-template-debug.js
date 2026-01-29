const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  console.log('Connecting...');
  // Try swaryoga_admin_crm database instead
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;
  
  // Search by templateName
  const template = await db.collection('whatsapp_templates').findOne({ templateName: 'swaryogabesic' });
  
  if (template) {
    console.log('=== FULL TEMPLATE DATA (from swaryoga_admin_crm) ===');
    console.log(JSON.stringify(template, null, 2));
  } else {
    // List all templates to find correct name
    const all = await db.collection('whatsapp_templates').find({}).limit(10).toArray();
    console.log('Available templates in swaryoga_admin_crm:', all.map(t => ({ name: t.templateName, id: t._id })));
  }
  
  await mongoose.disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
