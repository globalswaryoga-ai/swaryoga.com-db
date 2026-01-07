const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkLeads() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log(`✅ Connected to ${dbName}\n`);

    const db = mongoose.connection.getClient().db(dbName);
    
    // Check leads collection
    const leadCount = await db.collection('leads').countDocuments();
    console.log(`📊 Total leads: ${leadCount}`);
    
    if (leadCount === 0) {
      console.log('❌ NO LEADS FOUND!');
    } else {
      console.log('\n👤 Recent leads:');
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(10).toArray();
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

checkLeads();
