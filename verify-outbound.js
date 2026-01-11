require('dotenv').config({ path: '.env.local' });
const { sendWhatsAppText } = require('./lib/whatsapp');

async function testOutbound() {
    const testRecipient = '919779006820'; // User's phone
    const message = `Swar Yoga System Update: Outbound messaging is now active on the new Phone ID. Timestamp: ${new Date().toISOString()}`;
    
    console.log(`🚀 Sending test message to ${testRecipient}...`);
    console.log(`Using Phone ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
    
    try {
        const result = await sendWhatsAppText(testRecipient, message);
        console.log('✅ Success! Message sent.');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Failed to send message:', error.message);
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Full Error:', error);
        }
    }
}

testOutbound();
