#!/usr/bin/env node

/**
 * Check if Meta incoming messages are being saved to database
 */

require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

async function checkWebhookMessages() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI_MAIN;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI_MAIN not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get WhatsAppMessage collection (from CRM DB)
    const db = mongoose.connection.db;
    
    // Try to find recent messages
    const messages = await db.collection('whatsappmessages').find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`\n📨 Found ${messages.length} WhatsApp messages in database:\n`);
    
    if (messages.length === 0) {
      console.log('❌ NO MESSAGES FOUND - Webhook may not be receiving messages\n');
      console.log('Troubleshooting:');
      console.log('1. Send a test message through Meta WhatsApp');
      console.log('2. Check if Meta webhook is configured correctly');
      console.log('3. Verify webhook URL: https://crm.swaryoga.com/api/whatsapp/webhook');
      console.log('4. Verify verify token matches in Meta dashboard');
    } else {
      messages.forEach((msg, idx) => {
        console.log(`${idx + 1}. Direction: ${msg.direction || 'unknown'}`);
        console.log(`   From: ${msg.phoneNumber || 'unknown'}`);
        console.log(`   Message: ${msg.messageContent?.substring(0, 80) || '(no content)'}`);
        console.log(`   Time: ${new Date(msg.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWebhookMessages();
