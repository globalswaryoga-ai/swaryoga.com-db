#!/usr/bin/env node
/**
 * Verify QR WhatsApp privacy compartment:
 * - Check all admin users
 * - Check CRM user settings (bridge config, secrets)
 * - Verify uniqueness of bridge secrets
 * - Show access status per user
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI_MAIN;
if (!MONGO_URI) {
  console.error('Missing MONGODB_URI_MAIN in .env.local');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Admin users
  console.log('=== ADMIN USERS ===');
  const users = await db.collection('users')
    .find({ isAdmin: true })
    .project({ userId: 1, name: 1, email: 1, role: 1 })
    .toArray();
  users.forEach(u => {
    console.log('  User:', u.userId || u.email, '| role:', u.role || 'admin');
  });

  // 2. CRM user settings
  console.log('\n=== CRM USER SETTINGS (QR Bridge) ===');
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  const settings = await crmDb.collection('crm_user_settings')
    .find({})
    .project({ userId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1 })
    .toArray();

  if (settings.length === 0) {
    console.log('  No CRM user settings found yet (secrets auto-generate on first access)');
  } else {
    settings.forEach(s => {
      const secretPreview = s.qrBridgeSecret ? s.qrBridgeSecret.substring(0, 20) + '...' : '(none)';
      console.log('  User:', s.userId,
        '| bridgeUrl:', s.qrBridgeUrl || '(none)',
        '| secret:', secretPreview,
        '| qrEnabled:', s.qrWhatsappEnabled || false);
    });
  }

  // 3. Uniqueness check
  console.log('\n=== UNIQUENESS CHECK ===');
  const secrets = settings.filter(s => s.qrBridgeSecret).map(s => s.qrBridgeSecret);
  const uniqueSecrets = new Set(secrets);
  if (secrets.length === uniqueSecrets.size) {
    console.log('  ✅ All bridge secrets are unique (' + secrets.length + ' total)');
  } else {
    console.log('  ❌ DUPLICATE SECRETS FOUND!');
    const seen = {};
    secrets.forEach(s => { seen[s] = (seen[s] || 0) + 1; });
    Object.entries(seen).filter(([, c]) => c > 1).forEach(([k, c]) => {
      console.log('    Duplicate:', k.substring(0, 20) + '... (' + c + ' users)');
    });
  }

  // 4. Privacy compartment status
  console.log('\n=== PRIVACY COMPARTMENT STATUS ===');
  for (const u of users) {
    const uid = u.userId || u.email;
    const isSuperAdmin = uid === 'admin' || uid === 'admincrm';
    const setting = settings.find(s => s.userId === uid);
    const hasOwnBridge = !!(setting && setting.qrBridgeUrl);
    const qrEnabled = !!(setting && setting.qrWhatsappEnabled);

    let access;
    if (isSuperAdmin) {
      access = '✅ SUPER ADMIN (always allowed)';
    } else if (hasOwnBridge) {
      access = '✅ OWN BRIDGE (' + setting.qrBridgeUrl + ')';
    } else if (qrEnabled) {
      access = '✅ ENABLED (shared bridge, admin-approved)';
    } else {
      access = '❌ BLOCKED (cannot see anyone else\'s chats)';
    }
    console.log('  ' + uid + ': ' + access);
  }

  // 5. Simulate what resolveUserBridge() would return
  console.log('\n=== BRIDGE PROXY SIMULATION ===');
  const FALLBACK_BRIDGE = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
  for (const u of users) {
    const uid = u.userId || u.email;
    const isSuperAdmin = uid === 'admin' || uid === 'admincrm';
    const setting = settings.find(s => s.userId === uid);

    if (setting && setting.qrBridgeUrl) {
      console.log('  ' + uid + ': -> OWN BRIDGE: ' + setting.qrBridgeUrl + ' (isolated)');
    } else if (isSuperAdmin) {
      console.log('  ' + uid + ': -> SHARED BRIDGE: ' + FALLBACK_BRIDGE + ' (super admin access)');
    } else if (setting && setting.qrWhatsappEnabled) {
      console.log('  ' + uid + ': -> SHARED BRIDGE: ' + FALLBACK_BRIDGE + ' (admin-approved)');
    } else {
      console.log('  ' + uid + ': -> NULL (BLOCKED - 422 error, NO bridge access)');
    }
  }

  console.log('\n=== SUMMARY ===');
  const blockedUsers = users.filter(u => {
    const uid = u.userId || u.email;
    const isSuperAdmin = uid === 'admin' || uid === 'admincrm';
    if (isSuperAdmin) return false;
    const setting = settings.find(s => s.userId === uid);
    return !(setting && setting.qrBridgeUrl) && !(setting && setting.qrWhatsappEnabled);
  });
  const allowedUsers = users.length - blockedUsers.length;
  console.log('  Total admin users:', users.length);
  console.log('  Allowed QR access:', allowedUsers);
  console.log('  BLOCKED (privacy protected):', blockedUsers.length);
  if (blockedUsers.length > 0) {
    console.log('  Blocked users:', blockedUsers.map(u => u.userId || u.email).join(', '));
    console.log('  ✅ These users CANNOT see super admin chats');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
