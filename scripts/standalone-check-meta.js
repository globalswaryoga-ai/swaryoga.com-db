const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function check() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  try {
    console.log('Connecting to:', MONGODB_URI.split('@')[1] || 'URI hidden');
    // Connect to the Atlas cluster
    await mongoose.connect(MONGODB_URI);
    
    // Switch to CRM database
    const db = mongoose.connection.useDb(CRM_DB_NAME);
    const Schema = mongoose.Schema;
    
    console.log('Connected to DB:', CRM_DB_NAME);

    const EventSchema = new Schema({}, { strict: false, collection: 'whatsapp_webhook_events' });
    const Event = db.model('Event', EventSchema);
    
    const inbounds = await Event.countDocuments({ kind: 'inbound_message' });
    const recent = await Event.find({ kind: 'inbound_message' }).sort({ receivedAt: -1 }).limit(10).lean();
    
    const MessageSchema = new Schema({}, { strict: false, collection: 'whatsapp_messages' });
    const Message = db.model('Message', MessageSchema);
    const messageCount = await Message.countDocuments({ direction: 'inbound' });
    const recentMessages = await Message.find({ direction: 'inbound' }).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log('\n--- INBOUND WEBHOOK EVENTS (whatsapp_webhook_events) ---');
    console.log('Count:', inbounds);
    console.log('Recent 10 Events:');
    recent.forEach(e => {
        console.log(`- [${new Date(e.receivedAt).toLocaleString()}] Phone: ${e.phoneNumber} | Msg: ${e.message}`);
    });
    
    console.log('\n--- INBOUND DATABASE MESSAGES (whatsapp_messages) ---');
    console.log('Count:', messageCount);
    console.log('Recent 10 Messages:');
    recentMessages.forEach(m => {
        console.log(`- [${new Date(m.createdAt).toLocaleString()}] From: ${m.phoneNumber} | Content: ${m.messageContent?.substring(0, 50)} | Provider: ${m.provider}`);
    });
    
    process.exit(0);
  } catch (err) {
      console.error('ERROR:', err);
      process.exit(1);
  }
}
check();
