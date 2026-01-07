#!/usr/bin/env node
/**
 * DEBUG: Check which database has the recent messages
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  
  console.log('\n🔍 Checking BOTH databases for messages\n');
  
  await mongoose.connect(MONGODB_URI);
  
  // Check MAIN database
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  const mainMessages = await mainDb.collection('whatsappmessages').find({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).toArray();
  
  console.log('📊 Messages in MAIN DB (swaryogaDB) [last 24h]:');
  if (mainMessages.length === 0) {
    console.log('   ❌ No messages found');
  } else {
    console.log(`   ✅ Found ${mainMessages.length} messages:`);
    mainMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`   [${i+1}] Phone: ${msg.phoneNumber} | Content: ${(msg.messageContent || '').substring(0, 40)}`);
    });
  }
  
  // Check CRM database
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  const crmMessages = await crmDb.collection('whatsappmessages').find({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).toArray();
  
  console.log('\n📊 Messages in CRM DB (swaryoga_admin_crm) [last 24h]:');
  if (crmMessages.length === 0) {
    console.log('   ❌ No messages found');
  } else {
    console.log(`   ✅ Found ${crmMessages.length} messages:`);
    crmMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`   [${i+1}] Phone: ${msg.phoneNumber} | Content: ${(msg.messageContent || '').substring(0, 40)}`);
    });
  }
  
  console.log('\n');
  
  if (mainMessages.length > 0 && crmMessages.length === 0) {
    console.log('🎯 FOUND THE BUG! Messages are being saved to MAIN database instead of CRM database!');
    console.log('   Fix: Update .env file to set MONGODB_CRM_DB_NAME="swaryoga_admin_crm"');
  } else if (crmMessages.length > 0) {
    console.log('✅ Messages are in the correct CRM database');
  } else {
    console.log('❌ No recent messages in either database');
  }
  
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
