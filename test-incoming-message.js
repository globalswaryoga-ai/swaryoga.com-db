const crypto = require('crypto');

// Simulate a WhatsApp incoming message from Meta
const testMessage = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "919876543210",
              "phone_number_id": "1234567890"
            },
            "messages": [
              {
                "from": "919779006820",
                "id": "wamid.test.incoming." + Date.now() + "." + Math.random().toString(36).substr(2, 9),
                "timestamp": String(Math.floor(Date.now() / 1000)),
                "type": "text",
                "text": {
                  "body": "Test incoming message from webhook - " + new Date().toISOString()
                }
              }
            ]
          }
        }
      ]
    }
  ]
};

const webhookUrl = 'https://crm.swaryoga.com/api/whatsapp/webhook';

console.log('🚀 Sending test incoming message to:', webhookUrl);
console.log('📦 Message body:', testMessage.entry[0].changes[0].value.messages[0].text.body);

(async () => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    const data = await response.json();
    console.log('✅ Response status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
