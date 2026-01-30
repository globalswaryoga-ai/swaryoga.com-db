#!/usr/bin/env node
/**
 * Test script to check media messages in the database
 * AND trace what the API endpoint would return
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  const dbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Check what provider field looks like in the DB
    console.log('\n=== Provider Distribution ===\n');
    const providers = await db.collection('whatsapp_messages').aggregate([
      { $match: { phoneNumber: '919309986820' } },
      { $group: { _id: '$provider', count: { $sum: 1 } } }
    ]).toArray();
    console.log('Providers:', providers);
    
    // Get messages with provider filter like QR page does
    console.log('\n=== QR Filter Test (provider=qr OR null/undefined) ===\n');
    const qrFilter = {
      phoneNumber: '919309986820',
      $or: [
        { provider: 'whatsapp_web_bridge' },
        { provider: 'whatsapp_qr' },
        { provider: { $in: [null, undefined] } },
        { provider: { $exists: false } }
      ]
    };
    
    const qrMessages = await db.collection('whatsapp_messages')
      .find(qrFilter)
      .sort({ sentAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`Found ${qrMessages.length} messages with QR filter`);
    qrMessages.forEach((msg, i) => {
      console.log(`\n--- QR Message ${i + 1} ---`);
      console.log('Provider:', msg.provider || '(null/undefined)');
      console.log('Type:', msg.messageType);
      console.log('Has media object:', !!msg.media);
      console.log('Media URL:', msg.media?.url || 'N/A');
    });
    
    // Now check meta filter
    console.log('\n=== Meta Filter Test (provider=meta) ===\n');
    const metaMessages = await db.collection('whatsapp_messages')
      .find({ phoneNumber: '919309986820', provider: 'meta' })
      .sort({ sentAt: -1 })
      .limit(3)
      .toArray();
    
    console.log(`Found ${metaMessages.length} messages with meta filter`);
    
    // Check if recent media messages have provider set
    console.log('\n=== Recent Media Messages Provider Check ===\n');
    const mediaMessages = await db.collection('whatsapp_messages')
      .find({ phoneNumber: '919309986820', messageType: 'media' })
      .sort({ sentAt: -1 })
      .limit(5)
      .toArray();
    
    mediaMessages.forEach((msg, i) => {
      console.log(`Media ${i + 1}: provider="${msg.provider || '(null)'}", url=${msg.media?.url ? 'YES' : 'NO'}`);
    });
    
  } finally {
    await client.close();
  }
}

main().catch(console.error);
