const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
    const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
    
    // Check both with and without country code
    const searches = [
      '919309986820',  // With country code
      '9309986820',    // Without country code
    ];
    
    for (const phoneNumber of searches) {
      const messages = await crmDb
        .collection('whatsapp_messages')
        .find({ phoneNumber: phoneNumber })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      console.log(`\n📱 Messages from ${phoneNumber}: ${messages.length}`);
      
      if (messages.length > 0) {
        messages.forEach((msg, i) => {
          console.log(`\n  ${i + 1}. "${msg.messageContent || msg.text || 'N/A'}"`);
          console.log(`     Direction: ${msg.direction}`);
          console.log(`     Created: ${new Date(msg.createdAt).toLocaleString()}`);
        });
      }
    }
    
    // Also check Leads
    const leads = await crmDb
      .collection('leads')
      .find({ phoneNumber: { $in: ['919309986820', '9309986820'] } })
      .toArray();
    
    console.log(`\n👤 Leads from your number: ${leads.length}`);
    if (leads.length > 0) {
      leads.forEach(lead => {
        console.log(`   - Name: ${lead.name || 'N/A'}`);
        console.log(`   - Status: ${lead.status || 'N/A'}`);
        console.log(`   - Last message: ${new Date(lead.lastMessageAt).toLocaleString()}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

check();
