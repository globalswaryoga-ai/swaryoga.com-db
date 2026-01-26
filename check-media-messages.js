#!/usr/bin/env node
/**
 * Check media messages in CRM database
 * Shows messages with messageType='media' or where media field exists
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('MONGODB_URI_MAIN not set');
    process.exit(1);
  }
  
  await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
  console.log('Connected to swaryoga_admin_crm\n');
  
  const WhatsAppMessage = mongoose.connection.collection('whatsapp_messages');
  
  // Find messages with media
  const mediaMessages = await WhatsAppMessage.find({
    $or: [
      { messageType: 'media' },
      { 'media.url': { $exists: true } },
      { 'media.kind': { $exists: true } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();
  
  console.log(`Found ${mediaMessages.length} media messages:\n`);
  
  for (const msg of mediaMessages) {
    console.log('─'.repeat(60));
    console.log('ID:', msg._id.toString());
    console.log('Direction:', msg.direction);
    console.log('Phone:', msg.phoneNumber);
    console.log('MessageType:', msg.messageType);
    console.log('Content:', (msg.messageContent || '').substring(0, 50));
    console.log('Media:', JSON.stringify(msg.media, null, 2));
    console.log('CreatedAt:', msg.createdAt);
    console.log();
  }
  
  // Count totals
  const totalMedia = await WhatsAppMessage.countDocuments({ messageType: 'media' });
  const withUrl = await WhatsAppMessage.countDocuments({ 'media.url': { $exists: true, $ne: '' } });
  const withoutUrl = await WhatsAppMessage.countDocuments({ 
    messageType: 'media', 
    $or: [
      { 'media.url': { $exists: false } },
      { 'media.url': '' },
      { 'media.url': null }
    ]
  });
  
  console.log('─'.repeat(60));
  console.log('SUMMARY:');
  console.log(`Total messageType=media: ${totalMedia}`);
  console.log(`With media.url: ${withUrl}`);
  console.log(`Missing media.url: ${withoutUrl}`);
  
  await mongoose.disconnect();
}

main().catch(console.error);
