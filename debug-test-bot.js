#!/usr/bin/env node

/**
 * Debug the Test Bot Endpoint
 * Shows detailed logs from test-bot execution
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const ADMIN_TOKEN = process.env.DEBUG_ADMIN_TOKEN || process.env.ADMIN_TOKEN;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not set');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 Debug Test Bot Endpoint');
console.log('═══════════════════════════════════════════════════════════\n');

async function debugTestBot() {
  try {
    // Connect to database
    console.log('1️⃣  Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
    });
    console.log('✅ Connected\n');

    // Get schedules
    console.log('2️⃣  Fetching Sadhana schedules...\n');
    const db = mongoose.connection.db;
    const schedules = await db.collection('sadhana_schedules').find({}).toArray();
    
    if (schedules.length === 0) {
      console.log('❌ No schedules found!\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found ${schedules.length} schedule(s):\n`);
    schedules.forEach((schedule, i) => {
      console.log(`${i + 1}. ${schedule.name || 'Unnamed'}`);
      console.log(`   ID: ${schedule._id}`);
      console.log(`   Bot Enabled: ${schedule.enableBotAutomation ? '✅ YES' : '❌ NO'}`);
      console.log(`   Zoom Link: ${schedule.zoomLink ? '✅' : '❌'} ${schedule.zoomLink || 'N/A'}\n`);
    });

    const schedule = schedules[0];
    console.log('3️⃣  Testing endpoint with this schedule...\n');
    console.log(`   Schedule ID: ${schedule._id}`);
    console.log(`   Endpoint: POST /api/admin/crm/sadhana-scheduler/test-bot\n`);

    // Call test-bot endpoint
    try {
      const response = await axios.post(
        'http://localhost:3000/api/admin/crm/sadhana-scheduler/test-bot',
        { scheduleId: schedule._id.toString() },
        {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      console.log(`   Status: ${response.status}`);
      console.log(`   Response:\n`);
      
      if (response.data.logs) {
        console.log('   📋 EXECUTION LOGS:');
        response.data.logs.forEach(log => {
          console.log(`   ${log}`);
        });
        console.log();
      }

      if (response.status === 200 && response.data.success) {
        console.log('✅ Test succeeded!');
      } else {
        console.log(`❌ Test failed: ${response.data.message}\n`);
        console.log('Response data:');
        console.log(JSON.stringify(response.data, null, 2));
      }

    } catch (error) {
      console.error(`❌ Error calling endpoint: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

debugTestBot();
