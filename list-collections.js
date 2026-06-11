// List all collections in both databases
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not set in .env.local');
  process.exit(1);
}

async function listCollections() {
  let client;
  try {
    console.log('🔗 Connecting to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI);
    client = conn.connection.getClient();
    
    // List swarsakshiDB collections
    const mainDb = client.db('swarsakshiDB');
    const mainCollections = await mainDb.listCollections().toArray();
    console.log(`\n📚 swarsakshiDB collections (${mainCollections.length}):`);
    mainCollections
      .filter(c => c.name.toLowerCase().includes('youtube') || c.name.toLowerCase().includes('verif'))
      .forEach(c => console.log(`   - ${c.name}`));
    
    // List CRM collections
    const crmDb = client.db('swaryoga_admin_crm');
    const crmCollections = await crmDb.listCollections().toArray();
    console.log(`\n📚 swaryoga_admin_crm collections (${crmCollections.length}):`);
    crmCollections
      .filter(c => c.name.toLowerCase().includes('youtube') || c.name.toLowerCase().includes('verif'))
      .forEach(c => console.log(`   - ${c.name}`));
    
    // Count total
    console.log(`\n📊 Total collections: ${mainCollections.length + crmCollections.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await mongoose.disconnect();
    }
  }
}

listCollections();
