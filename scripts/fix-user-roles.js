require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function fixRoles() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Make the main admin a superadmin
  await db.collection('admin_users').updateOne(
    { email: 'swarsakshi9999@gmail.com' },
    { $set: { role: 'superadmin' } }
  );
  console.log('Updated swarsakshi9999@gmail.com to superadmin');
  
  // Fix test users - add userId field if missing
  const usersWithoutId = await db.collection('admin_users').find({ 
    $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }] 
  }).toArray();
  
  for (const user of usersWithoutId) {
    await db.collection('admin_users').updateOne(
      { _id: user._id },
      { $set: { userId: user.email } }
    );
    console.log('Fixed userId for:', user.email);
  }
  
  // Verify
  const users = await db.collection('admin_users').find({}, { 
    projection: { email: 1, role: 1, userId: 1 } 
  }).toArray();
  
  console.log('\nUpdated users:');
  users.forEach(u => console.log(' -', u.email, '| role:', u.role, '| userId:', u.userId));
  
  await client.close();
}

fixRoles().catch(console.error);
