#!/usr/bin/env node

/**
 * Quick check - Verify schedule exists and bot automation is enabled
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not set');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 Check Schedule Status');
console.log('═══════════════════════════════════════════════════════════\n');

async function checkSchedule() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
    });

    const db = mongoose.connection.db;
    const schedules = await db.collection('sadhana_schedules').find({}).toArray();
    
    console.log(`Found ${schedules.length} schedule(s):\n`);

    schedules.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name}`);
      console.log(`   ID: ${s._id}`);
      console.log(`   Zoom Link: ${s.zoomLink || s.zoomId || '❌ MISSING'}`);
      console.log(`   Bot Enabled: ${s.enableBotAutomation ? '✅ YES' : '❌ NO'}`);
      console.log(`   Video URL: ${s.videoUrl ? '✅ Yes' : '❌ No'}`);
      
      if (s.zoomLink && s.enableBotAutomation) {
        console.log(`   ✅ READY FOR TEST`);
      } else {
        console.log(`   ⚠️  ISSUES:`);
        if (!s.zoomLink && !s.zoomId) console.log(`      - Add Zoom link`);
        if (!s.enableBotAutomation) console.log(`      - Enable bot automation`);
      }
      console.log();
    });

    // Additional checks
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 Additional Checks:\n');

    // Check Zoom credentials
    const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || process.env.ZOOM_BOT_ACCOUNT_ID;
    const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || process.env.ZOOM_BOT_CLIENT_ID;
    const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || process.env.ZOOM_BOT_CLIENT_SECRET;

    console.log('Zoom Credentials:');
    console.log(`  ZOOM_ACCOUNT_ID: ${ZOOM_ACCOUNT_ID ? '✅' : '❌'}`);
    console.log(`  ZOOM_CLIENT_ID: ${ZOOM_CLIENT_ID ? '✅' : '❌'}`);
    console.log(`  ZOOM_CLIENT_SECRET: ${ZOOM_CLIENT_SECRET ? '✅' : '❌'}\n`);

    console.log('To test the bot:');
    console.log('1. ✅ Start your Zoom meeting');
    console.log('2. ✅ Make sure bot automation is ENABLED for the schedule');
    console.log('3. ✅ Click Test Bot Now button');
    console.log('4. Bot will send a message to your meeting\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

checkSchedule();
