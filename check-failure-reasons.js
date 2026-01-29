#!/usr/bin/env node
// Check for failure reasons in failed messages

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
  
  // Find failed messages WITH failureReason
  const msgs = await db.collection('whatsapp_messages')
    .find({ status: 'failed' })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('Failed messages with failure reason:');
  for (const m of msgs) {
    console.log('---');
    console.log('To:', m.phoneNumber);
    console.log('Type:', m.messageType);
    console.log('failureReason:', m.failureReason);
    console.log('failureCode:', m.failureCode);
    console.log('waMessageId:', m.waMessageId);
    console.log('Updated:', m.updatedAt);
  }
  
  await client.close();
}

run().catch(console.error);
