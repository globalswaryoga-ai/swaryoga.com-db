#!/usr/bin/env node

/**
 * Fix Sadhana video URL in MongoDB
 * Updates the schedule with the correct Bunny CDN streaming URL
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const BUNNY_GUID = 'da4f8bdd-0e41-4b2a-a34c-c911074fb483';
const LIBRARY_ID = '638748';

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI_MAIN not found in .env.local');
  process.exit(1);
}

async function fixVideoUrl() {
  try {
    console.log('🎬 Fixing Sadhana Video URL...');
    console.log('='.repeat(50));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    const schedules = db.collection('sadhana_schedules');

    // Find current schedule
    const current = await schedules.findOne({ name: /Daily sadhana/i });
    if (!current) {
      console.log('❌ No schedule found');
      process.exit(1);
    }

    console.log('\n📋 Current Schedule:');
    console.log(`   Name: ${current.name}`);
    console.log(`   Video URL: ${current.videoUrl}`);
    console.log(`   Status: ${current.status}`);

    // Try different URL formats
    const urlOptions = [
      {
        name: 'HLS (Streaming - Best for Zoom)',
        url: `https://vz-${LIBRARY_ID}.bunnycdn.com/${BUNNY_GUID}/playlist.m3u8`,
      },
      {
        name: 'DASH',
        url: `https://vz-${LIBRARY_ID}.bunnycdn.com/${BUNNY_GUID}/playlist.mpd`,
      },
      {
        name: 'Direct MP4',
        url: `https://vz-${LIBRARY_ID}.bunnycdn.com/${BUNNY_GUID}.mp4`,
      },
      {
        name: 'Bunny Player (Web)',
        url: `https://player.mediadelivery.net/play/${LIBRARY_ID}/${BUNNY_GUID}`,
      },
    ];

    console.log('\n✨ Available URL formats:');
    urlOptions.forEach((opt, idx) => {
      console.log(`   ${idx + 1}. ${opt.name}`);
      console.log(`      ${opt.url}`);
    });

    // Use HLS URL (most compatible with Zoom)
    const newUrl = urlOptions[0].url;

    console.log(`\n🔄 Updating with: ${urlOptions[0].name}`);
    console.log(`   URL: ${newUrl}`);

    const result = await schedules.updateOne(
      { name: /Daily sadhana/i },
      { $set: { videoUrl: newUrl } }
    );

    console.log(`\n✅ Update successful!`);
    console.log(`   Modified: ${result.modifiedCount} schedule(s)`);

    // Verify
    const updated = await schedules.findOne({ name: /Daily sadhana/i });
    console.log('\n✅ Verification:');
    console.log(`   Name: ${updated.name}`);
    console.log(`   Video URL: ${updated.videoUrl}`);
    console.log(`   Status: ${updated.status}`);
    console.log(`   Schedule: ${updated.schedule.times.join(', ')} (${updated.schedule.days.join(', ')})`);

    console.log('\n🚀 Ready! Next scheduled time: ${updated.schedule.times[0]} today');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

fixVideoUrl();
