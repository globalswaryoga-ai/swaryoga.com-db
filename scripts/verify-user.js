const mongoose = require('mongoose');

async function verifyUser() {
  await mongoose.connect('mongodb://localhost:27017/swaryogaDB');
  
  const db = mongoose.connection.db;
  const usersColl = db.collection('users');

  console.log('📊 Querying users database...\n');

  // Get all users
  const users = await usersColl.find({}).toArray();
  console.log(`Total users in database: ${users.length}\n`);

  // Find Mohan Kalburgi specifically
  const mohanUser = await usersColl.findOne({ name: 'Mohan Kalburgi' });
  
  if (mohanUser) {
    console.log('✅ FOUND: Mohan Kalburgi\n');
    console.log('Full User Details:');
    console.log('─'.repeat(50));
    Object.entries(mohanUser).forEach(([key, value]) => {
      if (key !== 'password') {
        console.log(`  ${key}: ${JSON.stringify(value, null, 0)}`);
      } else {
        console.log(`  ${key}: [HASHED PASSWORD]`);
      }
    });
    console.log('─'.repeat(50));
  } else {
    console.log('❌ User not found');
  }

  // List all users
  console.log('\n📋 All Users in Database:');
  console.log('─'.repeat(50));
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
  });

  await mongoose.disconnect();
}

verifyUser().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
