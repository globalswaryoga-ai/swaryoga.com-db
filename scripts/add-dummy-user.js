const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function addDummyUser() {
  // Connect to local MongoDB
  await mongoose.connect('mongodb://localhost:27017/swaryogaDB');
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersColl = db.collection('users');

  // Check if user already exists
  const existingUser = await usersColl.findOne({ email: 'mohan@swaryoga.com' });
  if (existingUser) {
    console.log('⚠️  User already exists:');
    console.log('  ID:', existingUser._id);
    console.log('  Name:', existingUser.name);
    console.log('  Email:', existingUser.email);
    await mongoose.disconnect();
    return;
  }

  // Hash password
  const hashed = await bcrypt.hash('Mohan@1234', 10);

  // Create new user
  const newUser = {
    name: 'Mohan Kalburgi',
    email: 'mohan@swaryoga.com',
    phone: '9876543210',
    countryCode: '+91',
    country: 'India',
    state: 'Karnataka',
    gender: 'Male',
    age: 28,
    profession: 'Developer',
    password: hashed,
    profileId: '000002',
    profileImage: '',
    lifePlannerVisions: [],
    lifePlannerGoals: [],
    lifePlannerTasks: [],
    lifePlannerTodos: [],
    lifePlannerWords: [],
    lifePlannerReminders: [],
    lifePlannerHealthRoutines: [],
    lifePlannerDiamondPeople: [],
    lifePlannerProgress: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await usersColl.insertOne(newUser);
  console.log('✅ Dummy user added successfully!');
  console.log('\n📋 User Details:');
  console.log('  ID: ' + result.insertedId);
  console.log('  Name: Mohan Kalburgi');
  console.log('  Email: mohan@swaryoga.com');
  console.log('  Password: Mohan@1234');
  console.log('  Profile ID: 000002');

  // Verify the user was added
  const addedUser = await usersColl.findOne({ _id: result.insertedId });
  console.log('\n✓ Verification - User confirmed in database');
  console.log('  Created At:', addedUser.createdAt);
  console.log('  Updated At:', addedUser.updatedAt);

  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
}

addDummyUser().catch((err) => {
  console.error('❌ Error adding user:', err.message);
  process.exit(1);
});
