const http = require('http');
const crypto = require('crypto');

const PHONE_NUMBER_ID = '733788303156745';
const META_APP_SECRET = '94d214b93b4586f8d2aada3bf9c0ad92';

const testPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '919779006820',
              phone_number_id: PHONE_NUMBER_ID,
            },
            messages: [
              {
                from: '919779006820',
                id: 'wamid.local' + Date.now(),
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: 'text',
                text: {
                  body: 'Test message ' + Date.now(),
                },
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

const payload = JSON.stringify(testPayload);
const signature = crypto
  .createHmac('sha256', META_APP_SECRET)
  .update(payload)
  .digest('hex');

console.log('📤 Testing LOCAL dev server (localhost:3000)\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/whatsapp/webhook',
  method: 'POST',
  headers: {
    'X-Hub-Signature-256': `sha256=${signature}`,
    'Content-Type': 'application/json',
    'Content-Length': payload.length,
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`✅ Response Status: ${res.statusCode}`);
    console.log(`Response Body: ${data}\n`);
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(payload);
req.end();
