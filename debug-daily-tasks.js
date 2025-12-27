#!/usr/bin/env node
/**
 * Debug: Check what was actually saved in MongoDB
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function debugData() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const email = 'swarsakshi9999@gmail.com';
  const date = '2025-12-25';

  console.log('🔍 Debugging Data Storage');
  console.log('═'.repeat(70));
  console.log(`Looking for user: ${email}`);
  console.log(`Date: ${date}`);
  console.log('═'.repeat(70));

  const user = await db.collection('users').findOne({ email });

  if (!user) {
    console.log('❌ User not found!');
    mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n📋 User Document:');
  console.log(`  • Email: ${user.email}`);
  console.log(`  • Name: ${user.name}`);
  console.log(`  • Has lifePlannerDailyTasks field: ${!!user.lifePlannerDailyTasks}`);

  if (user.lifePlannerDailyTasks) {
    console.log(`\n📅 Daily Tasks (lifePlannerDailyTasks):`);
    const dates = Object.keys(user.lifePlannerDailyTasks);
    console.log(`  Total dates: ${dates.length}`);
    
    dates.forEach(d => {
      const dayData = user.lifePlannerDailyTasks[d];
      console.log(`\n  Date: ${d}`);
      console.log(`    Type: ${typeof dayData}`);
      console.log(`    Keys: ${Object.keys(dayData).join(', ')}`);
      console.log(`    Workshop tasks: ${Array.isArray(dayData.workshopTasks) ? dayData.workshopTasks.length : 'not array'}`);
      console.log(`    Has sadhana: ${!!dayData.sadhana}`);
      
      if (dayData.workshopTasks && Array.isArray(dayData.workshopTasks)) {
        console.log(`\n    Workshop Tasks:`);
        dayData.workshopTasks.forEach((task, i) => {
          console.log(`      ${i + 1}. ${task.text} (${task.category})`);
        });
      }

      if (dayData.sadhana) {
        console.log(`\n    Sadhana:`);
        console.log(`      Morning: ${dayData.sadhana.morning?.length || 0} practices`);
        console.log(`      Evening: ${dayData.sadhana.evening?.length || 0} practices`);
        console.log(`      Water: ${dayData.sadhana.diet?.waterLiters || 0}L`);
      }
    });
  } else {
    console.log('\n❌ No lifePlannerDailyTasks field found!');
  }

  // Check other life planner fields
  console.log('\n📊 Other Life Planner Fields:');
  console.log(`  • Visions: ${Array.isArray(user.lifePlannerVisions) ? user.lifePlannerVisions.length : 'none'}`);
  console.log(`  • Goals: ${Array.isArray(user.lifePlannerGoals) ? user.lifePlannerGoals.length : 'none'}`);
  console.log(`  • Tasks: ${Array.isArray(user.lifePlannerTasks) ? user.lifePlannerTasks.length : 'none'}`);
  console.log(`  • Todos: ${Array.isArray(user.lifePlannerTodos) ? user.lifePlannerTodos.length : 'none'}`);

  console.log('\n' + '═'.repeat(70));
  mongoose.disconnect();
  process.exit(0);
}

debugData().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
