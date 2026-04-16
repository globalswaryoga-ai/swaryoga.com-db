#!/usr/bin/env node

/**
 * Check the actual schedule in MongoDB for all required fields
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not set');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 Detailed Schedule Inspection');
console.log('═══════════════════════════════════════════════════════════\n');

async function inspectSchedule() {
  try {
    console.log('Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
    });

    const db = mongoose.connection.db;
    const schedules = await db.collection('sadhana_schedules').find({}).toArray();
    
    if (schedules.length === 0) {
      console.log('❌ No schedules found!');
      await mongoose.connection.close();
      process.exit(1);
    }

    schedules.forEach((schedule, index) => {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📅 Schedule #${index + 1}: ${schedule.name}`);
      console.log(`${'═'.repeat(60)}\n`);

      console.log(`ID: ${schedule._id}`);
      console.log(`Status: ${schedule.status}`);
      console.log(`User ID: ${schedule.userId}\n`);

      console.log('🔗 Zoom Configuration:');
      console.log(`  zoomLink: ${schedule.zoomLink ? '✅ ' + schedule.zoomLink : '❌ MISSING'}`);
      console.log(`  zoomId: ${schedule.zoomId || '❌ MISSING'}`);
      console.log(`  zoomPassword: ${schedule.zoomPassword ? '✅ YES' : '❌ NO'}\n`);

      console.log('🎥 Video Configuration:');
      console.log(`  videoUrl: ${schedule.videoUrl ? '✅ Present' : '❌ MISSING'}`);
      console.log(`  videoDuration: ${schedule.videoDuration || 'N/A'} minutes\n`);

      console.log('🤖 Bot Configuration:');
      console.log(`  enableBotAutomation: ${schedule.enableBotAutomation ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`  botName: ${schedule.botName || 'Default (Swar Sadhana)'}`);
      console.log(`  botJoinMinutes: ${schedule.botJoinMinutes || 'Default (5)'}`);
      console.log(`  autoCloseMinutes: ${schedule.autoCloseMinutes || 'Default (40)'}\n`);

      console.log('⏰ Schedule Configuration:');
      if (schedule.schedule) {
        console.log(`  Times: ${schedule.schedule.times ? schedule.schedule.times.join(', ') : 'N/A'}`);
        console.log(`  Days: ${schedule.schedule.days ? schedule.schedule.days.join(', ') : 'N/A'}`);
        console.log(`  Frequency: ${schedule.schedule.repeatFrequency || 'N/A'}`);
        console.log(`  Timezone: ${schedule.schedule.timezone || 'N/A'}`);
      }
      console.log();

      // Validation checks
      console.log('✔️  Validation Checks:');
      const issues = [];
      
      if (!schedule.zoomLink && !schedule.zoomId) {
        issues.push('❌ No Zoom link or ID - bot cannot join');
      }
      if (!schedule.enableBotAutomation) {
        issues.push('⚠️  Bot automation is DISABLED');
      }
      if (!schedule.videoUrl) {
        issues.push('⚠️  No video URL configured');
      }

      // Try to extract meeting ID from Zoom link
      if (schedule.zoomLink) {
        const match = schedule.zoomLink.match(/\/j\/(\d+)/);
        if (match) {
          console.log(`  ✅ Meeting ID extractable: ${match[1]}`);
        } else {
          issues.push('❌ Cannot extract meeting ID from Zoom link');
        }
      }

      if (issues.length === 0) {
        console.log('  ✅ All checks passed - Ready for bot test!');
      } else {
        issues.forEach(issue => console.log(`  ${issue}`));
      }
    });

    console.log(`\n${'═'.repeat(60)}\n`);

    // Check Zoom credentials
    console.log('🔐 Zoom OAuth Credentials:');
    const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || process.env.ZOOM_BOT_ACCOUNT_ID;
    const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || process.env.ZOOM_BOT_CLIENT_ID;
    const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || process.env.ZOOM_BOT_CLIENT_SECRET;

    console.log(`  ZOOM_ACCOUNT_ID: ${ZOOM_ACCOUNT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  ZOOM_CLIENT_ID: ${ZOOM_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  ZOOM_CLIENT_SECRET: ${ZOOM_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}\n`);

    await mongoose.connection.close();

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

inspectSchedule();
