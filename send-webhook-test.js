#!/usr/bin/env node
const https = require('https');

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '919876543210',
              phone_number_id: 'test_id',
              timestamp: String(Date.now() / 1000 | 0),
            },
            messages: [
              {
                from: '919309986820',
                id: `msg_${Date.now()}`,
                timestamp: String(Date.now() / 1000 | 0),
                type: 'text',
                text: {
                  body: `Test message ${new Date().toISOString()}`
                }
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 'crm.swaryoga.com',
  port: 443,
  path: '/api/whatsapp/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Response:', data);
    console.log('📍 Status:', res.statusCode);
    console.log('\n⏳ Waiting 5 seconds for database write...\n');
    setTimeout(() => process.exit(0), 5000);
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});

console.log('📤 Sending test webhook to crm.swaryoga.com...');
req.write(postData);
req.end();
