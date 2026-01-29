const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  // Get a recent template message with full data
  const template = await db.collection('whatsapp_messages')
    .findOne({ 
      direction: 'outbound',
      provider: 'whatsapp_web_bridge',
      messageType: 'template'
    }, { sort: { sentAt: -1 } });
  
  if (template) {
    console.log('📋 Latest QR Template Message:\n');
    console.log('  _id:', template._id);
    console.log('  phoneNumber:', template.phoneNumber);
    console.log('  messageType:', template.messageType);
    console.log('  messageContent:', (template.messageContent || '').substring(0, 60) + '...');
    console.log('  status:', template.status);
    console.log('  media:', JSON.stringify(template.media || null));
    console.log('  metadata:', JSON.stringify(template.metadata || null, null, 2));
  } else {
    console.log('No template messages found');
  }
  
  await client.close();
}

main().catch(console.error);
