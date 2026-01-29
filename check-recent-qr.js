const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  // Get recent QR bridge outbound messages
  const messages = await db.collection('whatsapp_messages')
    .find({ 
      direction: 'outbound',
      provider: 'whatsapp_web_bridge'
    })
    .sort({ sentAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('📤 Recent QR Bridge Outbound Messages:\n');
  
  messages.forEach(m => {
    const sentTime = new Date(m.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`📱 ${m.phoneNumber} (${sentTime})`);
    console.log(`   Type: ${m.messageType}`);
    console.log(`   Content: ${(m.messageContent || '').substring(0, 60)}...`);
    console.log(`   Status: ${m.status}`);
    console.log(`   SentByLabel: ${m.sentByLabel || 'N/A'}`);
    console.log(`   SenderDisplayName: ${m.senderDisplayName || 'N/A'}`);
    console.log(`   waMessageId: ${m.waMessageId || 'N/A'}`);
    console.log('');
  });
  
  await client.close();
}

main().catch(console.error);
