#!/usr/bin/env node

// This simulates what Meta sends when a user sends an incoming message
const sampleMetaPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "123456789",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "919309986820",
              phone_number_id: "733788303156745"
            },
            messages: [
              {
                from: "919309986820",  // User's phone
                id: "wamid.ABC123DEF456",
                timestamp: Math.floor(Date.now() / 1000),
                type: "text",
                text: {
                  body: "Hello this is a test message"
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

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           TESTING WEBHOOK WITH SAMPLE META PAYLOAD             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('Sending sample message payload to webhook...\n');

const https = require('https');
const payload = JSON.stringify(sampleMetaPayload);

const options = {
  hostname: 'crm.swaryoga.com',
  port: 443,
  path: '/api/whatsapp/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-hub-signature-256': 'sha256=test-signature'  // Bypass signature check for now
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data}\n`);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook received the test message!');
      console.log('Now check database to see if message was saved...\n');
      
      // Check database
      checkDatabaseAfterDelay();
    } else {
      console.log('❌ Webhook returned error');
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  process.exit(1);
});

req.write(payload);
req.end();

function checkDatabaseAfterDelay() {
  console.log('Waiting 2 seconds before checking database...\n');
  setTimeout(() => {
    const mongoose = require('mongoose');
    require('dotenv').config();

    const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
    const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

    mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      tls: true,
      retryWrites: true,
    }).then(async () => {
      const WhatsAppMessageSchema = new mongoose.Schema({
        leadId: mongoose.Schema.Types.ObjectId,
        phoneNumber: String,
        messageContent: String,
        direction: String,
        createdAt: Date,
      }, { collection: 'whatsappmessages' });

      const WhatsAppMessage = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);
      
      const recentMessages = await WhatsAppMessage.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      console.log('📨 Recent messages in database:\n');
      if (recentMessages.length === 0) {
        console.log('❌ NO MESSAGES FOUND in database\n');
      } else {
        recentMessages.forEach((msg, i) => {
          console.log(`[${i+1}] ${msg.phoneNumber} (${msg.direction}): ${msg.messageContent.substring(0, 50)}`);
        });
      }

      process.exit(0);
    }).catch((err) => {
      console.error('Database error:', err.message);
      process.exit(1);
    });
  }, 2000);
}
