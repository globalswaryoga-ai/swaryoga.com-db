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

    // 1. Check users collection (swaryogaDB)
    const mainDb = mongoose.connection.db;
    const user = await mainDb.collection('users').findOne({ userId: 'admincrm' });
    console.log('=== users collection (swaryogaDB) ===');
    if (user) {
      const pwMatch = await bcrypt.compare(PASSWORD, user.password);
      console.log({ userId: user.userId, email: user.email, isAdmin: user.isAdmin, passwordMatch: pwMatch });
    } else {
      console.log('NOT FOUND');
    }

    // 2. Check admin_users collection (swaryoga_admin_crm)
    const crmDb = mongoose.connection.useDb('swaryoga_admin_crm');
    const crmUser = await crmDb.collection('admin_users').findOne({
      $or: [{ userId: 'admincrm' }, { email: 'admin@swaryoga.com' }]
    });
    console.log('\n=== admin_users collection (swaryoga_admin_crm) ===');
    if (crmUser) {
      const pwMatch = await bcrypt.compare(PASSWORD, crmUser.password);
      console.log({ userId: crmUser.userId, email: crmUser.email, isAdmin: crmUser.isAdmin, passwordMatch: pwMatch });
    } else {
      console.log('NOT FOUND — need to create admin here too!');
    }

    // 3. If missing in admin_users, create it
    if (!crmUser) {
      console.log('\n🔧 Creating admincrm in admin_users collection...');
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
      console.log('✅ Created admincrm in admin_users collection!');
    } else {
      // Update password if it doesn't match
      const pwMatch = await bcrypt.compare(PASSWORD, crmUser.password);
      if (!pwMatch) {
        console.log('\n🔧 Updating password in admin_users...');
        const hashed = await bcrypt.hash(PASSWORD, 10);
        await crmDb.collection('admin_users').updateOne(
          { _id: crmUser._id },
          { $set: { password: hashed, updatedAt: new Date() } }
        );
        console.log('✅ Password updated in admin_users!');
      }
    }

    console.log('\n✅ Done! You can now login at crm.swaryoga.com with:');
    console.log('   User: admincrm');
    console.log('   Password: 1076Turya@2456');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
