/**
 * Add Vijay Sir as admin user (2nd MD admin)
 * Run: node add-vijay-admin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function addVijayAdmin() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set in .env.local');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to database');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  const userId = 'vijay';
  const name = 'Vijay Sir';
  const email = 'gmswaryoga@gmail.com';
  const password = 'GmTally@345';

  // Check if user already exists by email or userId
  const existingByEmail = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
  const existingByUserId = await usersCollection.findOne({ userId: { $regex: new RegExp(`^${userId}$`, 'i') } });

  if (existingByEmail || existingByUserId) {
    const existing = existingByEmail || existingByUserId;
    console.log(`⚠️  Found existing user: ${existing.email} (userId: ${existing.userId}, isAdmin: ${existing.isAdmin})`);
    
    // Update to admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await usersCollection.updateOne(
      { _id: existing._id },
      {
        $set: {
          userId: userId,
          name: name,
          email: email.toLowerCase(),
          password: hashedPassword,
          isAdmin: true,
          isSuperAdmin: true,
          role: 'md',
          permissions: ['crm', 'whatsapp'],
          updatedAt: new Date(),
        }
      }
    );
    console.log('✅ Updated existing user to MD admin successfully!');
  } else {
    // Create new MD admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a unique 6-digit profileId
    const profileId = String(100000 + Math.floor(Math.random() * 899999));

    await usersCollection.insertOne({
      userId: userId,
      name: name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isAdmin: true,
      isSuperAdmin: true,
      role: 'md',
      permissions: ['crm', 'whatsapp'],
      managedUserIds: [],
      assignedLeadIds: [],
      profileId: profileId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ New MD admin user created successfully!');
  }

  // Verify
  const verify = await usersCollection.findOne({ userId: userId });
  console.log('\n📋 User details:');
  console.log(`   userId: ${verify.userId}`);
  console.log(`   name: ${verify.name}`);
  console.log(`   email: ${verify.email}`);
  console.log(`   isAdmin: ${verify.isAdmin}`);
  console.log(`   isSuperAdmin: ${verify.isSuperAdmin}`);
  console.log(`   role: ${verify.role}`);
  console.log(`   permissions: ${JSON.stringify(verify.permissions)}`);

  await mongoose.disconnect();
  console.log('\n✅ Done! Vijay Sir can now log in as MD admin.');
}

addVijayAdmin().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
