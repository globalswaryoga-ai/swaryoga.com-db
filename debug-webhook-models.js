const mongoose = require('mongoose');
require('dotenv').config();

async function debug() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  console.log('📋 Debug Info:');
  console.log('  MongoDB URI:', MONGODB_URI?.substring(0, 50) + '...');
  console.log('  CRM DB Name:', CRM_DB_NAME);
  
  await mongoose.connect(MONGODB_URI);
  console.log('\n✅ Connected to MongoDB');
  
  // Check what's in mongoose.models
  console.log('\n🔍 Global mongoose.models:');
  const globalModels = Object.keys(mongoose.models);
  console.log('  Count:', globalModels.length);
  if (globalModels.includes('WhatsAppMessage')) {
    console.log('  ✅ WhatsAppMessage in global cache');
  } else {
    console.log('  ❌ WhatsAppMessage NOT in global cache');
  }
  
  // Check what's in CRM DB
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  console.log('\n🔍 CRM Database models:');
  const crmModels = Object.keys(crmDb.models);
  console.log('  Count:', crmModels.length);
  if (crmModels.includes('WhatsAppMessage')) {
    console.log('  ✅ WhatsAppMessage in CRM DB cache');
  } else {
    console.log('  ❌ WhatsAppMessage NOT in CRM DB cache');
  }
  
  // Test the pattern from enterpriseSchemas
  console.log('\n🧪 Testing getCrmDb().models pattern:');
  const test1 = crmDb.models.Test || crmDb.model('Test', new mongoose.Schema({ name: String }));
  console.log('  First call - created:', crmDb.models.Test ? 'YES' : 'NO');
  
  const test2 = crmDb.models.Test || crmDb.model('Test', new mongoose.Schema({ name: String }));
  console.log('  Second call - reused:', test2 === test1 ? 'YES' : 'NO');
  
  // List databases in MongoDB
  console.log('\n📊 Available databases:');
  const adminDb = mongoose.connection.getClient().db('admin');
  const dbs = await adminDb.admin().listDatabases();
  const dbNames = dbs.databases.map(d => d.name).filter(n => n.includes('swaryoga'));
  dbNames.forEach(name => console.log('  -', name));
  
  console.log('\n✅ Debug complete!');
  process.exit(0);
}

debug().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
