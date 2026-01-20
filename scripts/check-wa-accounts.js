
const mongoose = require('mongoose');

const MONGODB_URI_MAIN = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';
const CRM_DB_NAME = 'swaryoga_admin_crm';

async function checkWhatsAppAccounts() {
    try {
        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(MONGODB_URI_MAIN, {
            dbName: CRM_DB_NAME
        });
        console.log('Connected.');

        const Accounts = mongoose.connection.db.collection('whatsapp_accounts');

        const accounts = await Accounts.find({}).toArray();
        console.log('\n--- WhatsApp Accounts ---');
        accounts.forEach(a => {
            console.log(`- ${a.phoneNumber} | ID: ${a.phoneNumberId} | Status: ${a.status}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkWhatsAppAccounts();
