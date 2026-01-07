#!/usr/bin/env node
/**
 * Check ALL messages in both databases and categorize by phone/content
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  
  console.log('\n🔍 DETAILED MESSAGE AUDIT\n');
  console.log('Config:');
  console.log(`  CRM_DB_NAME: ${process.env.MONGODB_CRM_DB_NAME || 'not set (defaults to swaryogaDB)'}`);
  console.log(`  MAIN_DB_NAME: ${process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB'}\n`);
  
  await mongoose.connect(MONGODB_URI);
  
  // Check both databases
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  
  console.log('🔎 MAIN DB (swaryogaDB):\n');
  const mainMessages = await mainDb.collection('whatsappmessages').find().toArray();
  console.log(`Total messages: ${mainMessages.length}`);
  if (mainMessages.length > 0) {
    mainMessages.slice(0, 5).forEach((msg, i) => {
      const createdAt = msg.createdAt ? new Date(msg.createdAt).toISOString() : 'unknown';
      const preview = msg.messageContent ? msg.messageContent.substring(0, 50) : 'no content';
      console.log(`  [${i+1}] ${createdAt} | ${msg.phoneNumber} | "${preview}"`);
    });
    if (mainMessages.length > 5) {
      console.log(`  ... and ${mainMessages.length - 5} more`);
    }
  }
  
  console.log('\n🔎 CRM DB (swaryoga_admin_crm):\n');
  const crmMessages = await crmDb.collection('whatsappmessages').find().toArray();
  console.log(`Total messages: ${crmMessages.length}`);
  if (crmMessages.length > 0) {
    crmMessages.slice(0, 5).forEach((msg, i) => {
      const createdAt = msg.createdAt ? new Date(msg.createdAt).toISOString() : 'unknown';
      const preview = msg.messageContent ? msg.messageContent.substring(0, 50) : 'no content';
      console.log(`  [${i+1}] ${createdAt} | ${msg.phoneNumber} | "${preview}"`);
    });
    if (crmMessages.length > 5) {
      console.log(`  ... and ${crmMessages.length - 5} more`);
    }
  }
  
  console.log('\n');
  
  await mongoose.connection.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
