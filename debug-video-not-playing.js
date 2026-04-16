#!/usr/bin/env node

/**
 * Debug script to check why video didn't play at 9:15 PM
 * and manually trigger it now
 */

require('dotenv').config();
const mongoose = require('mongoose');

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

async function getZoomAccessToken() {
  try {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID,
    });

    if (!response.ok) throw new Error('Failed to get Zoom token');
    const data = await response.json();
    return data.access_token;
  } catch (err) {
    console.error('Zoom token error:', err);
    throw err;
  }
}

async function startZoomLiveStream(meetingId, videoUrl) {
  try {
    const token = await getZoomAccessToken();
    console.log(`\n🔍 [Debug] Starting live stream for meeting ${meetingId}`);
    console.log(`📹 Video URL: ${videoUrl}`);

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/livestream`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'start',
        settings: {
          live_streaming_url: videoUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Zoom API Error: ${error}`);
      throw new Error(`Zoom API error: ${error}`);
    }

    console.log(`✅ Live stream started successfully!`);
    return true;
  } catch (err) {
    console.error('❌ Live stream error:', err.message);
    throw err;
  }
}

async function main() {
  try {
    console.log('\n🔍 DEBUG: Video Not Playing Investigation');
    console.log('=' .repeat(50));
    console.log(`Current Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // Connect to MongoDB
    console.log('\n📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    console.log('✅ MongoDB connected');

    // Find the schedule
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    const schedulesCollection = db.collection('sadhana_schedules');
    
    const schedule = await schedulesCollection.findOne({ status: 'active' });
    
    if (!schedule) {
      console.log('❌ ERROR: No active schedule found!');
      console.log('   Check MongoDB: sadhana_schedules collection');
      process.exit(1);
    }

    console.log('\n✅ Schedule Found:');
    console.log(`   Name: ${schedule.name}`);
    console.log(`   Video URL: ${schedule.videoUrl}`);
    console.log(`   Zoom Link: ${schedule.zoomLink}`);
    console.log(`   Scheduled Times: ${schedule.schedule.times.join(', ')}`);
    console.log(`   Status: ${schedule.status}`);

    // Extract Zoom meeting ID
    const zoomMatch = schedule.zoomLink.match(/j\/(\d+)/);
    if (!zoomMatch) {
      console.log('❌ ERROR: Could not extract Zoom meeting ID from link');
      process.exit(1);
    }

    const meetingId = zoomMatch[1];
    console.log(`\n🎯 Zoom Meeting ID: ${meetingId}`);

    // Why didn't cron trigger?
    console.log('\n🔍 Analyzing Cron Timing:');
    const now = new Date();
    const bangladeshTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentHour = bangladeshTime.getHours();
    const currentMinute = bangladeshTime.getMinutes();
    const currentTime = `${currentHour}:${String(currentMinute).padStart(2, '0')}`;
    console.log(`   Current Time (IST): ${currentTime}`);
    console.log(`   Scheduled Times: ${schedule.schedule.times.join(', ')}`);

    // Check if we're close to scheduled time
    const timeDiff = Math.abs(parseInt(currentHour) * 60 + parseInt(currentMinute) - 
                               parseInt(schedule.schedule.times[0].split(':')[0]) * 60 - 
                               parseInt(schedule.schedule.times[0].split(':')[1]));
    console.log(`   Time Difference from Schedule: ${timeDiff} minutes`);

    if (timeDiff > 5) {
      console.log('\n⚠️  The scheduled time has passed!');
      console.log('   This is why the cron didn\'t trigger (outside 5-minute window)');
    }

    // MANUALLY START VIDEO NOW
    console.log('\n🎬 MANUALLY STARTING VIDEO NOW...');
    await startZoomLiveStream(meetingId, schedule.videoUrl);

    console.log('\n✅ Video triggered! Check your Zoom meeting now.');
    console.log(`   Meeting: https://us06web.zoom.us/j/${meetingId}`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Debug Error:', error.message);
    process.exit(1);
  }
}

main();
