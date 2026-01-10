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

async function checkMessages() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb(CRM_DB);
    const collection = db.collection('whatsapp_messages');

    console.log('--- Checking Messages for 919075358557 ---');
    const msgs = await collection.find({
        phoneNumber: '919075358557'
    }).sort({ sentAt: -1 }).limit(10).toArray();
    
    msgs.forEach(m => {
        console.log(`[${m.sentAt?.toLocaleString()}] ${m.direction}: ${m.messageContent} | ID: ${m.waMessageId}`);
    });

    if (msgs.length === 0) {
        console.log('No messages found.');
    }

    process.exit(0);
}

checkMessages().catch(console.error);
