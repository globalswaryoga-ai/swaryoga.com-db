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
                "from": "919309986820",
                "id": "wamid.test." + Date.now(),
                "timestamp": String(Math.floor(Date.now() / 1000)),
                "type": "text",
                "text": {
                  "body": "Test from 9309986820 - " + new Date().toISOString()
                }
              }
            ]
          }
        }
      ]
    }
  ]
};

console.log('📤 Sending webhook...');
console.log('📱 From:', testMessage.entry[0].changes[0].value.messages[0].from);
console.log('💬 Message:', testMessage.entry[0].changes[0].value.messages[0].text.body);

(async () => {
  try {
    const response = await fetch('https://crm.swaryoga.com/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });
    
    console.log('\n✅ Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
