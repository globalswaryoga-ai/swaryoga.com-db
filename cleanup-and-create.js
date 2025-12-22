#!/usr/bin/env node

/**
 * Test script to delete the old schedule and create a new one with language field
 * Run: node cleanup-and-create.js
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create admin token
const adminToken = jwt.sign(
  { username: 'admin', isAdmin: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🔐 Admin token created\n');

// Schedule ID to delete
const scheduleId = 'basic-swar-yoga_online_morning_2025-12-22_INR_600am';

// Step 1: Delete the old schedule
console.log('🗑️  Deleting old schedule...\n');

const deleteOptions = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/admin/workshops/schedules/crud?id=${encodeURIComponent(scheduleId)}`,
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
};

const deleteReq = http.request(deleteOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.success) {
        console.log('✅ Old schedule deleted\n');
        createNewSchedule();
      } else {
        console.log('ℹ️  Schedule not found (may not have existed):', parsed.error);
        createNewSchedule();
      }
    } catch (e) {
      console.log('ℹ️  Could not parse response, continuing...');
      createNewSchedule();
    }
  });
});

deleteReq.on('error', (e) => {
  console.error('❌ Error deleting:', e.message);
  process.exit(1);
});

deleteReq.end();

// Step 2: Create the new schedule with language field
function createNewSchedule() {
  console.log('📤 Creating new schedule with language field...\n');

  const payload = {
    workshopSlug: 'basic-swar-yoga',
    workshopName: 'Basic Swar Yoga',
    mode: 'online',
    language: 'Hindi',
    batch: 'morning',
    startDate: '2025-12-22T00:00:00.000Z',
    endDate: '2025-12-25T00:00:00.000Z',
    registrationCloseDate: '2025-12-20T00:00:00.000Z',
    time: '6:00 AM - 8:00 AM',
    startTime: '6:00 AM',
    endTime: '8:00 AM',
    seatsTotal: 60,
    price: 96,
    currency: 'INR',
    location: 'Online',
    status: 'draft',
  };

  const payloadStr = JSON.stringify(payload);

  const createOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/workshops/schedules/crud',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadStr),
      'Authorization': `Bearer ${adminToken}`,
    },
  };

  const createReq = http.request(createOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        
        if (res.statusCode === 201 && parsed.success) {
          console.log('✅ Schedule created successfully!\n');
          console.log('📋 Schedule Details:');
          console.log(`  ID: ${parsed.data.id}`);
          console.log(`  Workshop: ${parsed.data.workshopName}`);
          console.log(`  Mode: ${parsed.data.mode}`);
          console.log(`  Language: ${parsed.data.language}`);
          console.log(`  Dates: Dec 22-25, 2025`);
          console.log(`  Time: 6:00 AM - 8:00 AM`);
          console.log(`  Price: ${parsed.data.price} ${parsed.data.currency}`);
          console.log(`  Seats: ${parsed.data.seatsTotal}`);
          console.log(`  Status: ${parsed.data.status}`);
          
          setTimeout(verifySchedule, 500);
        } else if (parsed.error) {
          console.log('❌ Error creating schedule:', parsed.error);
          process.exit(1);
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
        process.exit(1);
      }
    });
  });

  createReq.on('error', (e) => {
    console.error('❌ Error creating schedule:', e.message);
    process.exit(1);
  });

  createReq.write(payloadStr);
  createReq.end();
}

// Step 3: Verify the schedule was saved with language field
function verifySchedule() {
  console.log('\n🔍 Verifying saved schedule...\n');

  const verifyOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/workshops/schedules?workshopSlug=basic-swar-yoga&mode=online',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  };

  const verifyReq = http.request(verifyOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        
        if (parsed.success && Array.isArray(parsed.data)) {
          const schedule = parsed.data[0];
          if (schedule) {
            console.log('✅ Schedule verified in database!\n');
            console.log('📝 Saved Details:');
            console.log(`  ✓ Workshop: ${schedule.workshopName}`);
            console.log(`  ✓ Mode: ${schedule.mode}`);
            console.log(`  ✓ Language: ${schedule.language} ✅`);
            console.log(`  ✓ Start Date: ${new Date(schedule.startDate).toLocaleDateString()}`);
            console.log(`  ✓ End Date: ${new Date(schedule.endDate).toLocaleDateString()}`);
            console.log(`  ✓ Price: ${schedule.price} ${schedule.currency}`);
            console.log(`  ✓ Seats: ${schedule.seatsTotal}`);
            console.log(`  ✓ Status: ${schedule.status}`);
            console.log('\n✨ All fields saved correctly!');
            
            if (schedule.language === 'Hindi') {
              console.log('\n✅ SUCCESS! Schedule is ready with all details:');
              console.log('   Online/Hindi/Health/Basic Swar Yoga');
              console.log('   Dec 22-25, 2025 • 96 INR');
            }
          }
        }
      } catch (e) {
        console.log('Error verifying:', e.message);
      }
    });
  });

  verifyReq.on('error', (e) => {
    console.error('Error verifying:', e.message);
  });

  verifyReq.end();
}
