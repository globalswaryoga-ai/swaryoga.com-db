const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI_MAIN;

async function testUsers() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');

  const users = await db.collection('users').find({ isAdmin: true })
    .project({ userId: 1, email: 1, isAdmin: 1, permissions: 1, permissionsV2: 1 })
    .toArray();

  console.log('Found', users.length, 'admin users total.\n');

  // Pick super admin + 2 regulars + test1@swaryoga.com
  const superAdmin = users.find(u => u.userId === 'admincrm' || u.userId === 'admin');
  const regulars = users.filter(u => u.userId !== 'admincrm' && u.userId !== 'admin');
  const test1 = users.find(u => u.email === 'test1@swaryoga.com');

  const testCases = [];
  if (superAdmin) testCases.push(superAdmin);
  // Add 2 random regulars (not test1)
  const others = regulars.filter(u => u.email !== 'test1@swaryoga.com').slice(0, 2);
  testCases.push(...others);
  if (test1) testCases.push(test1);

  for (const user of testCases) {
    const uid = user.userId || user.email;
    const isSA = uid === 'admin' || uid === 'admincrm' ||
      (Array.isArray(user.permissions) && user.permissions.includes('all')) ||
      user.permissionsV2?.isSuperAdmin === true;

    console.log('========================================');
    console.log('User:', uid);
    console.log('Email:', user.email || '(none)');
    console.log('Role:', isSA ? 'SUPER ADMIN' : 'Regular Admin');
    console.log('========================================');

    const settings = await crmDb.collection('crm_user_settings').findOne({ userId: uid });
    console.log('  CRM Settings:', settings ? 'EXISTS' : 'NONE');
    console.log('  qrBridgeUrl:', settings?.qrBridgeUrl || '(empty)');
    console.log('  qrBridgeSecret:', settings?.qrBridgeSecret ? settings.qrBridgeSecret.substring(0, 25) + '...' : '(none)');
    console.log('  qrWhatsappEnabled:', settings?.qrWhatsappEnabled || false);

    // Simulate resolveUserBridge() logic
    if (settings?.qrBridgeUrl) {
      console.log('  --> RESULT: HAS OWN BRIDGE -> ' + settings.qrBridgeUrl);
      console.log('  --> Can see super admin chats? NO (uses own bridge)');
    } else if (isSA) {
      console.log('  --> RESULT: SUPER ADMIN -> shared bridge');
      console.log('  --> Can see super admin chats? YES (is super admin)');
    } else if (settings?.qrWhatsappEnabled) {
      console.log('  --> RESULT: ENABLED by admin -> shared bridge');
      console.log('  --> Can see super admin chats? SHARED access (admin approved)');
    } else {
      console.log('  --> RESULT: BLOCKED (422 error)');
      console.log('  --> Can see super admin chats? NO - Privacy compartment OK');
      console.log('  --> Frontend: Shows ACCESS DENIED screen');
    }
    console.log('');
  }

  console.log('============ SUMMARY ============');
  let blocked = 0, allowed = 0;
  for (const user of users) {
    const uid = user.userId || user.email;
    const isSA = uid === 'admin' || uid === 'admincrm' ||
      (Array.isArray(user.permissions) && user.permissions.includes('all')) ||
      user.permissionsV2?.isSuperAdmin === true;
    const settings = await crmDb.collection('crm_user_settings').findOne({ userId: uid });
    
    if (settings?.qrBridgeUrl || isSA || settings?.qrWhatsappEnabled) {
      allowed++;
    } else {
      blocked++;
    }
  }
  console.log('Total admin users:', users.length);
  console.log('Allowed (own bridge / super admin / enabled):', allowed);
  console.log('BLOCKED (cannot see any chats):', blocked);
  console.log('Privacy leak risk: ' + (blocked === users.length - 1 ? 'NONE' : blocked > 0 ? 'LOW' : 'CHECK'));

  await mongoose.disconnect();
}

testUsers().catch(e => { console.error(e); process.exit(1); });
