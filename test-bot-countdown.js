#!/usr/bin/env node

/**
 * Manual Test Script: Bot Join + Countdown + Video
 * 
 * Usage:
 *   node test-bot-countdown.js <action> <meetingId> [additionalSeconds]
 * 
 * Examples:
 *   node test-bot-countdown.js bot-join 848517136
 *   node test-bot-countdown.js countdown 848517136 179
 *   node test-bot-countdown.js video-start 848517136
 */

const https = require('https');
const dotenv = require('dotenv');

dotenv.config();

const BASE_URL = 'https://crm.swaryoga.com';

async function callApi(action, meetingId, additionalSeconds = 179) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      meetingId,
      action,
      countdownSeconds: additionalSeconds
    });

    const postData = {
      hostname: new URL(BASE_URL).hostname,
      path: '/api/admin/crm/sadhana-scheduler/bot-countdown',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    };

    console.log(`\n📡 Calling API...`);
    console.log(`   Action: ${action}`);
    console.log(`   Meeting ID: ${meetingId}`);
    if (action === 'countdown') {
      const mins = Math.floor(additionalSeconds / 60);
      const secs = additionalSeconds % 60;
      console.log(`   Countdown: ${mins}:${secs.toString().padStart(2, '0')}`);
    }

    const req = https.request(postData, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const [, , action, meetingId, seconds] = process.argv;

  if (!action || !meetingId) {
    console.log(`
❌ Missing arguments!

Usage:
  node test-bot-countdown.js <action> <meetingId> [seconds]

Actions:
  bot-join    - 🤖 Bot joins meeting (Swaryoga Bot)
  countdown   - ⏳ Show countdown message (default 2:59)
  video-start - 🎥 Start video playing

Examples:
  node test-bot-countdown.js bot-join 848517136
  node test-bot-countdown.js countdown 848517136 179
  node test-bot-countdown.js video-start 848517136

Test Sequence:
  1. node test-bot-countdown.js bot-join 848517136
  2. node test-bot-countdown.js countdown 848517136 179
  3. node test-bot-countdown.js countdown 848517136 60
  4. node test-bot-countdown.js countdown 848517136 30
  5. node test-bot-countdown.js video-start 848517136
    `);
    process.exit(1);
  }

  try {
    const countdownSeconds = seconds ? parseInt(seconds) : 179;
    const result = await callApi(action, meetingId, countdownSeconds);
    
    console.log(`\n✅ Response (${result.status}):`);
    console.log(JSON.stringify(result.data, null, 2));
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

main();
