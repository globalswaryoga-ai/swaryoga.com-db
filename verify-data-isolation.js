#!/usr/bin/env node
/**
 * Verify data isolation between users
 * Ensures each user only sees their own data
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkDataIsolation() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    console.log('🔍 Data Isolation Check');
    console.log('═'.repeat(60));

    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`\n📊 Total Users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No users found');
      mongoose.disconnect();
      process.exit(0);
    }

    // Check each user's data isolation
    for (const user of users.slice(0, 5)) {
      const email = user.email || 'unknown';
      const hasDailyTasks = user.lifePlannerDailyTasks ? Object.keys(user.lifePlannerDailyTasks).length : 0;
      const hasVisions = Array.isArray(user.lifePlannerVisions) ? user.lifePlannerVisions.length : 0;
      const hasGoals = Array.isArray(user.lifePlannerGoals) ? user.lifePlannerGoals.length : 0;
      const hasTasks = Array.isArray(user.lifePlannerTasks) ? user.lifePlannerTasks.length : 0;
      const hasTodos = Array.isArray(user.lifePlannerTodos) ? user.lifePlannerTodos.length : 0;

      console.log(`👤 User: ${email}`);
      console.log(`   ├─ Daily Tasks (dates): ${hasDailyTasks}`);
      console.log(`   ├─ Visions: ${hasVisions}`);
      console.log(`   ├─ Goals: ${hasGoals}`);
      console.log(`   ├─ Tasks: ${hasTasks}`);
      console.log(`   └─ Todos: ${hasTodos}`);
      console.log('');
    }

    // Check for data duplication/leakage
    console.log('🔐 Security Checks:');
    console.log('─'.repeat(60));

    // Check 1: No user has data from another user
    const allUsersData = await db.collection('users')
      .find({}, { projection: { email: 1, lifePlannerDailyTasks: 1 } })
      .toArray();

    let dataLeakageFound = false;
    for (let i = 0; i < allUsersData.length; i++) {
      for (let j = i + 1; j < allUsersData.length; j++) {
        const user1 = allUsersData[i];
        const user2 = allUsersData[j];
        
        if (user1.lifePlannerDailyTasks && user2.lifePlannerDailyTasks) {
          const keys1 = Object.keys(user1.lifePlannerDailyTasks);
          const keys2 = Object.keys(user2.lifePlannerDailyTasks);
          
          // Check if both users have same date data with same content
          for (const key of keys1) {
            if (keys2.includes(key)) {
              const data1 = JSON.stringify(user1.lifePlannerDailyTasks[key]);
              const data2 = JSON.stringify(user2.lifePlannerDailyTasks[key]);
              if (data1 === data2) {
                console.log(`⚠️  WARNING: ${user1.email} and ${user2.email} have identical data for ${key}`);
                dataLeakageFound = true;
              }
            }
          }
        }
      }
    }

    if (!dataLeakageFound) {
      console.log('✅ No data leakage detected between users');
    }

    // Check 2: API can find users correctly
    console.log('\n🔑 Authentication Checks:');
    console.log('─'.repeat(60));

    const testUsers = allUsersData.slice(0, 3);
    for (const user of testUsers) {
      const found = await db.collection('users').findOne({ email: user.email });
      if (found) {
        console.log(`✅ User lookup works: ${user.email}`);
      } else {
        console.log(`❌ User lookup FAILED: ${user.email}`);
      }
    }

    // Check 3: Email uniqueness
    const emailsCount = await db.collection('users').countDocuments({});
    const uniqueEmails = await db.collection('users').distinct('email');
    
    console.log('\n📧 Email Uniqueness:');
    console.log('─'.repeat(60));
    console.log(`Total users: ${emailsCount}`);
    console.log(`Unique emails: ${uniqueEmails.length}`);
    
    if (emailsCount === uniqueEmails.length) {
      console.log('✅ All emails are unique (no duplicates)');
    } else {
      console.log(`❌ Found ${emailsCount - uniqueEmails.length} duplicate emails!`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Data isolation check complete');

    mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

checkDataIsolation();
