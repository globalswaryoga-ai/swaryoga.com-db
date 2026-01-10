const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

async function checkPhoneEvents() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb(CRM_DB);
    const collection = db.collection('whatsapp_webhook_events');

    console.log('--- Checking Events for 9075358557 ---');
    const events = await collection.find({
        $or: [
            { phoneNumber: '919075358557' },
            { phoneNumber: '9075358557' },
            { message: { $regex: '9075358557' } }
        ]
    }).sort({ receivedAt: -1 }).toArray();
    
    events.forEach(e => {
        console.log(`[${e.receivedAt?.toLocaleString()}] Kind: ${e.kind} | Phone: ${e.phoneNumber} | Msg: ${e.message}`);
    });

    if (events.length === 0) {
        console.log('No events found for this phone number.');
    }

    process.exit(0);
}

checkPhoneEvents().catch(console.error);
