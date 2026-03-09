const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  // Search by name containing "upamnyu"
  const user = await db.collection('users').findOne({
    $or: [
      { userId: { $regex: 'upamnyu', $options: 'i' } },
      { email: { $regex: 'upamnyu', $options: 'i' } },
      { name: { $regex: 'upamnyu', $options: 'i' } }
    ]
  });

  if (!user) {
    // Try broader search with "kalburgi"
    const user2 = await db.collection('users').findOne({
      $or: [
        { userId: { $regex: 'kalburgi', $options: 'i' } },
        { name: { $regex: 'kalburgi', $options: 'i' } }
      ]
    });
    if (user2) {
      console.log('Found by "kalburgi":', JSON.stringify({ userId: user2.userId, email: user2.email, name: user2.name, isAdmin: user2.isAdmin }, null, 2));
    } else {
      console.log('User "upamnyu kalburgi" NOT FOUND in database');
    }
    await mongoose.disconnect();
    return;
  }

  const uid = user.userId || user.email;
  const isSA = uid === 'admin' || uid === 'admincrm' ||
    (Array.isArray(user.permissions) && user.permissions.includes('all')) ||
    user.permissionsV2?.isSuperAdmin === true;

  console.log('========================================');
  console.log('User:', uid);
  console.log('Name:', user.name || '(none)');
  console.log('Email:', user.email || '(none)');
  console.log('isAdmin:', user.isAdmin);
  console.log('Role:', isSA ? 'SUPER ADMIN' : 'Regular Admin');
  console.log('========================================');

  const settings = await crm.collection('crm_user_settings').findOne({ userId: uid });
  console.log('CRM Settings:', settings ? 'EXISTS' : 'NONE');
  console.log('qrBridgeUrl:', settings?.qrBridgeUrl || '(empty)');
  console.log('qrBridgeSecret:', settings?.qrBridgeSecret ? settings.qrBridgeSecret.substring(0, 25) + '...' : '(none)');
  console.log('qrWhatsappEnabled:', settings?.qrWhatsappEnabled || false);

  if (settings?.qrBridgeUrl) {
    console.log('\n--> RESULT: HAS OWN BRIDGE ->', settings.qrBridgeUrl);
    console.log('--> Can see super admin chats? NO (isolated on own bridge)');
  } else if (isSA) {
    console.log('\n--> RESULT: SUPER ADMIN -> shared bridge');
    console.log('--> Can see super admin chats? YES (is the super admin)');
  } else if (settings?.qrWhatsappEnabled) {
    console.log('\n--> RESULT: ENABLED by admin -> shared bridge access');
  } else {
    console.log('\n--> RESULT: BLOCKED (422 error)');
    console.log('--> Can see super admin chats? NO - Privacy compartment active');
    console.log('--> Frontend: Shows ACCESS DENIED screen');
  }

  await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
