
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function check() {
    try {
        console.log(`Connecting to ${crmDbName}...`);
        await mongoose.connect(uri, { dbName: crmDbName });
        
        const WebhookEvent = mongoose.connection.collection('whatsapp_webhook_events');
        const count = await WebhookEvent.countDocuments();
        console.log(`\nTotal Webhook Events: ${count}`);
        
        const lastEvents = await WebhookEvent.find()
            .sort({ receivedAt: -1, _id: -1 })
            .limit(10)
            .toArray();
            
        console.log("\n--- LATEST WEBHOOK EVENTS ---");
        lastEvents.forEach(e => {
            console.log(`[${e.receivedAt || e.createdAt}] ${e.kind} | ok: ${e.ok} | msg: ${e.message || 'n/a'}`);
        });

        const WhatsAppMessage = mongoose.connection.collection('whatsapp_messages');
        const lastMessages = await WhatsAppMessage.find({ direction: 'inbound' })
            .sort({ sentAt: -1, _id: -1 })
            .limit(5)
            .toArray();
            
        console.log("\n--- LATEST INBOUND MESSAGES ---");
        lastMessages.forEach(m => {
            console.log(`[${m.sentAt}] From: ${m.phoneNumber} | Content: ${m.messageContent?.substring(0, 50)}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
