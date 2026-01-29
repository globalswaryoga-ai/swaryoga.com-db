#!/usr/bin/env node
// Check for error details in failed webhook events

const { MongoClient } = require('mongodb');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && key.indexOf('#') !== 0) process.env[key.trim()] = val.join('=').trim();
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Find failed webhook status updates
  const events = await db.collection('whatsapp_webhook_events')
    .find({ kind: 'status_update', status: 'failed' })
    .sort({ receivedAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('FAILED STATUS UPDATES WITH FULL DETAILS:');
  console.log('='.repeat(60));
  
  for (const e of events) {
    console.log('\n---');
    console.log('Full document:', JSON.stringify(e, null, 2));
  }
  
  await client.close();
}

run().catch(console.error);
