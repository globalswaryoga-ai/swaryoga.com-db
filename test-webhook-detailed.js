const https = require('https');
const crypto = require('crypto');

// Use the exact values from your .env
const PHONE_NUMBER_ID = '733788303156745';
const META_APP_SECRET = '94d214b93b4586f8d2aada3bf9c0ad92';
const VERIFY_TOKEN = 'ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d';

// Create a test webhook payload exactly as Meta would send it
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
                id: 'wamid.test123456',
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: 'text',
                text: {
                  body: 'Hello from test script!',
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

// Generate the signature exactly as Meta does
const payload = JSON.stringify(testPayload);
const signature = crypto
  .createHmac('sha256', META_APP_SECRET)
  .update(payload)
  .digest('hex');

console.log('════════════════════════════════════════════');
console.log('📤 SENDING TEST WEBHOOK TO PRODUCTION');
console.log('════════════════════════════════════════════\n');

console.log('🔐 Signature:', signature);
console.log('📞 Phone Number ID:', PHONE_NUMBER_ID);
console.log('📱 From Number:', '919779006820');
console.log('📨 Message:', 'Hello from test script!');
console.log('🌍 URL: https://crm.swaryoga.com/api/whatsapp/webhook\n');

const options = {
  hostname: 'crm.swaryoga.com',
  path: '/api/whatsapp/webhook',
  method: 'POST',
  headers: {
    'X-Hub-Signature-256': `sha256=${signature}`,
    'Content-Type': 'application/json',
    'Content-Length': payload.length,
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n✅ Response Status: ${res.statusCode}`);
    console.log(`Response Body: ${data}\n`);

    if (res.statusCode === 200) {
      console.log('✅ WEBHOOK ACCEPTED!');
      console.log('\n🔍 NOW CHECKING DATABASE...\n');

      // Wait 2 seconds then check database
      setTimeout(() => {
        require('child_process').exec(
          'node check-webhook-events.js',
          (err, stdout) => {
            if (err) {
              console.error('Error:', err);
              return;
            }
            console.log(stdout);
          }
        );
      }, 2000);
    } else {
      console.log('❌ WEBHOOK FAILED!');
      console.log('This could be a signature verification issue');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.write(payload);
req.end();
