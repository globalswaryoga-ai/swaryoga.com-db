#!/usr/bin/env node
// Deep check webhook events for error details

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
  
  console.log('CHECKING WEBHOOK EVENTS FOR STATUS ERRORS\n');
  console.log('='.repeat(60));
  
  // Check all whatsapp_webhook_events
  const events = await db.collection('whatsapp_webhook_events')
    .find({})
    .sort({ receivedAt: -1 })
    .limit(50)
    .toArray();
  
  console.log('\nTotal Webhook Events:', events.length);
  
  let statusEvents = 0;
  
  for (const event of events) {
    if (event.rawPayload) {
      let payload;
      try {
        payload = typeof event.rawPayload === 'string' 
          ? JSON.parse(event.rawPayload) 
          : event.rawPayload;
      } catch {
        continue;
      }
      
      if (payload.entry) {
        for (const entry of payload.entry) {
          for (const change of (entry.changes || [])) {
            const value = change.value || {};
            
            // Check for statuses (delivery confirmations/failures)
            if (value.statuses && value.statuses.length > 0) {
              statusEvents++;
              for (const status of value.statuses) {
                if (status.status === 'failed' || status.errors) {
                  console.log('\n--- FAILED STATUS ---');
                  console.log('Time:', event.receivedAt);
                  console.log('Message ID:', status.id);
                  console.log('Status:', status.status);
                  console.log('Recipient:', status.recipient_id);
                  console.log('Timestamp:', new Date(parseInt(status.timestamp) * 1000).toISOString());
                  if (status.errors) {
                    console.log('ERRORS:', JSON.stringify(status.errors, null, 2));
                  }
                  if (status.conversation) {
                    console.log('Conversation:', status.conversation);
                  }
                  if (status.pricing) {
                    console.log('Pricing:', status.pricing);
                  }
                } else if (status.status === 'delivered' || status.status === 'sent') {
                  console.log('\n--- SUCCESS STATUS ---');
                  console.log('Message ID:', status.id);
                  console.log('Status:', status.status);
                  console.log('Recipient:', status.recipient_id);
                }
              }
            }
          }
        }
      }
    }
  }
  
  console.log('\n\nTotal status events found:', statusEvents);
  
  // Also check the raw payload of recent events
  console.log('\n\nRAW WEBHOOK PAYLOADS (last 3)');
  console.log('='.repeat(60));
  
  for (let i = 0; i < Math.min(3, events.length); i++) {
    const event = events[i];
    console.log('\n--- Event', i + 1, '---');
    console.log('Time:', event.receivedAt);
    if (event.rawPayload) {
      let payload;
      try {
        payload = typeof event.rawPayload === 'string' 
          ? JSON.parse(event.rawPayload) 
          : event.rawPayload;
        console.log('Payload:', JSON.stringify(payload, null, 2).substring(0, 1000));
      } catch {
        console.log('Raw:', String(event.rawPayload).substring(0, 500));
      }
    }
  }
  
  await client.close();
}

checkWebhooks().catch(console.error);
