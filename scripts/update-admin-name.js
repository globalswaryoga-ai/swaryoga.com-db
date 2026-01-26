#!/usr/bin/env node
/**
 * Update admin user name to "Swar Yoga"
 * 
 * Usage:
 *   node scripts/update-admin-name.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function updateAdminName() {
  console.log('\n🔧 Updating admin user name to "Swar Yoga"...\n');

  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'swaryogaDB' });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find admincrm user
    const adminUser = await usersCollection.findOne({ 
      $or: [
        { userId: 'admincrm' },
        { email: 'admincrm@swaryoga.com' },
        { email: { $regex: /admincrm/i } }
      ]
    });

    if (!adminUser) {
      console.error('❌ admincrm user not found!');
      console.log('\n💡 Available admin users:');
      const allAdmins = await usersCollection.find({ isAdmin: true }).toArray();
      allAdmins.forEach(u => {
        console.log(`   - ${u.userId || u.email} | Name: ${u.name || 'N/A'}`);
      });
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`📝 Found user: ${adminUser.userId || adminUser.email}`);
    console.log(`   Current name: "${adminUser.name || 'Not set'}"`);

    // Update name
    const result = await usersCollection.updateOne(
      { _id: adminUser._id },
      { $set: { name: 'Swar Yoga', updatedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated name to "Swar Yoga"!');
    } else if (adminUser.name === 'Swar Yoga') {
      console.log('ℹ️  Name already set to "Swar Yoga"');
    } else {
      console.log('⚠️  No changes made');
    }

    // Verify
    const updated = await usersCollection.findOne({ _id: adminUser._id });
    console.log(`\n🎉 Verified - Name is now: "${updated.name}"`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateAdminName();
