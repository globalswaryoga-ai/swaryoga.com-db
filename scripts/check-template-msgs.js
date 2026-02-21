const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkRecentTemplateMessages() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  // Check multiple collections
  const collections = ['whatsappmessages', 'whatsapp_messages', 'meta_messages'];
  
  for (const coll of collections) {
    const exists = await mongoose.connection.db.listCollections({ name: coll }).hasNext();
    if (!exists) {
      console.log(`Collection ${coll}: NOT FOUND`);
      continue;
    }
    
    const total = await mongoose.connection.collection(coll).countDocuments({});
    const templates = await mongoose.connection.collection(coll).countDocuments({ messageType: 'template' });
    console.log(`Collection ${coll}: ${total} total, ${templates} templates`);
    
    // Show recent templates
    if (templates > 0) {
      const recent = await mongoose.connection.collection(coll)
        .find({ messageType: 'template' })
        .sort({ sentAt: -1 })
        .limit(5)
        .toArray();
      
      recent.forEach((m, i) => {
        console.log(`  [${i+1}] ${m.phoneNumber} - ${m.status} - WA: ${m.waMessageId || 'none'} - Error: ${m.errorMessage || 'none'}`);
      });
    }
  }
  
  await mongoose.disconnect();
}
  
  console.log('=== Recent OUTBOUND Messages ===');
  messages.forEach((m, i) => {
    console.log(`\n[${i+1}] Phone: ${m.phoneNumber}`);
    console.log('    Type:', m.messageType);
    console.log('    Status:', m.status);
    console.log('    Content:', (m.messageContent || '').substring(0, 50));
    console.log('    Template:', m.metadata?.template?.templateName || '(none)');
    console.log('    WA MessageId:', m.waMessageId || '(none)');
    console.log('    Error:', m.errorMessage || '(none)');
    console.log('    Sent:', m.sentAt);
    console.log('    Provider:', m.provider);
  });
  
  await mongoose.disconnect();
}

checkRecentTemplateMessages().catch(console.error);
