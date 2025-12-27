const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  
  // Get any existing user
  const anyUser = await db.collection('users').findOne({});
  
  if (anyUser) {
    console.log('✅ Found existing user:');
    console.log('   Email:', anyUser.email);
    console.log('   Name:', anyUser.name);
  } else {
    console.log('❌ No users found in database');
  }
  
  // Check for daily tasks data
  const usersWithDailyTasks = await db.collection('users').findOne({
    'lifePlannerDailyTasks': { $exists: true, $ne: {} }
  });
  
  if (usersWithDailyTasks) {
    console.log('\n✅ Found daily tasks data in database');
  } else {
    console.log('\n❌ No daily tasks data yet');
  }
  
  mongoose.disconnect();
}).catch(e => {
  console.error('❌ Connection error:', e.message);
  process.exit(1);
});
