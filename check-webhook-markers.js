#!/usr/bin/env node
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Parse .env.local
let envContent = '';
try {
  envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
} catch (e) {
  console.error('Cannot read .env.local');
  process.exit(1);
}

const uriMatch = envContent.match(/MONGODB_URI_MAIN="([^"]+(?:\n[^"]+)*)"/s);
if (!uriMatch) {
  console.error('Cannot extract MONGODB_URI_MAIN');
  process.exit(1);
}

let MONGODB_URI_MAIN = uriMatch[1]
  .replace(/\\n/g, '')
  .replace(/\n/g, '');

const CRM_DB = 'swaryoga_admin_crm';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI_MAIN);
    const crmDb = mongoose.connection.useDb(CRM_DB, { useCache: true });
    
    // Check for webhook marker in AuditLog
    const auditCollection = crmDb.collection('audit_logs');
    const markers = await auditCollection
      .find({ action: 'webhook_test_marker' })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    console.log(`📊 Found ${markers.length} webhook markers:`);
    markers.forEach((m, i) => {
      const ago = Math.round((Date.now() - new Date(m.timestamp)) / 1000);
      console.log(`  [${i+1}] [${ago}s ago] entries: ${m.details?.entriesCount || 0}`);
    });
    
    if (markers.length === 0) {
      console.log('\n⚠️  No webhook markers found - webhook handler might not be executing!');
    } else {
      console.log('\n✅ Webhook handler IS executing - marker found!');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
