#!/usr/bin/env node

const crypto = require('crypto');

// Simulate sending a real Meta webhook to Vercel
const phoneFrom = '919779006820'; // Test user
const messageText = `Test message ${new Date().toISOString()}`;
const phoneNumberId = '733788303156745';
const verifyToken = 'ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d';
const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '';

// Webhook payload
const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '123456789',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '917827890005',
          phone_number_id: phoneNumberId,
        },
        messages: [{
          from: phoneFrom,
          id: `wamid.${Date.now()}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: 'text',
          text: {
            body: messageText,
          },
        }],
      },
    }],
  }],
};

const bodyStr = JSON.stringify(payload);

// Generate signature if app secret is set
let headers = {
  'Content-Type': 'application/json',
};

if (appSecret) {
  const hash = crypto.createHmac('sha256', appSecret).update(bodyStr, 'utf8').digest('hex');
  headers['x-hub-signature-256'] = `sha256=${hash}`;
  console.log('✅ Signature generated:', headers['x-hub-signature-256']);
} else {
  console.log('⚠️  No app secret - webhook will be verified with SKIP_WEBHOOK_SIGNATURE=true');
}

// Send to Vercel
const https = require('https');
const url = 'https://crm.swaryoga.com/api/whatsapp/webhook';

console.log(`\n📤 Sending test message to ${url}`);
console.log('Message:', messageText);
console.log('From:', phoneFrom);

const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  port: 443,
  path: urlObj.pathname + '?' + urlObj.searchParams.toString(),
  method: 'POST',
  headers,
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`\n✅ Response (${res.statusCode}):`);
    console.log(data);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

req.write(bodyStr);
req.end();
