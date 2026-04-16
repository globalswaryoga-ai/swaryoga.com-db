#!/usr/bin/env node

/**
 * Test different Zoom API endpoints to find the correct way to share video in meeting
 * Reference: https://developers.zoom.us/docs/api/meeting-bot/
 */

const https = require('https');
require('dotenv').config();

const MEETING_ID = 84851713697;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;

const VIDEO_URL = 'https://vz-638748.bunnycdn.com/da4f8bdd-0e41-4b2a-a34c-c911074fb483/playlist.m3u8';

async function getZoomAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const body = 'grant_type=client_credentials&account_id=' + ZOOM_ACCOUNT_ID;

    const options = {
      hostname: 'zoom.us',
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.access_token);
        } catch (e) {
          reject(new Error('Failed to parse Zoom token: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testLivestreamEndpoint() {
  console.log('\n📌 Testing LIVESTREAM Endpoint (for Twitch/YouTube)\n');
  
  const token = await getZoomAccessToken();

  const body = JSON.stringify({
    action: 'start',
    settings: {
      stream_url: 'rtmps://live-api-s.facebook.com:443/rtmp/',
      stream_key: 'test_key_12345',
      page_url: 'https://www.facebook.com',
    },
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.zoom.us',
      path: `/v2/meetings/${MEETING_ID}/livestream`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('❌ Error:', err.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function testMeetingSettingsUpdate() {
  console.log('\n📌 Testing MEETING SETTINGS Update (generic update)\n');
  
  const token = await getZoomAccessToken();

  const body = JSON.stringify({
    settings: {
      host_video: true,
      participant_video: true,
    },
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.zoom.us',
      path: `/v2/meetings/${MEETING_ID}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('❌ Error:', err.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔍 Zoom API Endpoint Testing');
  console.log('Meeting ID:', MEETING_ID);
  console.log('Video URL:', VIDEO_URL);

  try {
    await testLivestreamEndpoint();
    await testMeetingSettingsUpdate();

    console.log('\n✅ Testing complete');
    console.log('\n📝 Analysis:');
    console.log('- Livestream endpoint: For streaming TO platforms (Twitch, Facebook, YouTube)');
    console.log('- NOT for playing video in meeting');
    console.log('\n💡 Better approach: Use Zoom Client SDK or Bot SDK to send chat message with video link');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
