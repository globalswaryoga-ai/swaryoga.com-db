const { sendWhatsAppText } = require('./lib/whatsapp');
require('dotenv').config({ path: '.env.local' });

async function testSend() {
    const to = '919309986820';
    const message = 'Test from internal audit at ' + new Date().toISOString();
    
    console.log(`Sending to ${to}...`);
    try {
        const result = await sendWhatsAppText(to, message);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testSend();
