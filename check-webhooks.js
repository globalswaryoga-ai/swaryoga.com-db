#!/usr/bin/env node
// Check recent webhook events for message delivery status

const { MongoClient } = require('mongodb');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
}

async function checkWebhooks() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  
  const db = client.db('swaryoga_admin_crm');
  
  console.log('CHECKING RECENT WEBHOOK EVENTS\n');
  console.log('='.repeat(60));
  
  // Check whatsapp_webhook_events for recent status updates
  const events = await db.collection('whatsapp_webhook_events')
    .find({})
    .sort({ receivedAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('\nRecent Webhook Events:', events.length);
  
  for (const event of events) {
    console.log('\n---');
    console.log('Time:', event.receivedAt);
    console.log('Type:', event.eventType || 'unknown');
    
    // Check for status updates
    if (event.rawPayload) {
      const payload = typeof event.rawPayload === 'string' 
        ? JSON.parse(event.rawPayload) 
        : event.rawPayload;
      
      if (payload.entry) {
        for (const entry of payload.entry) {
          for (const change of (entry.changes || [])) {
            const value = change.value || {};
            
            // Check for statuses (delivery confirmations)
            if (value.statuses) {
              for (const status of value.statuses) {
                console.log('STATUS UPDATE:');
                console.log('  Message ID:', status.id);
                console.log('  Status:', status.status);
                console.log('  Recipient:', status.recipient_id);
                console.log('  Timestamp:', status.timestamp);
                if (status.errors) {
                  console.log('  ERRORS:', JSON.stringify(status.errors));
                }
              }
            }
            
            // Check for messages
            if (value.messages) {
              for (const msg of value.messages) {
                console.log('MESSAGE RECEIVED:');
                console.log('  From:', msg.from);
                console.log('  Type:', msg.type);
              }
            }
          }
        }
      }
    }
  }
  
  // Also check whatsapp_messages for recent outbound messages
  console.log('\n\nRECENT OUTBOUND MESSAGES');
  console.log('='.repeat(60));
  
  const messages = await db.collection('whatsapp_messages')
    .find({ direction: 'outbound' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  
  for (const msg of messages) {
    console.log('\n---');
    console.log('To:', msg.phoneNumber);
    console.log('Type:', msg.messageType);
    console.log('Status:', msg.status);
    console.log('Provider:', msg.provider);
    console.log('WA Message ID:', msg.waMessageId);
    console.log('Sent At:', msg.sentAt);
    if (msg.errorMessage) {
      console.log('ERROR:', msg.errorMessage);
    }
  }
  
  await client.close();
}

checkWebhooks().catch(console.error);
