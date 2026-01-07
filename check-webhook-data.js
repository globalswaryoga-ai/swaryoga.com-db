#!/usr/bin/env node
/**
 * Check webhook debug markers in database
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually since it has formatting issues
let envContent = '';
try {
  envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
} catch (e) {
  console.error('❌ Cannot read .env.local');
  process.exit(1);
}

// Extract MONGODB_URI_MAIN
const uriMatch = envContent.match(/MONGODB_URI_MAIN="([^"]+(?:\n[^"]+)*)"/s);
if (!uriMatch) {
  console.error('❌ Cannot extract MONGODB_URI_MAIN from .env.local');
  process.exit(1);
}

let MONGODB_URI_MAIN = uriMatch[1]
  .replace(/\\n/g, '') // Remove escaped newlines
  .replace(/\n/g, '');  // Remove actual newlines

const CRM_DB = 'swaryoga_admin_crm';

async function run() {
  try {
    console.log('📡 Connecting to MongoDB...');
    console.log('  URI: ' + MONGODB_URI_MAIN.substring(0, 50) + '...');
    await mongoose.connect(MONGODB_URI_MAIN);
    const crmDb = mongoose.connection.useDb(CRM_DB, { useCache: true });
    
    // Check for any collection that might have webhook data
    const collections = await crmDb.db.listCollections().toArray();
    console.log('📊 Collections in CRM database:');
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Check whatsappmessages
    const msgCount = await crmDb.collection('whatsappmessages').countDocuments();
    console.log(`\n💬 Total messages: ${msgCount}`);
    
    if (msgCount > 0) {
      const latest = await crmDb.collection('whatsappmessages')
        .find({})
        .sort({ sentAt: -1 })
        .limit(3)
        .toArray();
      console.log('\n📩 Latest 3 messages:');
      latest.forEach((m, i) => {
        const ago = Math.round((Date.now() - new Date(m.sentAt)) / 1000);
        console.log(`  [${i+1}] [${ago}s ago] From: ${m.phoneNumber || 'unknown'} - ${m.messageContent?.substring(0, 40) || '(no content)'}`);
      });
    }
    
    // Check leads
    const leadCount = await crmDb.collection('leads').countDocuments();
    console.log(`\n👤 Total leads: ${leadCount}`);
    
    if (leadCount > 0) {
      const latest = await crmDb.collection('leads')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      console.log('\n👤 Latest 3 leads:');
      latest.forEach((l, i) => {
        const ago = Math.round((Date.now() - new Date(l.createdAt)) / 1000);
        console.log(`  [${i+1}] [${ago}s ago] ${l.phoneNumber || 'unknown'} - ${l.source || 'unknown'}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
