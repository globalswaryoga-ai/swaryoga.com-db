#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkMessages() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      tls: true,
      retryWrites: true,
    });

    const db = mongoose.connection;

    // Get all messages
    const messages = await db.collection('whatsappmessages').find({}).sort({ createdAt: -1 }).limit(5).toArray();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║            RECENT WHATSAPP MESSAGES (Last 5)                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (messages.length === 0) {
      console.log('❌ NO MESSAGES FOUND\n');
    } else {
      messages.forEach((msg, i) => {
        console.log(`\n[${i + 1}] ID: ${msg._id}`);
        console.log(`    Phone: ${msg.phoneNumber}`);
        console.log(`    Direction: ${msg.direction}`);
        console.log(`    Content: ${msg.messageContent?.substring(0, 100)}`);
        console.log(`    Status: ${msg.status}`);
        console.log(`    Created: ${msg.createdAt}`);
      });
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMessages();
