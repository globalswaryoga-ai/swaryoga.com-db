#!/usr/bin/env node

/**
 * Setup Test Sadhana Schedule with HLS URL
 * Creates a sample schedule for testing the scheduler
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI_MAIN = process.env.MONGODB_URI_MAIN;
const MONGODB_CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!MONGODB_URI_MAIN) {
  console.error('❌ MONGODB_URI_MAIN not configured');
  process.exit(1);
}

async function setupTestSchedule() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI_MAIN);

    const db = mongoose.connection.useDb(MONGODB_CRM_DB_NAME);
    const collection = db.collection('sadhana_schedules');

    // Test schedule - runs daily at 6:00 AM & 6:00 PM IST
    const testSchedule = {
      name: 'Daily Morning Sadhana - TEST',
      videoUrl: 'https://swaryoga.b-cdn.net/sadhana-45min.m3u8', // HLS URL from Bunny
      videoDuration: 45,
      botJoinMinutes: 5,
      autoCloseMinutes: 47,
      enableBotAutomation: true,
      zoomLink: 'https://zoom.us/j/92831948729?pwd=QlY2QThkMDB6TVhObDFRMW5ucXI1UT09',
      zoomId: '92831948729',
      zoomPassword: 'password123',
      schedule: {
        times: ['06:00', '18:00'], // 6 AM and 6 PM
        days: [0, 1, 2, 3, 4, 5, 6], // Every day
        timezone: 'Asia/Kolkata',
        repeatFrequency: 'daily',
      },
      status: 'active',
      participantEmails: [],
      participantPhones: [],
      enableEmailReminders: false,
      enableWhatsAppReminders: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('\n📝 Test Schedule Configuration:');
    console.log('================================');
    console.log(`📍 Name: ${testSchedule.name}`);
    console.log(`📹 Video URL (HLS): ${testSchedule.videoUrl}`);
    console.log(`⏱️  Duration: ${testSchedule.videoDuration} minutes`);
    console.log(`🔗 Zoom Link: ${testSchedule.zoomLink}`);
    console.log(`🎯 Schedule: Daily at 6:00 AM & 6:00 PM IST`);
    console.log(`🤖 Bot Automation: ${testSchedule.enableBotAutomation ? 'ENABLED ✅' : 'DISABLED'}`);
    console.log('');

    // Check if schedule already exists
    const existing = await collection.findOne({ name: testSchedule.name });

    if (existing) {
      console.log(`⚠️  Schedule "${testSchedule.name}" already exists!`);
      console.log(`📋 ID: ${existing._id}`);
      console.log('\nUpdating with latest configuration...');

      await collection.updateOne(
        { _id: existing._id },
        { $set: testSchedule }
      );
      console.log('✅ Schedule updated!');
    } else {
      const result = await collection.insertOne(testSchedule);
      console.log(`✅ Test schedule created!`);
      console.log(`📋 ID: ${result.insertedId}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎬 SADHANA SCHEDULER READY!');
    console.log('='.repeat(50));
    console.log('\n✨ What Happens Next:');
    console.log('   1️⃣  Scheduler checks every 60 seconds');
    console.log('   2️⃣  At 6:00 AM IST: Sends "Session starting in 5 min" message');
    console.log('   3️⃣  Starts HLS stream from Bunny → Zoom RTMP');
    console.log('   4️⃣  Video plays to all Zoom participants');
    console.log('   5️⃣  Auto-closes meeting after 47 minutes');
    console.log('\n🔍 Monitor scheduler in server logs:');
    console.log('   grep "[SadhanaScheduler]" /var/log/app.log\n');

    await mongoose.disconnect();
    console.log('✅ Setup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestSchedule();
