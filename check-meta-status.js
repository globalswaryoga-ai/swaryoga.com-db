#!/usr/bin/env node
// Check webhook event structure and Meta message status

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
}

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  
  const db = client.db('swaryoga_admin_crm');
  
  console.log('WEBHOOK EVENT STRUCTURE\n');
  console.log('='.repeat(60));
  
  // Check the actual structure of webhook events
  const events = await db.collection('whatsapp_webhook_events')
    .find({})
    .sort({ receivedAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('\nEvent structure (first event):');
  if (events[0]) {
    console.log('Keys:', Object.keys(events[0]));
    console.log('Full event:', JSON.stringify(events[0], null, 2));
  }
  
  // Check whatsapp_messages for the failed ones
  console.log('\n\nFAILED TEMPLATE MESSAGES (from whatsapp_messages)');
  console.log('='.repeat(60));
  
  const failedMsgs = await db.collection('whatsapp_messages')
    .find({ 
      direction: 'outbound',
      messageType: 'template',
      status: 'failed',
      provider: 'meta'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  for (const msg of failedMsgs) {
    console.log('\n---');
    console.log('ID:', msg._id);
    console.log('To:', msg.phoneNumber);
    console.log('Template ID:', msg.templateId);
    console.log('WA Message ID:', msg.waMessageId);
    console.log('Error:', msg.errorMessage);
    console.log('Sent At:', msg.sentAt);
    console.log('Metadata:', JSON.stringify(msg.metadata, null, 2));
  }
  
  // Now let's check if the issue is the recipient number
  console.log('\n\nCHECKING RECIPIENT VIA META API');
  console.log('='.repeat(60));
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  // The recipient phone number
  const phone = '919309986820';
  
  // Check if the number is valid for WhatsApp
  // Actually, we can't directly check - but we can try sending and see the response
  
  console.log('\nRecipient:', phone);
  console.log('\nNote: Meta accepted the messages (status 200) but they may have failed delivery.');
  console.log('This could be due to:');
  console.log('  1. User has blocked the business number');
  console.log('  2. User does not have WhatsApp on that number');
  console.log('  3. Template quality issues');
  console.log('  4. Rate limiting');
  console.log('\nCheck Meta Business Manager for delivery reports.');
  
  await client.close();
}

check().catch(console.error);
