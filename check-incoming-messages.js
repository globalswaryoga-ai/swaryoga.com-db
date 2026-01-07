#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkMessages() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log(`✅ Connected to ${dbName}`);

    // Get the connection and access the database
    const db = mongoose.connection.getClient().db(dbName);
    
    // Check WhatsAppMessage collection
    console.log('\n📨 Checking WhatsAppMessage collection...');
    const messages = await db.collection('whatsappmessages').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    if (messages.length === 0) {
      console.log('❌ No messages found in database');
    } else {
      console.log(`✅ Found ${messages.length} recent messages:`);
      messages.forEach((msg, i) => {
        console.log(`  ${i+1}. From: ${msg.from}, Body: ${msg.text?.substring(0, 50)}..., Created: ${msg.createdAt}`);
      });
    }

    // Check WhatsAppWebhookEvent collection
    console.log('\n📋 Checking WhatsAppWebhookEvent collection...');
    const events = await db.collection('whatsappwebhookevents').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    if (events.length === 0) {
      console.log('❌ No webhook events found');
    } else {
      console.log(`✅ Found ${events.length} recent webhook events:`);
      events.forEach((evt, i) => {
        console.log(`  ${i+1}. Status: ${evt.status}, Type: ${evt.eventType}, Created: ${evt.createdAt}`);
      });
    }

    // Check Lead collection for the test number
    console.log('\n👤 Checking for test lead (+91 9779006820)...');
    const lead = await db.collection('leads').findOne({ phoneNumber: '919779006820' });
    
    if (lead) {
      console.log(`✅ Found lead:`, {
        id: lead._id,
        phone: lead.phoneNumber,
        name: lead.name,
        createdAt: lead.createdAt,
        lastMessageAt: lead.lastMessageAt
      });
    } else {
      console.log('❌ No lead found for this phone number');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkMessages();
