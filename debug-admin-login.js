const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const MONGO_URI = process.env.MONGODB_URI_MAIN;
const PASSWORD = '1076Turya@2456';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'swaryogaDB' });
    console.log('Connected to MongoDB\n');

    const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');

    // List ALL admin_users
    const all = await crmDb.collection('admin_users').find({}).project({ userId: 1, email: 1, isAdmin: 1, role: 1 }).toArray();
    console.log('=== All admin_users ===');
    console.log(JSON.stringify(all, null, 2));

    // Find admincrm specifically
    const user = await crmDb.collection('admin_users').findOne({
      $or: [{ userId: 'admincrm' }, { userId: /admincrm/i }, { email: 'admin@swaryoga.com' }]
    });

    if (user) {
      console.log('\n=== admincrm details ===');
      console.log('userId:', JSON.stringify(user.userId));
      console.log('email:', JSON.stringify(user.email));
      console.log('isAdmin:', user.isAdmin);
      console.log('role:', user.role);
      console.log('password hash:', user.password?.substring(0, 20) + '...');

      const pwMatch = await bcrypt.compare(PASSWORD, user.password);
      console.log('Password "1076Turya@2456" matches:', pwMatch);
    } else {
      console.log('\nadmincrm NOT FOUND in admin_users!');
      console.log('Creating...');
      const hashed = await bcrypt.hash(PASSWORD, 10);
      await crmDb.collection('admin_users').insertOne({
        userId: 'admincrm',
        email: 'admin@swaryoga.com',
        password: hashed,
        isAdmin: true,
        role: 'superadmin',
        permissions: ['all'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('CREATED admincrm in admin_users!');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
