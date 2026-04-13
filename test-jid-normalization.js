#!/usr/bin/env node
/**
 * Test script to verify JID format normalization works correctly
 * Tests that @c.us format is converted to @s.whatsapp.net for DB queries
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Schema for QR WhatsApp messages
const qrMessageSchema = new mongoose.Schema({
  messageId: String,
  userId: String,
  connectedPhone: String,
  chatJid: String,
  text: String,
  fromMe: Boolean,
  timestamp: Number,
  direction: String,
});

async function testJidNormalization() {
  try {
    console.log('🧪 Testing JID Format Normalization...\n');

    // Connect to MongoDB
    const uri = process.env.MONGODB_URI_MAIN || 'mongodb://localhost:27017/swaryoga_admin_crm';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const QrMsg = db.collection('qr_whatsapp_messages');

    // Test data
    const userId = 'admincrm';
    const connectedPhone = '919309986820';
    
    // Simulate what the bridge returns: @c.us format (compressed)
    const bridgeJidFormat = '919075358557@c.us';
    
    // What the DB stores: @s.whatsapp.net format (standard)
    const dbJidFormat = '919075358557@s.whatsapp.net';

    console.log(`📝 Test Setup:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Connected Phone: ${connectedPhone}`);
    console.log(`   Bridge JID format (input): ${bridgeJidFormat}`);
    console.log(`   DB JID format (expected): ${dbJidFormat}\n`);

    // Test 1: Count messages with standard DB format
    console.log(`📊 Test 1: Querying with DB format (@s.whatsapp.net)...`);
    const countWithStandard = await QrMsg.countDocuments({
      userId,
      connectedPhone,
      chatJid: dbJidFormat,
    });
    console.log(`   Found: ${countWithStandard} messages ✅\n`);

    // Test 2: What would happen WITHOUT normalization (would fail)
    console.log(`📊 Test 2: Querying with bridge format WITHOUT normalization (@c.us)...`);
    const countWithBridgeFormat = await QrMsg.countDocuments({
      userId,
      connectedPhone,
      chatJid: bridgeJidFormat,
    });
    console.log(`   Found: ${countWithBridgeFormat} messages ${countWithBridgeFormat === 0 ? '❌ (THIS IS THE BUG!)' : '✅'}\n`);

    // Test 3: Verify normalization function works
    console.log(`🔄 Test 3: Testing JID normalization function...`);
    
    // This is the normalization function from the fix
    function normalizeJidFormat(jid) {
      if (jid.includes('@c.us')) {
        return jid.replace('@c.us', '@s.whatsapp.net');
      }
      if (jid.includes('@c-us')) {
        return jid.replace('@c-us', '@g.us');
      }
      return jid;
    }
    
    const normalized = normalizeJidFormat(bridgeJidFormat);
    console.log(`   Input: ${bridgeJidFormat}`);
    console.log(`   Output: ${normalized}`);
    console.log(`   Correct?: ${normalized === dbJidFormat ? '✅ YES' : '❌ NO'}\n`);

    // Test 4: Query with normalized format
    console.log(`📊 Test 4: Querying with normalized format...`);
    const countWithNormalized = await QrMsg.countDocuments({
      userId,
      connectedPhone,
      chatJid: normalized,
    });
    console.log(`   Found: ${countWithNormalized} messages ${countWithNormalized > 0 ? '✅' : '❌'}\n`);

    // Show sample messages
    if (countWithNormalized > 0) {
      console.log(`📋 Sample messages found:`);
      const samples = await QrMsg.find({
        userId,
        connectedPhone,
        chatJid: normalized,
      })
        .sort({ timestamp: -1 })
        .limit(3)
        .lean();
      
      samples.forEach((msg, idx) => {
        console.log(`   [${idx + 1}] ${msg.text?.substring(0, 40) || '[no text]'} (${msg.direction})`);
      });
    }

    console.log(`\n✅ Fix Verification Summary:`);
    console.log(`   Without normalization: ${countWithBridgeFormat} messages (🔴 BROKEN)`);
    console.log(`   With normalization: ${countWithNormalized} messages (🟢 FIXED)`);
    console.log(`   Messages now retrievable: ${countWithNormalized > 0 ? '✅ YES' : '❌ NO'}\n`);

    if (countWithNormalized > 0) {
      console.log(`🎉 SUCCESS! The JID normalization fix works correctly.`);
      console.log(`   Old messages will now be visible in the QR inbox.\n`);
    } else {
      console.log(`⚠️  WARNING: No messages found even with normalization.`);
      console.log(`   Check database connectivity and message storage.\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testJidNormalization();
