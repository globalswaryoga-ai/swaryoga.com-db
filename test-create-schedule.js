#!/usr/bin/env node

/**
 * Test script to create a workshop schedule and verify it was saved
 * Run: node test-create-schedule.js
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create a valid admin token
const adminToken = jwt.sign(
  { username: 'admin', isAdmin: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🔐 Generated admin token');

// Schedule to create: Online/Hindi/Health/Basic Swar Yoga - 96 INR, 22-25 Dec 2025
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

const options = {
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

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📡 Response Status:', res.statusCode);
    
    try {
      const parsed = JSON.parse(data);
      
      if (res.statusCode === 201 && parsed.success) {
        console.log('✅ Schedule created successfully!\n');
        console.log('Schedule Details:');
        console.log('  Workshop:', parsed.data.workshopName);
        console.log('  Mode:', parsed.data.mode);
        console.log('  Language:', parsed.data.language);
        console.log('  Dates:', parsed.data.startDate, 'to', parsed.data.endDate);
        console.log('  Price:', parsed.data.price, parsed.data.currency);
        console.log('  Seats:', parsed.data.seatsTotal);
        console.log('  Status:', parsed.data.status);
        console.log('  ID:', parsed.data.id);
        console.log('\n✨ Schedule saved to database!');
      } else if (parsed.error) {
        console.log('❌ Error:', parsed.error);
      } else {
        console.log('Response:', JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Connection error:', e.message);
  console.log('\n💡 Make sure the dev server is running:');
  console.log('   npm run dev');
});

console.log('\n📤 Creating schedule: Online/Hindi/Health/Basic Swar Yoga - 96 INR');
console.log('📅 Dates: 22-25 Dec 2025\n');

req.write(payloadStr);
req.end();
