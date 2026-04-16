#!/usr/bin/env node

/**
 * Debug script to inspect Sadhana Schedule configuration
 * Check if bot automation is enabled and Zoom link is valid
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const MONGODB_URI_MAIN = process.env.MONGODB_URI_MAIN;

if (!MONGODB_URI_MAIN) {
  console.error('❌ MONGODB_URI_MAIN not configured');
  process.exit(1);
}

async function debugSchedules() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI_MAIN);
    
    const db = mongoose.connection.useDb(MONGODB_CRM_DB_NAME);
    const collection = db.collection('sadhana_schedules');
    
    console.log('\n📚 Fetching all active Sadhana schedules...\n');
    const schedules = await collection.find({ status: 'active' }).toArray();
    
    if (schedules.length === 0) {
      console.log('❌ No active schedules found!');
      process.exit(0);
    }
    
    console.log(`✅ Found ${schedules.length} active schedule(s):\n`);
    
    schedules.forEach((schedule, idx) => {
      console.log(`${idx + 1}. ${schedule.name}`);
      console.log('   ═══════════════════════════════════════════════════════');
      console.log(`   📋 ID: ${schedule._id}`);
      console.log(`   🤖 Bot Enabled: ${schedule.enableBotAutomation ? '✅ YES' : '❌ NO'}`);
      console.log(`   🎬 Bot Name: ${schedule.botName || 'Swar Sadhana (default)'}`);
      console.log(`   ⏱️  Bot Join Time: ${schedule.botJoinMinutes || 5} min before`);
      console.log(`   ⏳ Video Duration: ${schedule.videoDuration || 40} min`);
      console.log(`   🔇 Auto-close: ${schedule.autoCloseMinutes || 40} min`);
      
      console.log(`\n   Zoom Configuration:`);
      if (schedule.zoomLink) {
        console.log(`   ✅ Zoom Link: ${schedule.zoomLink.substring(0, 80)}...`);
        
        // Try to extract meeting ID
        const urlMatch = schedule.zoomLink.match(/\/j\/(\d+)/);
        if (urlMatch) {
          console.log(`   ✅ Meeting ID: ${urlMatch[1]}`);
        } else {
          console.log(`   ❌ Could not extract Meeting ID from link!`);
        }
        
        // Try to extract password
        const pwdMatch = schedule.zoomLink.match(/[?&]pwd=([^&]+)/);
        if (pwdMatch) {
          console.log(`   ✅ Password: ${pwdMatch[1]}`);
        } else {
          console.log(`   ⚠️  No password in link`);
        }
      } else {
        console.log(`   ❌ NO Zoom Link configured!`);
      }
      
      if (schedule.zoomId) {
        console.log(`   📱 Zoom ID (fallback): ${schedule.zoomId}`);
      }
      
      if (schedule.zoomPassword) {
        console.log(`   🔐 Zoom Password (fallback): ${schedule.zoomPassword}`);
      }
      
      console.log(`\n   Video Configuration:`);
      if (schedule.videoUrl) {
        console.log(`   ✅ Video URL: ${schedule.videoUrl.substring(0, 80)}...`);
      } else {
        console.log(`   ⚠️  No video URL`);
      }
      
      console.log(`\n   Schedule Configuration:`);
      console.log(`   📅 Times: ${(schedule.schedule?.times || []).join(', ') || 'None'}`);
      const daysNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daysList = (schedule.schedule?.days || [])
        .map(d => daysNames[d])
        .join(', ');
      console.log(`   📆 Days: ${daysList || 'None'}`);
      console.log(`   🌍 Timezone: ${schedule.schedule?.timezone || 'Asia/Kolkata'}`);
      console.log(`   🔄 Repeat: ${schedule.schedule?.repeatFrequency || 'daily'}`);
      
      console.log(`\n   Created: ${schedule.createdAt}`);
      console.log(`   Updated: ${schedule.updatedAt}`);
      console.log('\n');
    });
    
    // Check if any schedule is missing required fields
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 Validation Check:\n');
    
    schedules.forEach((schedule) => {
      const issues = [];
      
      if (!schedule.enableBotAutomation) {
        issues.push('Bot automation DISABLED');
      }
      
      if (!schedule.zoomLink && !schedule.zoomId) {
        issues.push('No Zoom link or ID');
      }
      
      if (!schedule.videoUrl) {
        issues.push('No video URL');
      }
      
      const { zoomLink } = schedule;
      if (zoomLink && !zoomLink.match(/\/j\/\d+/)) {
        issues.push('Invalid Zoom link format');
      }
      
      if (issues.length === 0) {
        console.log(`✅ "${schedule.name}" - All checks passed!`);
      } else {
        console.log(`❌ "${schedule.name}" - Issues:`);
        issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
      console.log();
    });
    
    await mongoose.disconnect();
    console.log('✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugSchedules();
