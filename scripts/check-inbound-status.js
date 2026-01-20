
const mongoose = require('mongoose');

const MONGODB_URI_MAIN = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';
const CRM_DB_NAME = 'swaryoga_admin_crm';

async function checkRecentWebhookData() {
    try {
        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(MONGODB_URI_MAIN, {
            dbName: CRM_DB_NAME
        });
        console.log('Connected.');

        const WebhookEvent = mongoose.connection.db.collection('whatsapp_webhook_events');
        const Messages = mongoose.connection.db.collection('whatsapp_messages');

        console.log('\n--- Recent Webhook Events (last 10) ---');
        const events = await WebhookEvent.find({}).sort({ receivedAt: -1 }).limit(10).toArray();
        events.forEach(e => {
            console.log(`[${e.receivedAt.toISOString()}] ${e.kind} | ok: ${e.ok} | msg: ${e.message} | phone: ${e.phoneNumber}`);
            if (!e.ok) {
                console.log('  Payload:', JSON.stringify(e.sample, null, 2));
            }
        });

        console.log('\n--- Recent Inbound Messages (last 10) ---');
        const inboundMsgs = await Messages.find({ direction: 'inbound' }).sort({ sentAt: -1 }).limit(10).toArray();
        inboundMsgs.forEach(m => {
            console.log(`[${m.sentAt.toISOString()}] From: ${m.phoneNumber} | content: ${m.messageContent} | provider: ${m.provider}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkRecentWebhookData();
