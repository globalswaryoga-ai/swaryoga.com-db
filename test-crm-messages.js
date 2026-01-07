const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB'
    });
    
    const crmDb = mongoose.connection.useDb(
      process.env.MONGODB_CRM_DB_NAME || process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB',
      { useCache: true }
    );
    
    const messageCount = await crmDb.model('WhatsAppMessage', {}).collection.countDocuments();
    console.log('✅ Total messages in CRM DB:', messageCount);
    
    // Get the latest 3 messages
    const messages = await crmDb
      .collection('whatsappmessages')
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    
    console.log('\n📱 Latest messages:');
    messages.forEach((m, i) => {
      console.log(`\n${i + 1}. From: ${m.phoneNumber}`);
      console.log(`   Content: ${m.messageContent || m.text || 'N/A'}`);
      console.log(`   Created: ${m.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

test();
