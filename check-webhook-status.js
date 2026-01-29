#!/usr/bin/env node
// Check latest webhook statuses for messages

const { MongoClient } = require('mongodb');
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
  
  // Get the latest message statuses
  const messages = await db.collection('whatsapp_messages')
    .find({ phoneNumber: '919309986820' })
    .sort({ updatedAt: -1 })
    .limit(8)
    .toArray();
  
  console.log('\n📨 Latest messages to 919309986820:\n');
  for (const m of messages) {
    console.log('---');
    console.log('Message ID:', m.waMessageId);
    console.log('Type:', m.messageType);
    console.log('Status:', m.status);
    console.log('Failure Reason:', m.failureReason || 'none');
    console.log('Updated:', m.updatedAt);
  }
  
  // Check latest webhook events
  const events = await db.collection('whatsapp_webhook_events')
    .find({})
    .sort({ receivedAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('\n📡 Latest webhook events:\n');
  for (const e of events) {
    console.log('---');
    console.log('Type:', e.eventType);
    console.log('Status:', e.status);
    console.log('Phone:', e.phoneNumber);
    console.log('waMessageId:', e.waMessageId);
    console.log('Errors:', e.errors || 'none');
    console.log('Received:', e.receivedAt);
  }
  
  await client.close();
}

check().catch(console.error);
