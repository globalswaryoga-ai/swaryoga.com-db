const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function investigate() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  // 1. Search for test1 user broadly
  console.log('=== SEARCHING FOR TEST1 USER ===');
  const byEmail = await db.collection('users').findOne({ email: /test1/i });
  const byUserId = await db.collection('users').findOne({ userId: /test/i });
  const byName = await db.collection('users').findOne({ name: /test/i });
  
  console.log('By email (test1):', byEmail ? JSON.stringify({ userId: byEmail.userId, email: byEmail.email, name: byEmail.name, isAdmin: byEmail.isAdmin }, null, 2) : 'NOT FOUND');
  console.log('By userId (test):', byUserId ? JSON.stringify({ userId: byUserId.userId, email: byUserId.email, name: byUserId.name, isAdmin: byUserId.isAdmin }, null, 2) : 'NOT FOUND');
  console.log('By name (test):', byName ? JSON.stringify({ userId: byName.userId, email: byName.email, name: byName.name, isAdmin: byName.isAdmin }, null, 2) : 'NOT FOUND');

  // 2. Check ALL CRM user settings
  console.log('\n=== ALL CRM USER SETTINGS ===');
  const allSettings = await crm.collection('crm_user_settings').find({}).toArray();
  if (allSettings.length === 0) {
    console.log('NO settings found at all');
  } else {
    allSettings.forEach(s => {
      console.log('  userId:', s.userId, '| bridgeUrl:', s.qrBridgeUrl || '(none)', '| secret:', s.qrBridgeSecret ? 'SET' : '(none)', '| qrEnabled:', s.qrWhatsappEnabled || false);
    });
  }

  // 3. Check if changes are actually deployed
  console.log('\n=== DEPLOYMENT CHECK ===');
  const fs = require('fs');
  const bridgeFile = fs.readFileSync('app/api/admin/crm/whatsapp/qr-bridge/route.ts', 'utf8');
  const hasPrivacyCheck = bridgeFile.includes('qrWhatsappEnabled');
  const hasCompartment = bridgeFile.includes('BLOCKED');
  console.log('qr-bridge/route.ts has privacy check:', hasPrivacyCheck);
  console.log('qr-bridge/route.ts has BLOCKED logic:', hasCompartment);

  const chatsFile = fs.readFileSync('app/api/admin/crm/whatsapp/qr/chats/route.ts', 'utf8');
  const chatsHasCheck = chatsFile.includes('qrWhatsappEnabled');
  console.log('qr/chats/route.ts has privacy check:', chatsHasCheck);

  const pageFile = fs.readFileSync('app/admin/crm/qr/page.tsx', 'utf8');
  const pageHasAccessDenied = pageFile.includes('qrAccessDenied');
  console.log('page.tsx has access denied screen:', pageHasAccessDenied);

  // 4. Check git status - are changes committed/pushed?
  console.log('\n=== GIT STATUS ===');
  const { execSync } = require('child_process');
  try {
    const status = execSync('git status --short', { encoding: 'utf8' });
    console.log('Modified/uncommitted files:');
    console.log(status || '(all committed)');
  } catch (e) {
    console.log('Git error:', e.message);
  }

  // 5. Check if dev server or production
  console.log('\n=== ENVIRONMENT ===');
  console.log('WHATSAPP_BRIDGE_HTTP_URL:', process.env.WHATSAPP_BRIDGE_HTTP_URL || '(not set)');
  console.log('NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL:', process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || '(not set)');

  await mongoose.disconnect();
}

investigate().catch(e => { console.error(e); process.exit(1); });
