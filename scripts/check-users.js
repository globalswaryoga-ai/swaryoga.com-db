const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  console.log('DB name:', db.databaseName);
  
  const users = await db.collection('users').countDocuments();
  console.log('Total users:', users);
  
  const nonAdmin = await db.collection('users').countDocuments({ isAdmin: { $ne: true } });
  console.log('Non-admin users:', nonAdmin);
  
  const fyEnd = new Date('2025-03-31T23:59:59.999Z');
  const upToFY = await db.collection('users').countDocuments({ isAdmin: { $ne: true }, createdAt: { $lte: fyEnd } });
  console.log('Up to FY end (2025-03-31):', upToFY);
  
  const sample = await db.collection('users').findOne({});
  if (sample) console.log('Sample user keys:', Object.keys(sample));
  
  // Check CRM DB too
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  const crmUsers = await crmDb.collection('users').countDocuments();
  console.log('\nCRM DB users:', crmUsers);
  
  await mongoose.disconnect();
}
main().catch(console.error);
