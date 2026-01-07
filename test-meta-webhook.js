const crypto = require('crypto');
require('dotenv').config();

// Meta webhook test payload
const payload = {
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: "919999999999",
          id: "wamid.test.meta.123456",
          timestamp: String(Math.floor(Date.now() / 1000)),
          text: { body: "Test message from Meta API - Jan 7 2026" },
          type: "text"
        }],
        metadata: {
          phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || "7337883031",
          display_phone_number: "+91-9999999999"
        }
      }
    }]
  }]
};

const payloadStr = JSON.stringify(payload);
const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

// Compute signature
const signature = 'sha256=' + crypto
  .createHmac('sha256', appSecret)
  .update(payloadStr)
  .digest('hex');

console.log('\n📤 META WEBHOOK TEST PAYLOAD\n');
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('\n✅ Computed Signature:', signature);
console.log('✅ App Secret (first 20 chars):', appSecret?.substring(0, 20) + '...');

// Test endpoint
const testEndpoint = 'http://localhost:3000/api/whatsapp/webhook';
console.log('\n🧪 Test Setup:');
console.log('  Endpoint:', testEndpoint);
console.log('  Method: POST');
console.log('  Header: X-Hub-Signature-256:', signature);
console.log('  Phone from:', payload.entry[0].changes[0].value.messages[0].from);
console.log('  Message:', payload.entry[0].changes[0].value.messages[0].text.body);

console.log('\n💡 To test manually, run:');
console.log(`
curl -X POST ${testEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-Hub-Signature-256: ${signature}" \\
  -d '${payloadStr}'
`);

