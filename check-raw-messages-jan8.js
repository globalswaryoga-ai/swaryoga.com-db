#!/usr/bin/env node

require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/.env.local' });
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI_MAIN;
const DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkRawMessages() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         🔍 RAW MESSAGE DATA - JAN 8, 2026               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    // Check Meta messages - raw data
    const metaMessages = db.collection('whatsappmessages');
    const metaRecent = await metaMessages.find({}).sort({ _id: -1 }).limit(3).toArray();
    
    console.log('📱 META MESSAGES (Raw Data):');
    console.log('─'.repeat(60));
    metaRecent.forEach((msg, i) => {
      console.log(`\n${i+1}. Full Document:`);
      console.log(JSON.stringify(msg, null, 2));
    });
    
    // Check QR Bridge messages - raw data
    const qrMessages = db.collection('whatsapp_messages');
    const qrRecent = await qrMessages.find({}).sort({ _id: -1 }).limit(3).toArray();
    
    console.log('\n\n📱 QR BRIDGE MESSAGES (Raw Data):');
    console.log('─'.repeat(60));
    qrRecent.forEach((msg, i) => {
      console.log(`\n${i+1}. Full Document:`);
      console.log(JSON.stringify(msg, null, 2));
    });
    
  } finally {
    await client.close();
  }
}

checkRawMessages().catch(console.error);
