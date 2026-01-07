#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function testMessageCreate() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      tls: true,
      retryWrites: true,
    });

    const db = mongoose.connection;
    const now = new Date();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         TESTING WHATSAPP MESSAGE CREATION                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // First create a test lead
    const phoneNumber = '919779006820';
    
    let lead = await db.collection('leads').findOne({ phoneNumber });
    if (!lead) {
      console.log('Creating test lead...');
      const result = await db.collection('leads').insertOne({
        phoneNumber,
        source: 'whatsapp',
        status: 'lead',
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now
      });
      lead = { _id: result.insertedId };
      console.log('✅ Lead created:', lead._id);
    } else {
      console.log('✅ Lead exists:', lead._id);
    }

    // Now try to insert a message
    console.log('\nCreating test message...');
    const msgResult = await db.collection('whatsappmessages').insertOne({
      leadId: lead._id,
      phoneNumber,
      direction: 'inbound',
      messageType: 'text',
      messageContent: 'Test message from debug script',
      status: 'delivered',
      deliveredAt: now,
      sentAt: now,
      isRead: false,
      backgroundColor: '#22c55e',
      textColor: '#ffffff',
      borderRadius: '8px',
      createdAt: now,
      updatedAt: now
    });

    console.log('✅ Message created:', msgResult.insertedId);

    // Verify it's there
    const savedMsg = await db.collection('whatsappmessages').findOne({ _id: msgResult.insertedId });
    console.log('\n✅ Message verified in database:');
    console.log(JSON.stringify(savedMsg, null, 2));

    console.log('\n✅ SUCCESS: Messages can be saved to database!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testMessageCreate();
