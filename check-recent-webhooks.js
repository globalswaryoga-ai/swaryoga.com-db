const mongoose = require('mongoose');

async function checkEvents() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
        const events = await crmDb.collection('whatsapp_webhook_events')
            .find({})
            .sort({ receivedAt: -1 })
            .limit(10)
            .toArray();

        console.log('\n--- LATEST WEBHOOK EVENTS (swaryoga_admin_crm) ---');
        events.forEach(e => {
            console.log(`[${e.receivedAt?.toISOString()}] ${e.kind} | ok: ${e.ok} | phone: ${e.phoneNumber} | msg: ${e.message}`);
            if (e.sample) {
                console.log('Sample:', JSON.stringify(e.sample).substring(0, 100));
            }
            console.log('---');
        });

        const messages = await crmDb.collection('whatsapp_messages')
            .find({ direction: 'inbound' })
            .sort({ sentAt: -1 })
            .limit(5)
            .toArray();

        console.log('\n--- LATEST INBOUND MESSAGES (swaryoga_admin_crm) ---');
        messages.forEach(m => {
            console.log(`[${m.sentAt?.toISOString()}] From: ${m.phoneNumber} | Body: ${m.messageContent}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkEvents();
