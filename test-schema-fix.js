
const mongoose = require('mongoose');
const { connectDB } = require('./lib/db');
const { WhatsAppMessage, Lead } = require('./lib/schemas/enterpriseSchemas');

async function test() {
  await connectDB();
  console.log('Connected.');
  
  try {
    console.log('Testing WhatsAppMessage.findOne().populate("leadId")...');
    // Even if no messages exist, the call to populate('leadId') will trigger the lookup.
    await WhatsAppMessage.findOne().populate('leadId');
    console.log('✅ Success! Lead model was registered correctly.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
  
  process.exit();
}

test();
