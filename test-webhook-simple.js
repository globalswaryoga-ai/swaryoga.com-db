#!/usr/bin/env node

// Simple test: send a fake webhook payload and see what happens

const https = require('https');

const testPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "123456789",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "919779006820",
              phone_number_id: "733788303156745"
            },
            messages: [
              {
                from: "919779006820",
                id: "wamid.test.12345",
                timestamp: Math.floor(Date.now() / 1000),
                type: "text",
                text: {
                  body: "Test message from script"
                }
              }
            ]
          },
          field: "messages"
        }
      ]
    }
  ]
};

console.log('\n🔍 Sending test payload to webhook...\n');
console.log('Payload:', JSON.stringify(testPayload, null, 2));

const payload = JSON.stringify(testPayload);

const options = {
  hostname: 'crm.swaryoga.com',
  port: 443,
  path: '/api/whatsapp/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n✅ Response: ${data}`);
    console.log(`Status: ${res.statusCode}\n`);
    
    // Wait and check database
    setTimeout(() => {
      checkDatabase();
    }, 2000);
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  process.exit(1);
});

req.write(payload);
req.end();

function checkDatabase() {
  const mongoose = require('mongoose');
  require('dotenv').config();

  const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

  mongoose.connect(MONGODB_URI, {
    dbName: MAIN_DB_NAME,
    tls: true,
    retryWrites: true,
  }).then(async () => {
    const db = mongoose.connection;
    
    const messages = await db.collection('whatsappmessages').find({}).sort({ createdAt: -1 }).limit(1).toArray();
    
    if (messages.length > 0) {
      console.log('✅ MESSAGE SAVED TO DATABASE!');
      console.log('Message:', messages[0]);
    } else {
      console.log('❌ Message NOT saved to database');
    }
    
    process.exit(0);
  }).catch((err) => {
    console.error('DB error:', err.message);
    process.exit(1);
  });
}
