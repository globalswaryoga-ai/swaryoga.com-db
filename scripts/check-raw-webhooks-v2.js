
const mongoose = require('mongoose');

const MONGODB_URI_MAIN = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';
const CRM_DB_NAME = 'swaryoga_admin_crm';

async function checkRawPosts() {
    try {
        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(MONGODB_URI_MAIN, {
            dbName: CRM_DB_NAME
        });
        console.log('Connected.');

        const WebhookEvent = mongoose.connection.db.collection('whatsapp_webhook_events');

        console.log('\n--- Recent RAW_POST_RECEIVED Events (last 5) ---');
        const rawPosts = await WebhookEvent.find({ message: 'RAW_POST_RECEIVED' }).sort({ receivedAt: -1 }).limit(5).toArray();
        if (rawPosts.length === 0) console.log('None found.');
        rawPosts.forEach(e => {
            console.log(`[${e.receivedAt.toISOString()}] RAW POST | Body Length: ${e.sample?.rawBodyLength}`);
            // console.log('Body Preview:', e.sample?.rawBodyPreview?.substring(0, 500));
        });

        console.log('\n--- Recent POST_HEALTH_PING Events (last 5) ---');
        const pings = await WebhookEvent.find({ message: 'POST_HEALTH_PING' }).sort({ receivedAt: -1 }).limit(5).toArray();
        if (pings.length === 0) console.log('None found.');
        pings.forEach(e => {
            console.log(`[${e.receivedAt.toISOString()}] PING | UserAgent: ${e.sample?.userAgent}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkRawPosts();
