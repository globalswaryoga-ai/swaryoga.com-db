require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;
const dbName = 'swaryogaDB';

async function check() {
  try {
    await mongoose.connect(mongoUri, { dbName });

    const WhatsAppMessageSchema = new mongoose.Schema(
      {
        leadId: mongoose.Schema.Types.ObjectId,
        phoneNumber: String,
        direction: String,
        messageContent: String,
        sentAt: Date,
      },
      { collection: 'whatsappmessages' }
    );

    const WhatsAppMessage = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);

    const messages = await WhatsAppMessage.find({ phoneNumber: '919779006820' }).sort({ sentAt: -1 }).limit(20).lean();

    console.log('\n📨 Messages for 919779006820:');
    console.log(`Total: ${messages.length}\n`);
    if (messages.length === 0) {
      console.log('❌ NO MESSAGES FOUND');
    } else {
      messages.forEach((msg, i) => {
        console.log(`[${i+1}] ${msg.direction?.toUpperCase()} @ ${new Date(msg.sentAt).toISOString()}`);
        console.log(`    "${msg.messageContent}"\n`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
