const mongoose = require('mongoose');
const path = require('path');
const { connectDB } = require(path.join(__dirname, '../lib/db'));

async function check() {
  try {
    await connectDB();
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    const Schema = mongoose.Schema;
    
    const EventSchema = new Schema({}, { strict: false, collection: 'whatsapp_webhook_events' });
    const Event = db.model('Event', EventSchema);
    
    const inbounds = await Event.countDocuments({ kind: 'inbound_message' });
    const recent = await Event.find({ kind: 'inbound_message' }).sort({ receivedAt: -1 }).limit(10).lean();
    
    const MessageSchema = new Schema({}, { strict: false, collection: 'whatsapp_messages' });
    const Message = db.model('Message', MessageSchema);
    const messageCount = await Message.countDocuments({ direction: 'inbound' });
    const recentMessages = await Message.find({ direction: 'inbound' }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log('--- INBOUND WEBHOOK EVENTS ---');
    console.log('Count:', inbounds);
    console.log('Recent 10 Events:');
    recent.forEach(e => {
        console.log(`- [${e.receivedAt}] Phone: ${e.phoneNumber} | Msg: ${e.message}`);
    });
    
    console.log('\n--- INBOUND DATABASE MESSAGES (WhatsAppMessage) ---');
    console.log('Count:', messageCount);
    console.log('Recent 10 Messages:');
    recentMessages.forEach(m => {
        console.log(`- [${m.createdAt}] From: ${m.phoneNumber} | Content: ${m.messageContent?.substring(0, 50)} | Provider: ${m.provider}`);
    });
    
    process.exit(0);
  } catch (err) {
      console.error(err);
      process.exit(1);
  }
}
check();
