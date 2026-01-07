#!/usr/bin/env node
/**
 * Direct test of model getter functions
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
let envContent = '';
try {
  envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
} catch (e) {
  console.error('❌ Cannot read .env.local');
  process.exit(1);
}

const uriMatch = envContent.match(/MONGODB_URI_MAIN="([^"]+(?:\n[^"]+)*)"/s);
if (!uriMatch) {
  console.error('❌ Cannot extract MONGODB_URI_MAIN');
  process.exit(1);
}

let MONGODB_URI_MAIN = uriMatch[1]
  .replace(/\\n/g, '')
  .replace(/\n/g, '');

const CRM_DB = 'swaryoga_admin_crm';

async function testModels() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI_MAIN);
    console.log('✅ Connected\n');

    // Simulate what the webhook does
    console.log('📥 Simulating webhook model initialization...');
    
    // Get CRM database
    const crmDb = mongoose.connection.useDb(CRM_DB, { useCache: true });
    console.log('✅ Got CRM database\n');
    
    // Create a simple WhatsAppMessage model directly to test
    const schema = new mongoose.Schema(
      {
        leadId: mongoose.Schema.Types.ObjectId,
        phoneNumber: String,
        direction: String,
        messageContent: String,
        waMessageId: String,
      },
      { timestamps: true }
    );
    
    console.log('📝 Creating test message...');
    const WhatsAppMessage = crmDb.models['WhatsAppMessage'] || crmDb.model('WhatsAppMessage', schema);
    
    const now = new Date();
    const result = await WhatsAppMessage.updateOne(
      { 
        waMessageId: `test_direct_${Date.now()}`,
        direction: 'inbound' 
      },
      {
        $setOnInsert: {
          phoneNumber: '919309986820',
          direction: 'inbound',
          messageContent: `Direct test at ${now.toISOString()}`,
          waMessageId: `test_direct_${Date.now()}`,
        },
      },
      { upsert: true }
    );
    
    console.log('✅ updateOne completed:', result);
    console.log(`  Matched: ${result.matchedCount}`);
    console.log(`  Upserted: ${result.upsertedCount}`);
    console.log(`  Modified: ${result.modifiedCount}\n`);
    
    // Verify it was saved
    console.log('🔍 Verifying message was saved...');
    const found = await WhatsAppMessage.findOne({ phoneNumber: '919309986820' })
      .sort({ createdAt: -1 })
      .lean();
    
    if (found) {
      console.log('✅ Message found in database!');
      console.log(`  ID: ${found._id}`);
      console.log(`  Phone: ${found.phoneNumber}`);
      console.log(`  Content: ${found.messageContent}`);
    } else {
      console.log('❌ Message NOT found in database!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testModels();
