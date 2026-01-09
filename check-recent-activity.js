const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkRecentActivity() {
    try {
        const uri = process.env.MONGODB_URI_MAIN;
        const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
        
        console.log(`Connecting to ${dbName}...`);
        await mongoose.connect(uri, { dbName });
        
        const db = mongoose.connection.useDb('swaryoga_admin_crm');
        const collection = db.collection('whatsapp_webhook_events');
        
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const count = await collection.countDocuments({ receivedAt: { $gt: twentyFourHoursAgo } });
        console.log(`Webhook events in last 24 hours: ${count}`);
        
        const latest = await collection.find({}).sort({ receivedAt: -1 }).limit(5).toArray();
        console.log('Latest 5 events:');
        latest.forEach(ev => {
            console.log(`- [${ev.receivedAt}] Kind: ${ev.kind}, OK: ${ev.ok}, Msg: ${ev.message}`);
            if (ev.sample) {
                console.log(`  Sample: ${JSON.stringify(ev.sample).substring(0, 200)}...`);
            }
        });

        const messagesColl = db.collection('whatsapp_messages');
        const msgCount = await messagesColl.countDocuments({ createdAt: { $gt: twentyFourHoursAgo } });
        console.log(`\nWhatsApp messages in last 24 hours: ${msgCount}`);
        
        const latestMsgs = await messagesColl.find({ direction: 'inbound' }).sort({ createdAt: -1 }).limit(10).toArray();
        console.log('Latest 10 INBOUND messages:');
        const leadsColl = db.collection('leads');
        
        for (const m of latestMsgs) {
            const lead = await leadsColl.findOne({ _id: m.leadId });
            console.log(`\nMessage: ${m.messageContent}`);
            if (lead) {
                console.log(`Lead Name: ${lead.name}, Phone: ${lead.phoneNumber}, AssignedTo: ${lead.assignedToUserId}`);
            } else {
                console.log(`❌ LEAD NOT FOUND for leadId: ${m.leadId}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRecentActivity();
