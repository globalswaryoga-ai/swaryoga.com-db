#!/usr/bin/env node
/**
 * Direct MongoDB test - try to update directly
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testDirectUpdate() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const email = 'swarsakshi9999@gmail.com';
  const date = '2025-12-25';

  console.log('🧪 Direct MongoDB Update Test');
  console.log('═'.repeat(70));

  // Test 1: Raw MongoDB update
  console.log('\nTest 1: Using raw MongoDB driver...');
  const result = await db.collection('users').updateOne(
    { email },
    {
      $set: {
        [`lifePlannerDailyTasks.${date}`]: {
          date,
          workshopTasks: [
            { id: 'test-1', category: 'self', text: 'Test task 1' },
            { id: 'test-2', category: 'workStudy', text: 'Test task 2' }
          ],
          sadhana: {
            morning: [{ id: 'm-1', name: 'Meditation', frequency: '1 time', duration: '15 minutes', completed: false }],
            evening: [],
            diet: { waterLiters: 2, dryFruitsBreakfast: false, herbalDrinks: [] }
          },
          updatedAt: new Date().toISOString()
        }
      }
    }
  );

  console.log(`Result: ${result.modifiedCount} documents modified`);

  // Test 2: Check if it was actually saved
  console.log('\nTest 2: Verifying the data was saved...');
  const user = await db.collection('users').findOne({ email });
  
  if (user.lifePlannerDailyTasks && user.lifePlannerDailyTasks[date]) {
    const savedData = user.lifePlannerDailyTasks[date];
    console.log(`✅ Data was saved!`);
    console.log(`   Workshop tasks: ${savedData.workshopTasks?.length || 0}`);
    console.log(`   Sadhana morning: ${savedData.sadhana?.morning?.length || 0}`);
  } else {
    console.log(`❌ Data was NOT saved!`);
    console.log(`   User has lifePlannerDailyTasks: ${!!user.lifePlannerDailyTasks}`);
    if (user.lifePlannerDailyTasks) {
      console.log(`   Dates in lifePlannerDailyTasks: ${Object.keys(user.lifePlannerDailyTasks).join(', ')}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  mongoose.disconnect();
  process.exit(0);
}

testDirectUpdate().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
