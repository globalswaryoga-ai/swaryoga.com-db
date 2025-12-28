#!/usr/bin/env node

/**
 * Script to update workshop schedules
 * - Swar Yoga Level-1 Hindi: Start from 6th Jan 2026
 * - Youth Program: Start from 5th Jan 2026 at 9 PM
 * - All slots: Set to 60
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

// Schedules to update
const scheduleUpdates = [
  {
    // Level-1 Hindi Online - Start from 6th Jan 2026
    id: 'swar-yoga-level-1-online-morning-hindi-inr-06-00',
    workshopSlug: 'swar-yoga-level-1',
    startDate: '2026-01-06',
    endDate: '2026-01-20',
    seatsTotal: 60,
    slots: 60,
    language: 'Hindi',
    mode: 'online'
  },
  {
    // Youth Program Online - Start from 5th Jan 2026 at 9 PM (21:00)
    id: 'swar-yoga-youth-online-evening-hindi-inr-21-00',
    workshopSlug: 'swar-yoga-youth',
    startDate: '2026-01-05',
    endDate: '2026-01-14',
    time: '9:00 PM - 11:00 PM',
    startTime: '21:00',
    endTime: '23:00',
    seatsTotal: 60,
    slots: 60,
    language: 'Hindi',
    mode: 'online'
  }
];

function makeRequest(scheduleData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/workshops/schedules/crud',
      method: 'PUT',
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
  console.log('🔄 Updating workshop schedules...\n');
  
  for (const schedule of scheduleUpdates) {
    const workshopName = schedule.workshopSlug.includes('level-1') ? 'Swar Yoga Level-1' : 'Swar Yoga Youth Program';
    
    console.log(`📝 Updating: ${workshopName}`);
    console.log(`   ID: ${schedule.id}`);
    console.log(`   Start Date: ${schedule.startDate}`);
    console.log(`   End Date: ${schedule.endDate}`);
    console.log(`   Time: ${schedule.time || 'Not specified'}`);
    console.log(`   Slots: ${schedule.seatsTotal}\n`);

    try {
      const result = await makeRequest(schedule);

      if (result.status === 200) {
        console.log(`✅ ${workshopName} updated successfully!\n`);
      } else if (result.status === 401) {
        console.error(`❌ Unauthorized (401). JWT token might be invalid.`);
        console.error(`   JWT_SECRET: ${JWT_SECRET === 'your-secret-key-change-in-production' ? '(default)' : '(set)'}`);
        process.exit(1);
      } else {
        console.error(`❌ Error (${result.status}):`, result.data);
        console.log('');
      }
    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
      console.log('');
    }
  }

  console.log('✨ All updates completed!\n');
}

run().catch(console.error);
