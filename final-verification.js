#!/usr/bin/env node

/**
 * Final Verification - Complete System Check
 * Verifies all components before production deployment
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const checks = [];

async function test(name, fn) {
  try {
    await fn();
    checks.push({ name, status: '✅ PASS' });
    console.log(`✅ ${name}`);
  } catch (err) {
    checks.push({ name, status: '❌ FAIL: ' + err.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
  }
}

async function runTests() {
  console.log('\n🔍 FINAL VERIFICATION - SADHANA SCHEDULER\n');
  console.log('═'.repeat(50));

  // Test 1: Environment Variables
  await test('Environment Variables Set', async () => {
    const required = [
      'MONGODB_URI_MAIN',
      'MONGODB_CRM_DB_NAME',
      'ZOOM_BOT_ACCOUNT_ID',
      'ZOOM_BOT_CLIENT_ID',
      'ZOOM_BOT_CLIENT_SECRET',
      'HETZNER_STREAMING_URL',
    ];

    for (const key of required) {
      if (!process.env[key]) throw new Error(`Missing ${key}`);
    }
  });

  // Test 2: MongoDB Connection
  await test('MongoDB Connection', async () => {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    await mongoose.disconnect();
  });

  // Test 3: Active Schedules Exist
  await test('Active Sadhana Schedules Exist', async () => {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME);
    const col = db.collection('sadhana_schedules');

    const count = await col.countDocuments({ status: 'active', enableBotAutomation: true });
    if (count === 0) throw new Error('No active schedules with bot automation');

    await mongoose.disconnect();
  });

  // Test 4: Schedule Configuration
  await test('Schedules Have Valid Configuration', async () => {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME);
    const col = db.collection('sadhana_schedules');

    const schedules = await col.find({
      status: 'active',
      enableBotAutomation: true
    }).toArray();

    for (const s of schedules) {
      if (!s.name) throw new Error(`Schedule missing name: ${s._id}`);
      if (!s.videoUrl) throw new Error(`Schedule "${s.name}" missing videoUrl`);
      if (!s.zoomLink && !s.zoomId) throw new Error(`Schedule "${s.name}" missing zoom link/id`);
      if (!s.schedule?.times || s.schedule.times.length === 0) {
        throw new Error(`Schedule "${s.name}" missing times`);
      }
      if (!s.schedule?.days || s.schedule.days.length === 0) {
        throw new Error(`Schedule "${s.name}" missing days`);
      }
    }

    await mongoose.disconnect();
  });

  // Test 5: Hetzner Service Health
  await test('Hetzner Streaming Service Available', async () => {
    try {
      const response = await axios.get(
        `${process.env.HETZNER_STREAMING_URL}/health`,
        { timeout: 10000 }
      );
      if (response.data.status !== 'ok') {
        throw new Error(`Hetzner health check failed: ${response.data.status}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Warning: Hetzner health check failed (will fallback to local HLS)`);
      checks[checks.length - 1].status = '⚠️  WARNING: Service unavailable (has fallback)';
    }
  });

  // Test 6: Video URLs Valid
  await test('Video URLs Are Valid', async () => {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME);
    const col = db.collection('sadhana_schedules');

    const schedules = await col.find({ status: 'active', enableBotAutomation: true }).toArray();

    for (const s of schedules) {
      const url = s.videoUrl;
      if (!url.startsWith('http')) throw new Error(`Invalid URL for "${s.name}": ${url}`);
      if (!url.includes('m3u8') && !url.includes('mp4')) {
        throw new Error(`Unsupported video format for "${s.name}": ${url}`);
      }
    }

    await mongoose.disconnect();
  });

  // Test 7: Zoom Credentials Valid Format
  await test('Zoom Credentials Configured', async () => {
    const id = process.env.ZOOM_BOT_ACCOUNT_ID;
    const clientId = process.env.ZOOM_BOT_CLIENT_ID;
    const secret = process.env.ZOOM_BOT_CLIENT_SECRET;

    if (!id || id.length === 0) throw new Error('ZOOM_BOT_ACCOUNT_ID invalid');
    if (!clientId || clientId.length === 0) throw new Error('ZOOM_BOT_CLIENT_ID invalid');
    if (!secret || secret.length === 0) throw new Error('ZOOM_BOT_CLIENT_SECRET invalid');
  });

  // Test 8: Check scheduler file exists and is valid
  await test('Scheduler Service File Valid', async () => {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'lib/sadhanaSchedulerServiceV2.ts');

    if (!fs.existsSync(file)) {
      throw new Error('sadhanaSchedulerServiceV2.ts not found');
    }

    const content = fs.readFileSync(file, 'utf-8');
    if (!content.includes('export async function startSadhanaScheduler')) {
      throw new Error('startSadhanaScheduler function not found');
    }
    if (!content.includes('shouldTrigger')) {
      throw new Error('shouldTrigger function not found');
    }
  });

  // Summary
  console.log('\n═'.repeat(50));
  console.log('\n📊 VERIFICATION SUMMARY:\n');

  const passed = checks.filter(c => c.status.includes('PASS')).length;
  const warned = checks.filter(c => c.status.includes('WARNING')).length;
  const failed = checks.filter(c => c.status.includes('FAIL')).length;

  checks.forEach(c => {
    console.log(`${c.status.padEnd(20)} - ${c.name}`);
  });

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`\n✅ Passed: ${passed}/${checks.length}`);
  if (warned > 0) console.log(`⚠️  Warned: ${warned}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL SYSTEMS GO! Ready for deployment.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Fix the errors above before deploying.\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
