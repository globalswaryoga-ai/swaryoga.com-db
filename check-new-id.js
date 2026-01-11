require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkNewIdEvents() {
    const mongoUri = process.env.MONGODB_URI_MAIN;
    const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    const newPhoneId = '908501635686772';

    try {
        await mongoose.connect(mongoUri);
        const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
        
        console.log(`🔍 Searching for events related to Phone ID: ${newPhoneId}...`);
        
        const events = await crmDb.collection('whatsapp_webhook_events')
            .find({ 
                $or: [
                    { "payload.entry.id": newPhoneId },
                    { "metadata.phone_number_id": newPhoneId },
                    { "message": new RegExp(newPhoneId) }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();

        if (events.length === 0) {
            console.log('❌ No events found for the new Phone ID yet.');
        } else {
            console.log(`✅ Found ${events.length} events:`);
            events.forEach((ev, i) => {
                console.log(`[${i+1}] ${ev.type} | ${ev.createdAt}`);
                console.log(`    Message: ${ev.message}`);
            });
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkNewIdEvents();
