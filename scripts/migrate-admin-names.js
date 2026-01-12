/**
 * Migration script to populate admin user names from userId if not set
 * Run: node scripts/migrate-admin-names.js
 */

const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI_MAIN || 'mongodb+srv://globalswaryoga:Globalswaryoga123@swar-yoga-db.2vjvl.mongodb.net/?retryWrites=true&w=majority&appName=swar-yoga-db';
const dbName = 'swaryogaDB';

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { 
      dbName,
      connectTimeoutMS: 10000,
    });

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all admin users without names
    console.log('📋 Searching for admin users without names...');
    const adminUsersWithoutNames = await usersCollection.find({
      isAdmin: true,
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' }
      ]
    }).toArray();

    console.log(`\n📊 Found ${adminUsersWithoutNames.length} admin users without names`);

    if (adminUsersWithoutNames.length === 0) {
      console.log('✅ All admin users already have names!');
      await mongoose.disconnect();
      return;
    }

    // Update each user with name from userId
    let updated = 0;
    for (const user of adminUsersWithoutNames) {
      console.log(`\n  👤 ${user.userId} (${user.email})`);
      console.log(`     Setting name to: ${user.userId}`);
      
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { $set: { name: user.userId } }
      );

      if (result.modifiedCount > 0) {
        updated++;
        console.log(`     ✅ Updated`);
      } else {
        console.log(`     ⚠️  No update needed`);
      }
    }

    console.log(`\n✨ Migration complete! Updated ${updated} admin users with names`);

    // Show final state
    console.log('\n📋 Final admin users:');
    const allAdminUsers = await usersCollection.find({ isAdmin: true }).toArray();
    allAdminUsers.forEach(u => {
      console.log(`  ✓ ${u.userId}: ${u.name} (${u.email})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrate();
