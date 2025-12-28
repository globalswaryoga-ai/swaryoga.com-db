#!/usr/bin/env node

/**
 * Script to check and update workshop schedules directly
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swaryogaDB';

async function run() {
  try {
    console.log('🔍 Connecting to MongoDB...\n');
    
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection;
    const WorkshopSchedule = db.model('WorkshopSchedule', new mongoose.Schema({}, { strict: false }));

    // Query Level-1 Hindi
    console.log('📋 Level-1 Hindi Online Schedule:\n');
    const level1 = await WorkshopSchedule.findOne({
      workshopSlug: 'swar-yoga-level-1',
      language: 'Hindi',
      mode: 'online'
    });

    if (level1) {
      console.log(`✅ Found Level-1 Hindi Schedule`);
      console.log(`   Raw _id: ${JSON.stringify(level1._id)}`);
      console.log(`   Mode: ${level1.mode}`);
      console.log(`   Start: ${level1.startDate?.toISOString().split('T')[0]}`);
      console.log(`   End: ${level1.endDate?.toISOString().split('T')[0]}`);
      console.log(`   Time: ${level1.time}`);
      console.log(`   Seats: ${level1.seatsTotal}`);
      console.log(`   Status: ${level1.status}`);
    } else {
      console.log('❌ No Level-1 Hindi online schedule found');
    }

    // Query Youth Hindi
    console.log('\n📋 Youth Program Hindi Online Schedule:\n');
    const youth = await WorkshopSchedule.findOne({
      workshopSlug: 'swar-yoga-youth',
      language: 'Hindi',
      mode: 'online'
    });

    if (youth) {
      console.log(`✅ Found Youth Hindi Schedule`);
      console.log(`   Raw _id: ${JSON.stringify(youth._id)}`);
      console.log(`   Language: ${youth.language}`);
      console.log(`   Mode: ${youth.mode}`);
      console.log(`   Start: ${youth.startDate?.toISOString().split('T')[0]}`);
      console.log(`   End: ${youth.endDate?.toISOString().split('T')[0]}`);
      console.log(`   Time: ${youth.time}`);
      console.log(`   Seats: ${youth.seatsTotal}`);
      console.log(`   Status: ${youth.status}`);
    } else {
      console.log('❌ No Youth Hindi online schedule found');
    }

    // Count all schedules for these workshops
    console.log('\n📊 Total Schedule Count:\n');
    const level1Count = await WorkshopSchedule.countDocuments({ workshopSlug: 'swar-yoga-level-1' });
    const youthCount = await WorkshopSchedule.countDocuments({ workshopSlug: 'swar-yoga-youth' });
    
    console.log(`   Level-1 Total: ${level1Count}`);
    console.log(`   Youth Total: ${youthCount}`);

    await mongoose.disconnect();
    console.log('\n✨ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
