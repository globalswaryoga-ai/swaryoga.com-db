#!/usr/bin/env node

/**
 * Script to find and list existing schedules for Level-1 and Youth programs
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryogaDB';

async function run() {
  try {
    console.log('🔍 Connecting to MongoDB...\n');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection;
    const WorkshopSchedule = db.model('WorkshopSchedule', new mongoose.Schema({}, { strict: false }));

    console.log('📋 Level-1 Hindi Schedules:\n');
    const level1Schedules = await WorkshopSchedule.find({
      workshopSlug: 'swar-yoga-level-1',
      language: 'Hindi'
    });

    if (level1Schedules.length === 0) {
      console.log('❌ No Level-1 Hindi schedules found\n');
    } else {
      level1Schedules.forEach((schedule) => {
        console.log(`   _id: ${schedule._id}`);
        console.log(`   Mode: ${schedule.mode}`);
        console.log(`   Start: ${schedule.startDate?.toISOString().split('T')[0]}`);
        console.log(`   End: ${schedule.endDate?.toISOString().split('T')[0]}`);
        console.log(`   Time: ${schedule.time}`);
        console.log(`   Seats: ${schedule.seatsTotal}`);
        console.log(`   Status: ${schedule.status}`);
        console.log('');
      });
    }

    console.log('\n📋 Youth Program Schedules:\n');
    const youthSchedules = await WorkshopSchedule.find({
      workshopSlug: 'swar-yoga-youth'
    });

    if (youthSchedules.length === 0) {
      console.log('❌ No Youth schedules found\n');
    } else {
      youthSchedules.forEach((schedule) => {
        console.log(`   _id: ${schedule._id}`);
        console.log(`   Language: ${schedule.language}`);
        console.log(`   Mode: ${schedule.mode}`);
        console.log(`   Start: ${schedule.startDate?.toISOString().split('T')[0]}`);
        console.log(`   End: ${schedule.endDate?.toISOString().split('T')[0]}`);
        console.log(`   Time: ${schedule.time}`);
        console.log(`   Seats: ${schedule.seatsTotal}`);
        console.log(`   Status: ${schedule.status}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
    console.log('✨ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
