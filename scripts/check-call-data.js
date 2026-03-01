#!/usr/bin/env node
/**
 * Check AI Call Log data across both databases
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  
  // List all collections containing "call" or "ai"
  console.log('=== CRM DB collections (call/ai related) ===');
  const crmCols = await crmDb.db.listCollections().toArray();
  for (const col of crmCols) {
    if (col.name.toLowerCase().includes('call') || col.name.toLowerCase().includes('ai')) {
      const count = await crmDb.collection(col.name).countDocuments();
      console.log(`  ${col.name} → ${count} docs`);
    }
  }
  
  console.log('\n=== Main DB collections (call/ai related) ===');
  const mainCols = await mainDb.db.listCollections().toArray();
  for (const col of mainCols) {
    if (col.name.toLowerCase().includes('call') || col.name.toLowerCase().includes('ai')) {
      const count = await mainDb.collection(col.name).countDocuments();
      console.log(`  ${col.name} → ${count} docs`);
    }
  }
  
  // Try common collection names
  const tryNames = ['aicall_logs', 'aicalllogs', 'ai_call_logs', 'aicalllog', 'calllogs', 'call_logs'];
  for (const name of tryNames) {
    for (const [label, db] of [['CRM', crmDb], ['Main', mainDb]]) {
      const count = await db.collection(name).countDocuments();
      if (count > 0) {
        console.log(`\n✅ Found: ${label}/${name} → ${count} docs`);
        const sample = await db.collection(name).find({}).sort({createdAt: -1}).limit(5).toArray();
        for (const c of sample) {
          console.log(JSON.stringify({
            _id: c._id.toString(),
            retellCallId: c.retellCallId || null,
            status: c.status,
            callEndedReason: c.callEndedReason || null,
            phone: c.phoneNumber,
            duration: c.duration,
            purpose: c.purpose,
            batchName: c.batchName || null,
            retellBatchId: c.retellBatchId || null,
            transcript: c.transcript ? c.transcript.substring(0,50) + '...' : null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }, null, 2));
        }
      }
    }
  }
  
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
