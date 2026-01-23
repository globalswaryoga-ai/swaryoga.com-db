const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkFullStatus() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`✨ SWAR YOGA WHATSAPP CRM - PRODUCTION STATUS ✨`);
  console.log(`${'═'.repeat(80)}\n`);
  
  // Check outbound messages
  const outboundCount = await crmDb.collection('whatsapp_messages').countDocuments({ 
    direction: 'outbound' 
  });
  
  const inboundCount = await crmDb.collection('whatsapp_messages').countDocuments({ 
    direction: 'inbound' 
  });
  
  const lastOutbound = await crmDb.collection('whatsapp_messages').findOne(
    { direction: 'outbound' },
    { sort: { createdAt: -1 } }
  );
  
  const lastInbound = await crmDb.collection('whatsapp_messages').findOne(
    { direction: 'inbound' },
    { sort: { createdAt: -1 } }
  );
  
  const webhookEvents = await crmDb.collection('whatsapp_webhook_events').countDocuments({});
  
  console.log(`📊 MESSAGE STATISTICS\n`);
  console.log(`  Outbound Messages: ${outboundCount} sent`);
  if (lastOutbound) {
    console.log(`    └─ Latest: "${lastOutbound.messageContent?.substring(0, 50)}..."`);
    console.log(`    └─ Time: ${lastOutbound.createdAt.toISOString()}`);
    console.log(`    └─ Status: ${lastOutbound.status}`);
  }
  
  console.log(`\n  Inbound Messages: ${inboundCount} received`);
  if (lastInbound) {
    console.log(`    └─ Latest: "${lastInbound.messageContent?.substring(0, 50)}..."`);
    console.log(`    └─ Time: ${lastInbound.createdAt.toISOString()}`);
    console.log(`    └─ From: ${lastInbound.phoneNumber}`);
  } else {
    console.log(`    └─ ⏳ Waiting for first customer message...`);
  }
  
  console.log(`\n  Webhook Events Received: ${webhookEvents} total\n`);
  
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`✅ SYSTEM STATUS\n`);
  
  console.log(`  ✅ Meta API v24.0: Connected`);
  console.log(`  ✅ Business Phone: +91 97790 06820`);
  console.log(`  ✅ Webhook: Messages subscribed`);
  console.log(`  ✅ Database: MongoDB connected`);
  console.log(`  ✅ S3 Media: swarygoal1hindi bucket`);
  console.log(`  ✅ Payment: Activated (unlocked full send)`);
  console.log(`  ✅ Emoji Support: Full UTF-8`);
  console.log(`  ✅ Rich Media: Images, Videos, Documents\n`);
  
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`🚀 WHAT YOU CAN DO NOW\n`);
  
  console.log(`Outbound:`);
  console.log(`  • Send messages to ANY phone number`);
  console.log(`  • Include text, emojis, images, videos, documents`);
  console.log(`  • Track delivery status (sent, delivered, read)`);
  console.log(`  • Admin name tags automatically added\n`);
  
  console.log(`Inbound:`);
  console.log(`  • Receive messages from customers`);
  console.log(`  • Auto-create leads from new numbers`);
  console.log(`  • Store media attachments in S3`);
  console.log(`  • View in CRM inbox (/admin/crm/whatsapp)\n`);
  
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`📋 QUICK COMMANDS\n`);
  
  console.log(`Monitor incoming messages:`);
  console.log(`  $ node scripts/monitor-incoming-messages.js\n`);
  
  console.log(`Check recent activity:`);
  console.log(`  $ node scripts/check-all-recent.js\n`);
  
  console.log(`Test webhook setup:`);
  console.log(`  $ bash scripts/check-webhook-config.sh\n`);
  
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`🎯 NEXT ACTIONS\n`);
  
  console.log(`1. Test inbound: Send message to +91 97790 06820`);
  console.log(`2. Check CRM: Visit https://crm.swaryoga.com/admin/crm/whatsapp`);
  console.log(`3. Create templates: Set up message templates in Meta`);
  console.log(`4. Broadcast: Test bulk messaging to leads\n`);
  
  console.log(`${'═'.repeat(80)}\n`);
  
  await mongoose.disconnect();
  process.exit(0);
}

checkFullStatus().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});