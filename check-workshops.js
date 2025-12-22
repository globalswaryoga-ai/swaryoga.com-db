#!/usr/bin/env node

/**
 * Script to verify workshops are showing on the page
 */

const http = require('http');

function checkWorkshops() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/workshops/schedules?workshopSlug=basic-swar-yoga',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('🔍 Checking Basic Swar Yoga Workshops on Website...\n');

  try {
    const response = await checkWorkshops();

    if (!response || !response.success) {
      console.error('❌ Failed to fetch schedules');
      process.exit(1);
    }

    const schedules = response.data;

    if (schedules.length === 0) {
      console.error('❌ No schedules found for Basic Swar Yoga');
      process.exit(1);
    }

    console.log(`✅ Found ${schedules.length} published schedule(s)\n`);

    schedules.forEach((schedule, idx) => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      console.log(`📅 Schedule #${idx + 1}:`);
      console.log(`   Language: ${schedule.language}`);
      console.log(`   Mode: ${schedule.mode}`);
      console.log(`   Dates: ${startFormatted} - ${endFormatted}`);
      console.log(`   Time: ${schedule.time}`);
      console.log(`   Seats: ${schedule.seatsTotal}`);
      console.log(`   Price: ${schedule.currency} $${schedule.price}`);
      console.log(`   Status: ${schedule.status}`);
      console.log();
    });

    console.log('✅ All workshops are showing on the website!\n');
    console.log('🌐 Visit: http://localhost:3000/workshops');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
