const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const crmDb = mongoose.connection.useDb(crmDbName);
  const settings = crmDb.collection('crm_user_settings');

  const adminUserIds = [
    'Turya kalburgi',
    'Navneet Kumar',
    'Aditya Yadav',
    'Arvind Kalburgi',
    'Dharmendra Joshi',
    'Amar Adhikari',
    'vijay',
    'Varun R'
  ];

  console.log('=== Enabling qrWhatsappEnabled for all admin users ===\n');

  for (const uid of adminUserIds) {
    const result = await settings.updateOne(
      { userId: uid },
      { $set: { qrWhatsappEnabled: true }, $setOnInsert: { userId: uid } },
      { upsert: true }
    );
    const action = result.upsertedCount ? 'CREATED' : (result.modifiedCount ? 'UPDATED' : 'ALREADY SET');
    console.log(`  ${uid}: ${action}`);
  }

  console.log('\n=== Verification ===');
  const all = await settings.find({ userId: { $in: adminUserIds } })
    .project({ userId: 1, qrWhatsappEnabled: 1 })
    .toArray();
  all.forEach(s => console.log(`  ${s.userId}: qrWhatsappEnabled=${s.qrWhatsappEnabled}`));

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
