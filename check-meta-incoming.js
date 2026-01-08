require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;
// Use CRM DB if defined, else fallback to standard
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryogaDB';

async function checkMetaMessages() {
  try {
    console.log(`🔍 Connecting to ${crmDbName}...`);
    await mongoose.connect(mongoUri, { dbName: crmDbName });

    // Define schema to match our implementation
    const schema = new mongoose.Schema({
      phoneNumber: String,
      direction: String,
      messageContent: String,
      provider: String,
      senderNumber: String,
      waMessageId: String,
      sentAt: Date,
      createdAt: Date,
    }, { collection: 'whatsapp_messages', timestamps: true });

    const WhatsAppMessage = mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', schema);

    // Event log schema
    const eventSchema = new mongoose.Schema({
      kind: String,
      ok: Boolean,
      phoneNumber: String,
      receivedAt: Date,
    }, { collection: 'whatsapp_webhook_events' });

    const WhatsAppWebhookEvent = mongoose.models.WhatsAppWebhookEvent || mongoose.model('WhatsAppWebhookEvent', eventSchema);

    console.log('---------------------------------------------------------');
    console.log('📡 1. SEARCHING FOR RAW META WEBHOOK HITS');
    console.log('---------------------------------------------------------');

    const recentEvents = await WhatsAppWebhookEvent.find({})
      .sort({ receivedAt: -1 })
      .limit(10)
      .lean();

    const errors = await WhatsAppWebhookEvent.find({ kind: 'error' })
      .sort({ receivedAt: -1 })
      .limit(5)
      .lean();

    console.log('\n❌ RECENT ERRORS (Last 5):');
    if (errors.length === 0) {
      console.log('No errors found.');
    } else {
      errors.forEach((err, i) => {
        console.log(`[E-${i+1}] ${err.receivedAt?.toLocaleString()} | ${err.message}`);
        console.log(`     Phone: ${err.phoneNumber || 'N/A'}`);
      });
    }

    console.log('\n---------------------------------------------------------');
    console.log('📁 2. SEARCHING FOR PERSISTED INCOMING META MESSAGES');
    console.log('---------------------------------------------------------');

    // Look for ANY messages in that collection from today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await WhatsAppMessage.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    console.log(`📊 Total messages in "whatsapp_messages" today: ${todayCount}`);

    const allRecent = await WhatsAppMessage.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('\n📜 RECENT 5 MESSAGES (DETAILED):');
    allRecent.forEach((m, i) => {
      console.log(`[R-${i+1}] ID: ${m._id} | ${m.direction} | ${String(m.messageContent || '').substring(0, 20)}...`);
      console.log(`     Phone: ${m.phoneNumber} | waID: ${m.waMessageId}`);
      console.log(`     Provider: ${m.provider} | Sender: ${m.senderNumber}`);
      console.log(`     Created: ${m.createdAt?.toISOString()}`);
      console.log('---');
    });

    const wamidCount = await WhatsAppMessage.countDocuments({
      waMessageId: { $regex: /^wamid/ }
    });

    console.log(`📊 Messages with wamid.* (Meta ID format): ${wamidCount}`);

    const incomingMessages = await WhatsAppMessage.find({
      direction: 'inbound',
      provider: 'meta'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    if (incomingMessages.length === 0) {
      console.log('❌ No recent incoming Meta messages found in "whatsapp_messages".');
      
      // Secondary check: look for ANY incoming messages to see if they are tagged correctly
      const anyIncoming = await WhatsAppMessage.find({ direction: 'inbound' }).limit(1).lean();
      if (anyIncoming.length > 0) {
        console.log('ℹ️ Found other inbound messages, but they lack provider="meta".');
        console.log('Example metadata:', JSON.stringify(anyIncoming[0], null, 2));
      }
    } else {
      console.log(`✅ Found ${incomingMessages.length} recent Meta messages:\n`);
      incomingMessages.forEach((msg, i) => {
        console.log(`[${i+1}] From: ${msg.phoneNumber} | Time: ${msg.createdAt.toLocaleString()}`);
        console.log(`    Content: "${msg.messageContent}"`);
        console.log(`    Provider: ${msg.provider} | via: ${msg.senderNumber || 'unknown'}`);
        console.log(`    ID: ${msg.waMessageId || 'N/A'}`);
        console.log('---------------------------------------------------------');
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Check complete.');
  } catch (err) {
    console.error('❌ Error during check:', err);
    process.exit(1);
  }
}

checkMetaMessages();
