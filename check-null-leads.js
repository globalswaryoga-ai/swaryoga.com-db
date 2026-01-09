const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkNullLeads() {
    try {
        const uri = process.env.MONGODB_URI_MAIN;
        await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
        
        const WhatsAppMessage = mongoose.connection.collection('whatsapp_messages');
        
        const nullLeadMessages = await WhatsAppMessage.find({ leadId: null }).sort({ sentAt: -1 }).limit(10).toArray();
        console.log(`Found ${nullLeadMessages.length} messages with null leadId:`);
        nullLeadMessages.forEach(m => {
            console.log(`- [${m.sentAt}] Direction: ${m.direction}, Phone: ${m.phoneNumber}, Text: ${m.messageContent}`);
        });

        const missingLeadMessages = await WhatsAppMessage.find({ leadId: { $exists: false } }).sort({ sentAt: -1 }).limit(10).toArray();
        console.log(`\nFound ${missingLeadMessages.length} messages missing leadId field:`);
        missingLeadMessages.forEach(m => {
            console.log(`- [${m.sentAt}] Direction: ${m.direction}, Phone: ${m.phoneNumber}, Text: ${m.messageContent}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNullLeads();
