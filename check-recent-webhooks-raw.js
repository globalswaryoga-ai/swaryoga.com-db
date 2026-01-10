const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually load .env since dotenv might not be global
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
    });
}

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function checkEvents() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not found in env');
        process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb(CRM_DB);
    const collection = db.collection('whatsapp_webhook_events');

    console.log('--- Checking Latest Webhook Events (Top 50) ---');
    const events = await collection.find({}).sort({ receivedAt: -1 }).limit(50).toArray();
    
    events.forEach(e => {
        const time = e.receivedAt ? e.receivedAt.toLocaleString() : 'N/A';
        const url = e.sample?.url || 'N/A';
        const ua = e.sample?.userAgent || 'N/A';
        if (url.includes('localhost')) return; // Skip simulations
        
        console.log(`[${time}] Kind: ${e.kind} | URL: ${url} | UA: ${ua} | Msg: ${e.message || 'N/A'}`);
        if (e.sample && e.kind === 'unknown') {
            console.log('Sample Preview:', JSON.stringify(e.sample).substring(0, 300));
        }
    });

    process.exit(0);
}

checkEvents().catch(console.error);

