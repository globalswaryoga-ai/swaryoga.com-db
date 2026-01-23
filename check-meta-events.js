const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const mongoose = require('mongoose');

(async () => {
  try {
    if (!process.env.MONGODB_URI_MAIN) {
      throw new Error('MONGODB_URI_MAIN not set in .env.local');
    }
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    
    console.log('📊 META CLOUD API - RECENT ACTIVITY CHECK\n');
    
    // Check webhook events
    const webhookCollection = db.collection('whatsapp_webhook_events');
    const recentWebhooks = await webhookCollection
      .find({ source: 'meta' })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log('🔔 WEBHOOK EVENTS (Last 10):');
    if (recentWebhooks.length === 0) {
      console.log('  ❌ NO EVENTS FOUND');
    } else {
      recentWebhooks.forEach((evt, i) => {
        console.log(`  ${i+1}. ${evt.kind} - ${evt.message}`);
        console.log(`     Time: ${new Date(evt.createdAt).toLocaleString()}`);
        if (evt.sample?.error) console.log(`     Error: ${evt.sample.error}`);
      });
    }

    // Check inbound messages
    const msgCollection = db.collection('whatsapp_messages');
    const recentMsgs = await msgCollection
      .find({ direction: 'inbound', provider: 'meta' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n📩 INBOUND MESSAGES (Last 5):');
    if (recentMsgs.length === 0) {
      console.log('  ❌ NO INBOUND MESSAGES FOUND');
    } else {
      recentMsgs.forEach((msg, i) => {
        console.log(`  ${i+1}. From: ${msg.phoneNumber}`);
        console.log(`     Message: ${msg.messageContent?.substring(0, 50)}`);
        console.log(`     Time: ${new Date(msg.createdAt).toLocaleString()}`);
      });
    }

    // Check counts
    const totalWebhooks = await webhookCollection.countDocuments({ source: 'meta' });
    const totalInbound = await msgCollection.countDocuments({ direction: 'inbound', provider: 'meta' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayInbound = await msgCollection.countDocuments({ 
      direction: 'inbound', 
      provider: 'meta',
      createdAt: { $gte: today }
    });

    console.log('\n📈 STATISTICS:');
    console.log(`  Total webhook events: ${totalWebhooks}`);
    console.log(`  Total inbound messages: ${totalInbound}`);
    console.log(`  Today's inbound messages: ${todayInbound}`);

    if (totalWebhooks === 0) {
      console.log('\n⚠️  NO WEBHOOK EVENTS FOUND!');
      console.log('   This means Meta is NOT calling your webhook endpoint.');
      console.log('   Check:');
      console.log('   1. Meta Dashboard → WhatsApp Configuration');
      console.log('   2. Webhook URL: https://crm.swaryoga.com/api/whatsapp/webhook');
      console.log('   3. Verify Token matches WHATSAPP_WEBHOOK_VERIFY_TOKEN');
      console.log('   4. "messages" is checked in Subscribe Fields');
    } else if (totalInbound === 0 && totalWebhooks > 0) {
      console.log('\n⚠️  WEBHOOK EVENTS RECEIVED BUT NO MESSAGES STORED!');
      console.log('   Check webhook handler logs for errors');
    } else {
      console.log('\n✅ System is receiving and storing inbound messages!');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();
