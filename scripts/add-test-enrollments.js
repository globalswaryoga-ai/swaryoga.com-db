#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function addTestEnrollments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection;
    
    // Get existing User collection structure
    const User = db.collection('users');
    
    const courseId = process.argv[2];
    if (!courseId) {
      console.error('❌ Course ID required. Usage: node scripts/add-test-enrollments.js <courseId>');
      process.exit(1);
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.error('❌ Invalid course ID format:', courseId);
      process.exit(1);
    }

    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    // Generate unique profile ID (6-digit number)
    const generateUniqueProfileId = async () => {
      let isUnique = false;
      let profileId = '';
      while (!isUnique) {
        profileId = String(Math.floor(100000 + Math.random() * 900000));
        const existing = await User.findOne({ profileId });
        isUnique = !existing;
      }
      return profileId;
    };

    // Create test users
    const timestamp = Date.now();
    const profileId1 = await generateUniqueProfileId();
    const profileId2 = await generateUniqueProfileId();

    const user1 = {
      email: `testuser1-${timestamp}@example.com`,
      name: 'Test User 1',
      phone: '+91 9876543210',
      password: 'testpassword123',
      profileId: profileId1,
      createdAt: new Date(),
    };

    const user2 = {
      email: `testuser2-${timestamp + 1}@example.com`,
      name: 'Test User 2',
      phone: '+91 9876543211',
      password: 'testpassword123',
      profileId: profileId2,
      createdAt: new Date(),
    };

    // Insert users
    const result = await User.insertMany([user1, user2]);
    const createdUserIds = result.insertedIds;
    const createdUsers = [
      { ...user1, _id: createdUserIds[0] },
      { ...user2, _id: createdUserIds[1] },
    ];

    console.log(`✅ Created 2 test users:`);
    createdUsers.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    // Enroll both users in the course
    const CourseEnrollments = db.collection('courseenrollments');
    const enrollments = [
      {
        userId: createdUsers[0]._id,
        courseId: courseObjectId,
        enrolledAt: new Date(),
        status: 'active',
        hoursRemaining: 0,
      },
      {
        userId: createdUsers[1]._id,
        courseId: courseObjectId,
        enrolledAt: new Date(),
        status: 'active',
        hoursRemaining: 0,
      },
    ];

    const enrollResult = await CourseEnrollments.insertMany(enrollments);
    console.log(`✅ Enrolled both users in course`);
    const enrollmentIds = Array.isArray(enrollResult.insertedIds)
      ? enrollResult.insertedIds
      : Object.values(enrollResult.insertedIds || {});
    enrollmentIds.forEach((id, idx) => {
      console.log(`   ${idx + 1}. Enrollment ID: ${id}`);
    });

    console.log('\n✅ Test enrollments created successfully!');
    console.log('\nYou can now view these users in:');
    console.log(`   - Admin panel → E-Learning → Users`);
    console.log(`   - Course details page`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error - the email or profileId already exists');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

addTestEnrollments();
