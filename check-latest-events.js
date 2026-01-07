require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

async function check() {
  try {
    await mongoose.connect(mongoUri, { dbName: 'swaryogaDB' });

    const WhatsAppWebhookEventSchema = new mongoose.Schema(
      {
        kind: String,
        ok: Boolean,
        message: String,
        phoneNumber: String,
        receivedAt: Date,
      },
      { collection: 'whatsappwebhookevents' }
    );

    const WhatsAppWebhookEvent = mongoose.model('WhatsAppWebhookEvent', WhatsAppWebhookEventSchema);

    const events = await WhatsAppWebhookEvent.find({}).sort({ receivedAt: -1 }).limit(10).lean();

    console.log('\n🔔 LATEST WEBHOOK EVENTS:');
    console.log(`Total events: ${events.length}\n`);
    
    events.forEach((evt, i) => {
      const time = new Date(evt.receivedAt).toISOString();
      console.log(`[${i+1}] ${evt.kind.padEnd(15)} | ${evt.ok ? '✅' : '❌'} | ${time}`);
      if (evt.message) console.log(`    Message: ${evt.message}`);
      if (evt.phoneNumber) console.log(`    Phone: ${evt.phoneNumber}`);
      console.log();
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
