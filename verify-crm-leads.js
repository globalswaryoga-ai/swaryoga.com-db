const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function checkCrmLeads() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const client = await mongoose.connect(mongoUri, { maxPoolSize: 10 }).then(() => mongoose.connection.getClient());
    console.log(`✅ Connected to MongoDB\n`);

    const crmDb = client.db(crmDbName);
    
    // Check leads collection in CRM DB
    const leadCount = await crmDb.collection('leads').countDocuments();
    console.log(`📊 Total leads in ${crmDbName}: ${leadCount}`);
    
    if (leadCount === 0) {
      console.log('❌ NO LEADS FOUND!');
    } else {
      console.log('✅ LEADS RESTORED!\n');
      console.log('👤 Recent leads:');
      const leads = await crmDb.collection('leads').find({}).sort({ createdAt: -1 }).limit(10).toArray();
      leads.forEach((lead, i) => {
        console.log(`${i+1}. ${lead.phoneNumber || 'No phone'} - ${lead.name || 'No name'} (${lead.createdAt})`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCrmLeads();
