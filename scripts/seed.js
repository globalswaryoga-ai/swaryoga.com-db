const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI in .env.local');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for seeding');

  const db = mongoose.connection.db;

  // Users collection: create default admin user if missing
  const usersColl = db.collection('users');
  const adminEmail = 'admin@swaryoga.com';
  const existingAdmin = await usersColl.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash('Admin@1234', 10);
    const adminDoc = {
      name: 'Admin',
      email: adminEmail,
      phone: '9999999999',
      countryCode: '+91',
      country: 'India',
      state: 'Maharashtra',
      gender: 'Male',
      age: 30,
      profession: 'Administrator',
      password: hashed,
      profileId: '000001',
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
    await usersColl.insertOne(adminDoc);
    console.log('Inserted admin user ->', adminEmail);
  } else {
    console.log('Admin user already exists ->', adminEmail);
  }

  // Accounts collection: insert a sample account
  const accountsColl = db.collection('accounts');
  const existingAccount = await accountsColl.findOne({ name: 'Main Bank' });
  if (!existingAccount) {
    await accountsColl.insertOne({
      name: 'Main Bank',
      type: 'bank',
      accountNumber: '1234567890',
      bankName: 'Swar Bank',
      balance: 100000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Inserted sample account: Main Bank');
  } else {
    console.log('Sample account already exists');
  }

  // Optionally add a sample life planner goal to admin
  await usersColl.updateOne(
    { email: adminEmail },
    {
      $set: {
        lifePlannerGoals: [
          { title: 'Welcome Goal', description: 'This goal was seeded', createdAt: new Date() },
        ],
      },
    }
  );

  await mongoose.disconnect();
  console.log('Seeding complete — disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
