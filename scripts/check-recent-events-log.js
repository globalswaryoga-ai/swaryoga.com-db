const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkEvents() {
    const uri = process.env.MONGODB_URI_MAIN;
    const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('whatsapp_webhook_events');
        
        console.log('Checking recent webhook events...');
        const recent = await collection.find({}).sort({ receivedAt: -1 }).limit(15).toArray();
        
        if (recent.length === 0) {
            console.log('No webhook events found.');
        } else {
            recent.forEach(ev => {
                const sampleStr = ev.sample ? JSON.stringify(ev.sample) : 'NO_SAMPLE';
                console.log(`[${ev.receivedAt}] Kind: ${ev.kind} - Msg: ${ev.message} - Sample: ${sampleStr.substring(0, 200)}...`);
            });
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkEvents();
