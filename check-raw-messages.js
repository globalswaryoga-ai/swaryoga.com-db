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
    
    // Check WhatsAppMessage collection (with underscore in name)
    console.log('\n📨 Checking whatsapp_messages collection (RAW)...');
    const messages = await db.collection('whatsapp_messages').find({}).sort({ _id: -1 }).limit(5).toArray();
    
    if (messages.length === 0) {
      console.log('❌ No messages found in database');
    } else {
      console.log(`✅ Found ${messages.length} recent messages:`);
      messages.forEach((msg, i) => {
        console.log(`\n${i+1}. ID: ${msg._id}`);
        console.log('   Content:', msg.messageContent);
        console.log('   From:', msg.phoneNumber);
        console.log('   Direction:', msg.direction);
        console.log('   Status:', msg.status);
        console.log('   Created:', msg.createdAt);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkMessages();
