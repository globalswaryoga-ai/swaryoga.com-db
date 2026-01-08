#!/usr/bin/env node

require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/.env.local' });
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkIncomingMessages() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         📱 INCOMING MESSAGES CHECK - JAN 8, 2026         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    // Check Meta messages (whatsappmessages)
    const metaMessages = db.collection('whatsappmessages');
    const metaCount = await metaMessages.countDocuments();
    console.log('📊 META MESSAGES (whatsappmessages):');
    console.log(`   Total: ${metaCount}`);
    
    const metaRecent = await metaMessages.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    if (metaRecent.length > 0) {
      console.log('\n   Recent messages:');
      metaRecent.forEach((msg, i) => {
        const date = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'No date';
        const body = msg.body || msg.message?.text || '(empty)';
        const from = msg.from || msg.senderPhoneNumberId || 'unknown';
        console.log(`   ${i+1}. [${date}] ${from}`);
        console.log(`      "${body}"`);
      });
    }
    
    // Check QR Bridge messages (whatsapp_messages)
    const qrMessages = db.collection('whatsapp_messages');
    const qrCount = await qrMessages.countDocuments();
    console.log(`\n\n📊 QR BRIDGE MESSAGES (whatsapp_messages):`);
    console.log(`   Total: ${qrCount}`);
    
    const qrRecent = await qrMessages.find({}).sort({ timestamp: -1 }).limit(10).toArray();
    if (qrRecent.length > 0) {
      console.log('\n   Recent messages:');
      qrRecent.forEach((msg, i) => {
        const date = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'No date';
        const body = msg.body || '(empty)';
        const from = msg.from || 'unknown';
        console.log(`   ${i+1}. [${date}] ${from}`);
        console.log(`      "${body}"`);
      });
    }
    
    // Check today's messages specifically
    console.log('\n\n📅 MESSAGES FROM TODAY (JAN 8, 2026):');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayMeta = await metaMessages.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const todayQR = await qrMessages.countDocuments({
      timestamp: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`   Meta messages today: ${todayMeta}`);
    console.log(`   QR messages today: ${todayQR}`);
    console.log(`   Total today: ${todayMeta + todayQR}`);
    
    // Check phone numbers from your screenshot
    console.log('\n\n📱 CHECKING YOUR PHONE NUMBERS:');
    const phones = ['+919999999999', '+919986820181018', '+919187654321', '+919193099986820'];
    
    for (const phone of phones) {
      const count = await metaMessages.countDocuments({ from: phone }) + 
                   await qrMessages.countDocuments({ from: phone });
      if (count > 0) {
        console.log(`   ✅ ${phone}: ${count} messages`);
      }
    }
    
    console.log('\n✅ Check complete!\n');
    
  } finally {
    await client.close();
  }
}

checkIncomingMessages().catch(console.error);
