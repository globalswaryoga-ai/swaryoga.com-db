const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  // Find the exact message with "swar ygoa" that could be causing the 404
  // It might be stored as a lastMessage in conversation/lead
  const leads = await db.collection('leads')
    .find({
      $or: [
        { 'lastMessage.content': { $regex: /swar.*ygoa/i } },
        { 'lastMessage.messageContent': { $regex: /swar.*ygoa/i } }
      ]
    })
    .limit(5)
    .toArray();
  
  console.log('Leads with "swar ygoa" in lastMessage:', leads.length);
  leads.forEach(l => {
    console.log('\n📱', l.phoneNumber, '-', l.name);
    console.log('  lastMessage:', JSON.stringify(l.lastMessage, null, 2));
  });
  
  // Also check if any message has "swar ygoa" stored as a media URL
  const badMediaMessages = await db.collection('whatsapp_messages')
    .find({
      $or: [
        { 'media.url': { $regex: /swar.*ygoa/i } },
        { mediaUrl: { $regex: /swar.*ygoa/i } }
      ]
    })
    .limit(5)
    .toArray();
  
  console.log('\n\nMessages with "swar ygoa" as media URL:', badMediaMessages.length);
  badMediaMessages.forEach(m => {
    console.log('  -', m._id, m.media?.url || m.mediaUrl);
  });
  
  // Check for messages where messageType is 'image' but has text-like content
  const textAsImage = await db.collection('whatsapp_messages')
    .find({
      messageType: 'image',
      media: { $exists: false }
    })
    .sort({ sentAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('\n\nMessages type=image but no media:', textAsImage.length);
  textAsImage.forEach(m => {
    console.log('  -', m._id, 'content:', (m.messageContent || '').substring(0, 50));
  });
  
  await client.close();
}

main().catch(console.error);
