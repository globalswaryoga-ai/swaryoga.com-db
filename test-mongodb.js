const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Testing MongoDB connection...');
console.log('URI (first 50 chars):', process.env.MONGODB_URI?.substring(0, 50) + '...');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => {
    console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
    console.log('Database connection is working properly');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ FAILED: MongoDB connection error');
    console.error('Error message:', error.message);
    if (error.message.includes('Could not connect')) {
      console.error('\n💡 This means:');
      console.error('   1. Your IP might not be whitelisted');
      console.error('   2. MongoDB cluster might be paused');
      console.error('   3. Wrong credentials');
    }
    process.exit(1);
  });
