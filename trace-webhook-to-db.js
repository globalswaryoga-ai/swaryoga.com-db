#!/usr/bin/env node
/**
 * Send webhook to Vercel and then IMMEDIATELY query database to see if test message was created
 * This will help identify if the webhook is actually writing or not
 */

const https = require('https');
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  const testMessageId = 'WEBHOOK_TEST_' + Date.now();
  
  console.log(`\n📤 SENDING WEBHOOK TO VERCEL with unique ID: ${testMessageId}\n`);
  
  // Send webhook
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: '999999999999',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          messages: [{
            from: '918888888888',
            id: testMessageId,
            timestamp: Math.floor(Date.now() / 1000),
            type: 'text',
            text: { body: `Test webhook at ${new Date().toISOString()}` },
          }],
          contacts: [{ profile: { name: 'Test' }, wa_id: '918888888888' }],
          metadata: {
            display_phone_number: '919309986821',
            phone_number_id: 'test',
            business_account_id: 'test',
          },
        },
      }],
    }],
  });
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'crm.swaryoga.com',
      path: '/api/whatsapp/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`✅ Webhook returned ${res.statusCode}: ${data}\n`);
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Request failed:', err.message);
      resolve();
    });
    
    req.write(payload);
    req.end();
  });
}

async function checkDatabase(testMessageId) {
  console.log(`⏳ Waiting 3 seconds for webhook to process...\n`);
  await new Promise(r => setTimeout(r, 3000));
  
  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI);
  
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  const testMessage = await mainDb.collection('whatsappmessages').findOne({ waMessageId: testMessageId });
  
  console.log(`🔍 SEARCHING FOR MESSAGE WITH ID: ${testMessageId}`);
  console.log('');
  
  if (testMessage) {
    console.log('✅ MESSAGE FOUND IN swaryogaDB!');
    console.log('  ID:', testMessage._id);
    console.log('  Phone:', testMessage.phoneNumber);
    console.log('  Content:', testMessage.messageContent);
  } else {
    console.log('❌ MESSAGE NOT FOUND in swaryogaDB');
    
    // Check CRM DB
    const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
    const crmMessage = await crmDb.collection('whatsappmessages').findOne({ waMessageId: testMessageId });
    
    if (crmMessage) {
      console.log('⚠️  (But found in swaryoga_admin_crm instead - database routing issue!)');
    } else {
      console.log('❌ MESSAGE NOT FOUND in either database - webhook did not save anything');
    }
  }
  
  // Check for TEST connection write
  const testConnMsg = await mainDb.collection('whatsappmessages').findOne({ 
    waMessageId: { $regex: 'TEST_WEBHOOK_CONNECTION_' } 
  });
  
  console.log('\n📋 Connection test message:');
  if (testConnMsg) {
    console.log('  ✅ FOUND - Database connection IS working');
  } else {
    console.log('  ❌ NOT FOUND - Database connection may NOT be working');
  }
  
  console.log('\n');
  
  await mongoose.connection.close();
}

(async () => {
  const testMessageId = 'WEBHOOK_TEST_' + Date.now();
  await main();
  await checkDatabase(testMessageId);
  process.exit(0);
})();
