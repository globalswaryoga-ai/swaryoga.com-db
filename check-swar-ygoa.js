const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  // Find messages with "swar ygoa" in content or metadata
  const messages = await db.collection('whatsapp_messages')
    .find({
      $or: [
        { messageContent: { $regex: /swar.*ygoa/i } },
        { 'metadata.template.headerContent': { $regex: /swar.*ygoa/i } },
        { 'metadata.template.templateName': { $regex: /swar.*ygoa/i } }
      ]
    })
    .sort({ sentAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('Messages with "swar ygoa":', messages.length);
  
  messages.forEach(m => {
    console.log('\n📱', m.phoneNumber, '-', new Date(m.sentAt).toLocaleString());
    console.log('  messageType:', m.messageType);
    console.log('  messageContent:', (m.messageContent || '').substring(0, 80));
    console.log('  media:', JSON.stringify(m.media || null));
    console.log('  metadata.template:', JSON.stringify(m.metadata?.template || null, null, 2));
  });
  
  // Also check for TEXT header templates that might have been saved incorrectly
  console.log('\n\n--- TEXT Header Templates ---');
  const textTemplates = await db.collection('whatsapp_messages')
    .find({
      messageType: 'template',
      'metadata.template.headerFormat': 'TEXT'
    })
    .sort({ sentAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('TEXT header templates:', textTemplates.length);
  textTemplates.forEach(m => {
    console.log('\n📱', m.phoneNumber);
    console.log('  headerContent:', m.metadata?.template?.headerContent);
    console.log('  headerMedia:', m.metadata?.template?.headerMedia);
  });
  
  await client.close();
}

main().catch(console.error);
