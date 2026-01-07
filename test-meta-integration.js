const crypto = require('crypto');
const http = require('http');
require('dotenv').config();

async function testMetaWebhook() {
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: "919999999999",
            id: "wamid.test.meta." + Date.now(),
            timestamp: String(Math.floor(Date.now() / 1000)),
            text: { body: "Test message from Meta API - Jan 7 2026" },
            type: "text"
          }],
          metadata: {
            phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
            display_phone_number: "+91-9999999999"
          }
        }
      }]
    }]
  };

  const payloadStr = JSON.stringify(payload);
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  
  const signature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(payloadStr)
    .digest('hex');

  console.log('\n🧪 Testing Meta Webhook...\n');
  console.log('📨 Sending message to: http://localhost:3000/api/whatsapp/webhook');
  console.log('📱 From phone: 919999999999');
  console.log('💬 Message: "Test message from Meta API - Jan 7 2026"');

  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/whatsapp/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
        'Content-Length': Buffer.byteLength(payloadStr)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n✅ Response Status:', res.statusCode);
        console.log('📋 Response Body:', data);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('\n✅ WEBHOOK TEST PASSED');
          console.log('   Message accepted by Meta webhook handler');
        } else {
          console.log('\n❌ WEBHOOK TEST FAILED');
          console.log('   Check if server is running on port 3000');
        }
        
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log('\n❌ CONNECTION ERROR:', err.message);
      console.log('   Make sure dev server is running: npm run dev');
      resolve();
    });

    req.write(payloadStr);
    req.end();
  });
}

testMetaWebhook();
