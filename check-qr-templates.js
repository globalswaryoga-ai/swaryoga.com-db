const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  // Find templates from QR bridge
  const templates = await db.collection('whatsapp_messages')
    .find({ 
      direction: 'outbound',
      provider: 'whatsapp_web_bridge',
      $or: [
        { messageType: 'template' },
        { 'metadata.template': { $exists: true } }
      ]
    })
    .sort({ sentAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('📋 QR Bridge Templates:', templates.length);
  
  if (templates.length === 0) {
    console.log('⚠️  No templates found from QR bridge\n');
    
    // Check all recent QR outbound
    const recent = await db.collection('whatsapp_messages')
      .find({ direction: 'outbound', provider: 'whatsapp_web_bridge' })
      .sort({ sentAt: -1 })
      .limit(10)
      .toArray();
    
    console.log('📤 Recent QR outbound messages:', recent.length);
    recent.forEach(m => {
      console.log(`  - ${m.phoneNumber} | type: ${m.messageType} | ${new Date(m.sentAt).toLocaleString()}`);
      if (m.metadata) console.log(`    metadata: ${JSON.stringify(m.metadata).substring(0, 100)}`);
    });
  } else {
    templates.forEach(m => {
      console.log(`\n📱 ${m.phoneNumber} (${new Date(m.sentAt).toLocaleString()})`);
      console.log(`   Type: ${m.messageType}`);
      console.log(`   Template: ${m.metadata?.template?.templateName || 'N/A'}`);
      console.log(`   Content: ${(m.messageContent || '').substring(0, 60)}`);
      console.log(`   Status: ${m.status}`);
    });
  }
  
  await client.close();
}

main().catch(console.error);
