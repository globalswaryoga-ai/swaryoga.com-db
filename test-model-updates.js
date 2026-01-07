#!/usr/bin/env node
/**
 * Test if updateOne works with the exported models
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  console.log('\n🧪 Testing model.updateOne() with exported models...\n');
  
  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI);
  
  // Import using getter function
  const { getWhatsAppMessage } = await import('./lib/schemas/enterpriseSchemas.ts');
  const WhatsAppMessage = getWhatsAppMessage();
  
  console.log('WhatsAppMessage type:', typeof WhatsAppMessage);
  console.log('WhatsAppMessage name:', WhatsAppMessage?.constructor?.name);
  console.log('WhatsAppMessage has updateOne:', typeof WhatsAppMessage?.updateOne);
  
  // Try updateOne
  console.log('\n🔄 Attempting updateOne...');
  try {
    const testId = 'TEST_EXPORTED_MODEL_' + Date.now();
    const result = await WhatsAppMessage.updateOne(
      { waMessageId: testId },
      { $setOnInsert: { waMessageId: testId, phoneNumber: '9999999999', direction: 'test', messageContent: 'exported model test' } },
      { upsert: true }
    );
    
    console.log('✅ updateOne succeeded!');
    console.log('  matched:', result?.matchedCount);
    console.log('  upserted:', result?.upsertedCount);
    
    // Verify
    const doc = await WhatsAppMessage.findOne({ waMessageId: testId });
    console.log('  Verification:', doc ? '✅ FOUND' : '❌ NOT FOUND');
    
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
  
  console.log('\n');
  await mongoose.connection.close();
  process.exit(0);
}

test().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
