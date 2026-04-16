#!/usr/bin/env node

/**
 * Manual test script to trigger bot join for Sadhana Scheduler
 * This bypasses the scheduled cron job and lets you test bot immediately
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || '';

if (!API_TOKEN) {
  console.error('❌ ERROR: API_TOKEN environment variable not set');
  console.error('   Usage: API_TOKEN="your_jwt_token" node test-bot-trigger.js');
  process.exit(1);
}

async function getSchedules() {
  console.log(`\n📋 Fetching schedules from: ${BASE_URL}/api/admin/crm/sadhana-scheduler`);
  
  try {
    const res = await fetch(`${BASE_URL}/api/admin/crm/sadhana-scheduler`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`HTTP ${res.status}: ${error}`);
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch schedules:', error.message);
    process.exit(1);
  }
}

async function testBotTrigger(scheduleId) {
  console.log(`\n🤖 Testing bot trigger for schedule: ${scheduleId}`);
  console.log(`   Endpoint: ${BASE_URL}/api/admin/crm/sadhana-scheduler/test-bot`);
  
  try {
    const res = await fetch(`${BASE_URL}/api/admin/crm/sadhana-scheduler/test-bot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scheduleId }),
    });

    const data = await res.json();

    console.log(`\n📊 Bot Test Response:`);
    console.log(`   Success: ${data.success ? '✅ Yes' : '❌ No'}`);
    console.log(`   Message: ${data.message}`);
    
    if (data.logs && Array.isArray(data.logs)) {
      console.log(`\n📝 Execution Logs (`);
      data.logs.forEach((log) => {
        console.log(`   ${log}`);
      });
      console.log(`\n`);
    }

    if (!data.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test trigger failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧘 Sadhana Scheduler - Manual Bot Trigger Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n🔧 Configuration:`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Token: ${API_TOKEN.substring(0, 20)}...`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  // Get all schedules
  const schedules = await getSchedules();
  
  if (!schedules || schedules.length === 0) {
    console.error('\n❌ No schedules found!');
    process.exit(1);
  }

  console.log(`\n📚 Found ${schedules.length} schedule(s):`);
  schedules.forEach((schedule, idx) => {
    console.log(`\n   ${idx + 1}. ${schedule.name}`);
    console.log(`      ID: ${schedule._id}`);
    console.log(`      Status: ${schedule.status}`);
    console.log(`      Times: ${(schedule.schedule.times || []).join(', ')}`);
    console.log(`      Days: ${(schedule.schedule.days || []).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`);
    console.log(`      Zoom: ${schedule.zoomLink ? '✅' : '❌'}`);
    console.log(`      Video: ${schedule.videoUrl ? '✅' : '❌'}`);
    console.log(`      Bot Enabled: ${schedule.enableBotAutomation ? '✅' : '❌'}`);
  });

  // Find active schedule with bot automation enabled
  const activeSchedule = schedules.find(s => s.status === 'active' && s.enableBotAutomation);
  
  if (!activeSchedule) {
    console.log('\n⚠️  No active schedule with bot automation enabled found');
    console.log('    Using first schedule for test...');
    const scheduleId = schedules[0]._id;
    await testBotTrigger(scheduleId);
  } else {
    console.log(`\n✅ Using active schedule with bot: ${activeSchedule.name}`);
    await testBotTrigger(activeSchedule._id);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Bot trigger test completed!');
  console.log('   Check your Zoom meeting for the bot to join...');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
