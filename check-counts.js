const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkLeads() {
    const uri = process.env.MONGODB_URI_MAIN;
    if (!uri) {
        console.error('❌ MONGODB_URI_MAIN not found in .env.local');
        return;
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Check swaryogaDB
        const swaryogaDB = mongoose.connection.useDb('swaryogaDB');
        const countSwaryoga = await swaryogaDB.collection('leads').countDocuments();
        console.log(`📊 leads in swaryogaDB: ${countSwaryoga}`);

        // Check swaryoga_admin_crm
        const crmDB = mongoose.connection.useDb('swaryoga_admin_crm');
        const countCrm = await crmDB.collection('leads').countDocuments();
        console.log(`📊 leads in swaryoga_admin_crm: ${countCrm}`);
        
        // Also check whatsapp messages
        const msgsSwaryoga = await swaryogaDB.collection('whatsappmessages').countDocuments();
        console.log(`📊 whatsappmessages in swaryogaDB: ${msgsSwaryoga}`);
        
        const msgsCrm = await crmDB.collection('whatsappmessages').countDocuments();
        console.log(`📊 whatsappmessages in swaryoga_admin_crm: ${msgsCrm}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

checkLeads();
