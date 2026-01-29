const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  // Check both databases
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
  
  console.log('Checking swaryogaDB.whatsappmessages...');
  const mainMsgs = await mainDb.collection('whatsappmessages').find({}).sort({_id: -1}).limit(3).toArray();
  console.log('Found:', mainMsgs.length);
  mainMsgs.forEach(m => console.log(' -', m._id.toString(), m.phoneNumber));
  
  console.log('\nChecking swaryoga_admin_crm.whatsappmessages...');
  const crmMsgs = await crmDb.collection('whatsappmessages').find({}).sort({_id: -1}).limit(3).toArray();
  console.log('Found:', crmMsgs.length);
  crmMsgs.forEach(m => console.log(' -', m._id.toString(), m.phoneNumber));
  
  // List all collections in both DBs
  console.log('\nCollections in swaryogaDB:');
  const mainColls = await mainDb.listCollections().toArray();
  mainColls.forEach(c => console.log(' -', c.name));
  
  console.log('\nCollections in swaryoga_admin_crm:');
  const crmColls = await crmDb.listCollections().toArray();
  crmColls.forEach(c => console.log(' -', c.name));
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
