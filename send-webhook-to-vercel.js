#!/usr/bin/env node
/**
 * Send a webhook test with a unique phone number to Vercel
 * and check both databases to see where it was written
 */

const https = require('https');

// Use a unique phone to make it easy to track
const uniquePhone = `1919309986820${Date.now().toString().slice(-5)}`;

const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '999999999999',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            messages: [
              {
                from: uniquePhone.slice(-12), // Last 12 digits (valid phone format)
                id: `wamid.test_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000),
                type: 'text',
                text: {
                  body: `Test from Vercel check at ${new Date().toISOString()}`,
                },
              },
            ],
            contacts: [
              {
                profile: { name: 'Test User' },
                wa_id: uniquePhone.slice(-12),
              },
            ],
            metadata: {
              display_phone_number: '919309986821',
              phone_number_id: 'test123',
              business_account_id: 'test456',
            },
          },
        },
      ],
    },
  ],
});

const options = {
  hostname: 'crm.swaryoga.com',
  path: '/api/whatsapp/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log(`\n📤 Sending test webhook to Vercel`);
console.log(`   Phone: ${uniquePhone.slice(-12)}`);
console.log(`   Endpoint: https://${options.hostname}${options.path}\n`);

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`✅ Response: ${data}`);
    console.log(`📍 Status: ${res.statusCode}\n`);
    
    console.log(`⏳ Now check both databases for phone: ${uniquePhone.slice(-12)}`);
    console.log(`   Run: node check-both-dbs.js\n`);
  });
});

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});

req.write(payload);
req.end();
