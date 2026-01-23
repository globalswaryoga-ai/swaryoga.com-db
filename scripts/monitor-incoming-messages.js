const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function monitorMessages() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  const targetPhone = '919779006820';
  
  console.log(`\n🔍 REAL-TIME MESSAGE MONITOR\n`);
  console.log(`📱 Monitoring phone: ${targetPhone}`);
  console.log(`⏰ Start time: ${new Date().toISOString()}`);
  console.log(`\n📝 Send messages to: https://wa.me/919779006820\n`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  let lastCheckTime = new Date();
  let messageCount = 0;
  
  const checkForMessages = async () => {
    try {
      // Check for new inbound messages
      const inboundMsgs = await crmDb.collection('whatsapp_messages').find({
        phoneNumber: targetPhone,
        direction: 'inbound',
        createdAt: { $gte: lastCheckTime }
      }).sort({ createdAt: -1 }).toArray();
      
      // Check for new webhook events
      const webhookEvents = await crmDb.collection('whatsapp_webhook_events').find({
        phoneNumber: targetPhone,
        kind: 'inbound_message',
        receivedAt: { $gte: lastCheckTime }
      }).sort({ receivedAt: -1 }).toArray();
      
      if (inboundMsgs.length > 0 || webhookEvents.length > 0) {
        messageCount += inboundMsgs.length;
        
        if (webhookEvents.length > 0) {
          console.log(`\n⚡ WEBHOOK EVENT RECEIVED`);
          webhookEvents.forEach((ev) => {
            console.log(`   📥 Time: ${ev.receivedAt.toISOString()}`);
            console.log(`   🏷️  Message ID: ${ev.waMessageId}`);
            console.log(`   📝 Preview: ${ev.sample?.preview || 'N/A'}`);
          });
        }
        
        if (inboundMsgs.length > 0) {
          console.log(`\n✅ PROCESSED MESSAGE RECEIVED`);
          inboundMsgs.forEach((msg) => {
            console.log(`   📥 Time: ${msg.createdAt.toISOString()}`);
            console.log(`   📝 Content: "${msg.messageContent}"`);
            console.log(`   📊 Status: ${msg.status}`);
            console.log(`   🔗 Message ID: ${msg.waMessageId}`);
          });
        }
        
        lastCheckTime = new Date();
      }
    } catch (err) {
      console.error('❌ Error checking messages:', err.message);
    }
  };
  
  // Check immediately and then every 2 seconds
  await checkForMessages();
  
  const interval = setInterval(async () => {
    await checkForMessages();
  }, 2000);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    clearInterval(interval);
    await mongoose.disconnect();
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`\n📊 MONITOR STOPPED`);
    console.log(`   Total messages received: ${messageCount}`);
    console.log(`   Duration: ${Math.round((new Date() - new Date(lastCheckTime)) / 1000)} seconds\n`);
    process.exit(0);
  });
}

monitorMessages().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});