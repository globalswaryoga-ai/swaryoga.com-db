#!/usr/bin/env node
/**
 * Check ONLY the main database for RECENT messages (last hour)
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  
  await mongoose.connect(MONGODB_URI);
  
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentMessages = await mainDb.collection('whatsappmessages').find({
    createdAt: { $gte: oneHourAgo }
  }).sort({ createdAt: -1 }).toArray();
  
  console.log(`\n📊 Messages in swaryogaDB (last 60 minutes):\n`);
  
  if (recentMessages.length === 0) {
    console.log('❌ No recent messages found');
  } else {
    console.log(`✅ Found ${recentMessages.length} message(s):\n`);
    recentMessages.forEach((msg, i) => {
      const createdAt = msg.createdAt ? new Date(msg.createdAt).toISOString() : 'unknown';
      const phone = msg.phoneNumber || 'unknown';
      const preview = msg.messageContent ? msg.messageContent.substring(0, 60) : 'no content';
      console.log(`[${i+1}] ${createdAt}`);
      console.log(`    Phone: ${phone}`);
      console.log(`    Content: "${preview}"`);
      console.log(`    Message ID: ${msg._id}`);
      console.log();
    });
  }
  
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
