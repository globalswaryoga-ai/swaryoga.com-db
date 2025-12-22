#!/usr/bin/env node

/**
 * Script to add a workshop schedule with JWT authentication
 * Hindi/Online/Health/Basic Swar Yoga
 * Dec 22-25, 6-8 AM, 60 people, ₹96
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate admin token
const adminToken = jwt.sign(
  { userId: 'admin-user', isAdmin: true, email: 'admin@swaryoga.com' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const scheduleData = {
  workshopSlug: 'basic-swar-yoga',
  workshopName: 'Basic Swar Yoga',
  mode: 'online',
  language: 'Hindi',
  batch: 'morning',
  startDate: '2025-12-22',
  endDate: '2025-12-25',
  days: '4 days',
  time: '6:00 AM - 8:00 AM',
  startTime: '06:00',
  endTime: '08:00',
  seatsTotal: 60,
  price: 96,
  currency: 'INR',
  status: 'draft',
};

function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/workshops/schedules/crud',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
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
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(scheduleData));
    req.end();
  });
}

async function run() {
  console.log('📝 Adding Hindi/Online/Health/Basic Swar Yoga schedule...\n');
  console.log('📋 Schedule Details:');
  console.log(`   Language: ${scheduleData.language}`);
  console.log(`   Mode: ${scheduleData.mode}`);
  console.log(`   Workshop: ${scheduleData.workshopName}`);
  console.log(`   Dates: ${scheduleData.startDate} to ${scheduleData.endDate}`);
  console.log(`   Time: ${scheduleData.time}`);
  console.log(`   Capacity: ${scheduleData.seatsTotal} people`);
  console.log(`   Fee: ₹${scheduleData.price} INR\n`);

  try {
    console.log('🔄 Sending request to /api/admin/workshops/schedules/crud...\n');
    const result = await makeRequest();

    if (result.status === 201) {
      console.log('✅ Schedule created successfully!\n');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(result.data, null, 2));
    } else if (result.status === 401) {
      console.error('❌ Unauthorized (401). JWT token might be invalid.');
      console.error('   JWT_SECRET:', JWT_SECRET === 'your-secret-key-change-in-production' ? '(default)' : '(set)');
      process.exit(1);
    } else {
      console.error(`❌ Error (${result.status}):`, result.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    console.error('\n💡 Tips:');
    console.error('   - Make sure dev server is running: npm run dev');
    console.error('   - Check that MONGODB_URI is set in .env');
    console.error('   - Verify JWT_SECRET is set in .env');
    process.exit(1);
  }
}

run();
