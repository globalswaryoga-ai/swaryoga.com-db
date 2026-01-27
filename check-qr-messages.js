require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI_MAIN;

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Count by provider
  const qrCount = await db.collection('whatsapp_messages')
    .countDocuments({ provider: { $in: ['whatsapp_qr', 'whatsapp_web_bridge'] } });
  
  const metaCount = await db.collection('whatsapp_messages')
    .countDocuments({ provider: 'meta' });
    
  console.log('QR messages:', qrCount);
  console.log('Meta messages:', metaCount);
  
  // Get unique phoneNumbers from QR messages
  const phones = await db.collection('whatsapp_messages')
    .distinct('phoneNumber', { provider: { $in: ['whatsapp_qr', 'whatsapp_web_bridge'] } });
  console.log('QR unique phones:', phones);
  
  // Get recent QR messages
  const msgs = await db.collection('whatsapp_messages')
    .find({ provider: { $in: ['whatsapp_qr', 'whatsapp_web_bridge'] } })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('\nRecent QR messages:');
  msgs.forEach(m => {
    console.log(`- ${m.direction} | ${m.phoneNumber} | ${m.messageContent?.substring(0,30)} | ${m.createdAt}`);
  });
  
  await client.close();
})();
