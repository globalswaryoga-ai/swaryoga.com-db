#!/usr/bin/env node

(async () => {
  try {
    const mongoose = require('mongoose');
    
    const MONGODB_URI = process.env.MONGODB_URI_MAIN || 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';
    const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    // Import the model getters
    const { getBroadcastRunMessage, getWhatsAppMessage, getBroadcastRun } = await import('../lib/schemas/enterpriseSchemas.js');
    
    const BroadcastRunMessage = getBroadcastRunMessage();
    const WhatsAppMessage = getWhatsAppMessage();
    const BroadcastRun = getBroadcastRun();
    
    console.log('\n📊 Broadcast Delivery Analysis\n');
    
    // Get the most recent broadcast run
    const latestRun = await BroadcastRun.findOne({ status: { $in: ['completed', 'running'] } })
      .sort({ createdAt: -1 })
      .lean();
    
    if (!latestRun) {
      console.log('❌ No broadcast runs found');
      process.exit(0);
    }
    
    console.log(`📢 Latest Broadcast Run: ${latestRun._id}`);
    console.log(`Status: ${latestRun.status}`);
    console.log(`Created: ${latestRun.createdAt}`);
    console.log(`Stats:`, latestRun.stats);
    
    // Get broadcast messages
    const messages = await BroadcastRunMessage.find({ runId: latestRun._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    console.log(`\n📨 Latest 10 Messages in Run:\n`);
    
    for (const msg of messages) {
      console.log(`─ ID: ${msg._id}`);
      console.log(`  Phone: ${msg.phoneNumber}`);
      console.log(`  Status: ${msg.status}`);
      console.log(`  waMessageId: ${msg.waMessageId || '(null)'}`);
      console.log(`  WhatsApp Msg ID: ${msg.whatsappMessageId || '(null)'}`);
      if (msg.failureReason) console.log(`  Failure: ${msg.failureReason}`);
      
      // Check corresponding WhatsAppMessage
      if (msg.whatsappMessageId) {
        const whatsappMsg = await WhatsAppMessage.findById(msg.whatsappMessageId).lean();
        if (whatsappMsg) {
          console.log(`  WhatsApp Status: ${whatsappMsg.status}`);
          console.log(`  Delivered At: ${whatsappMsg.deliveredAt ? '✓' : '✗'}`);
        }
      }
      console.log();
    }
    
    // Check for messages with undefined waMessageId
    const invalidMessages = await BroadcastRunMessage.find({
      runId: latestRun._id,
      $or: [
        { waMessageId: null },
        { waMessageId: undefined },
        { waMessageId: '' }
      ]
    }).lean();
    
    if (invalidMessages.length > 0) {
      console.log(`\n⚠️  ISSUE DETECTED: ${invalidMessages.length} messages with undefined waMessageId`);
      console.log('These messages cannot receive delivery updates from Meta webhooks!');
      console.log('Status breakdown:');
      const statusCounts = {};
      invalidMessages.forEach(m => {
        statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
      });
      console.log(JSON.stringify(statusCounts, null, 2));
    }
    
    // Check for messages marked as sent but never delivered
    const sentButNotDelivered = await BroadcastRunMessage.find({
      runId: latestRun._id,
      status: 'sent',
      deliveredAt: null
    }).lean();
    
    if (sentButNotDelivered.length > 0) {
      console.log(`\n⚠️  ${sentButNotDelivered.length} messages marked as SENT but not DELIVERED`);
      console.log('This usually means:');
      console.log('- Webhooks are not receiving delivery updates');
      console.log('- Phone numbers might be invalid');
      console.log('- Messages might be queued by WhatsApp');
    }
    
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();

