#!/usr/bin/env node
/**
 * Test if the issue is with how models are exported
 * Try using the old Proxy exports directly instead of getter functions
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  console.log('\n🧪 Testing direct Proxy exports...\n');
  
  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI);
  
  // Dynamically require the schemas file
  const schemas = await import('./lib/schemas/enterpriseSchemas.ts');
  
  // Try using the Proxy exports directly
  console.log('📦 Getting Lead Proxy directly...');
  const Lead = schemas.Lead;  // This should be a Proxy
  
  console.log('  Type of Lead:', typeof Lead);
  console.log('  Lead is:', Lead?.constructor?.name);
  console.log('  Lead is Proxy:', util.types?.isProxy?.(Lead) ? 'YES' : 'NO');
  
  // Try to use it
  console.log('\n🔍 Trying to call Lead.find()...');
  try {
    const result = await Lead.findOne({ phoneNumber: '919309986820' }).lean();
    console.log('  ✅ findOne worked! Found:', result ? 'YES' : 'NO');
  } catch (err) {
    console.error('  ❌ Error:', err.message);
  }
  
  console.log('\n');
  await mongoose.connection.close();
  process.exit(0);
}

const util = require('util');
test().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
