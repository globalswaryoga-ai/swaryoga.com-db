require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  
  const test1 = await db.collection('admin_users').findOne({ email: 'test1@swaryoga.com' });
  console.log('\ntest1@swaryoga.com in admin_users?', test1 ? 'YES' : 'NO');
  if (!test1) {
    console.log('User not found - THIS IS THE PROBLEM!');
    const count = await db.collection('admin_users').countDocuments();
    console.log('\nTotal admin_users:', count);
  }
  await c.close();
})().catch(e => console.error(e.message));
