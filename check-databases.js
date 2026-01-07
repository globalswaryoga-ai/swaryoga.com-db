#!/usr/bin/env node
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || MAIN_DB;

console.log('Database Configuration:');
console.log('  MONGODB_URI:', MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('  MONGODB_MAIN_DB_NAME:', process.env.MONGODB_MAIN_DB_NAME || '(not set)');
console.log('  MONGODB_CRM_DB_NAME:', process.env.MONGODB_CRM_DB_NAME || '(not set)');
console.log('  Resolved MAIN_DB:', MAIN_DB);
console.log('  Resolved CRM_DB:', CRM_DB);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const mainDb = mongoose.connection;
    const crmDb = mainDb.useDb(CRM_DB, { useCache: true });
    
    console.log('\n📊 Database Collections:');
    console.log('  Main DB ("swaryogaDB"):');
    const mainCollections = await mainDb.db.listCollections().toArray();
    mainCollections.slice(0, 10).forEach(c => console.log(`    - ${c.name}`));
    
    console.log('\n  CRM DB ("' + CRM_DB + '"):');
    const crmCollections = await crmDb.db.listCollections().toArray();
    crmCollections.forEach(c => console.log(`    - ${c.name}`));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
