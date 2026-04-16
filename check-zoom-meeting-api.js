#!/usr/bin/env node

/**
 * Check available Zoom meeting APIs and find working endpoint for meeting updates
 */

const https = require('https');
require('dotenv').config();

const MEETING_ID = 84851713697;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;

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
          reject(new Error('Failed to parse token: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testEndpoint(name, method, path, body = null) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   ${method} ${path}`);

  const token = await getZoomAccessToken();

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.zoom.us',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 404) {
          console.log(`   ❌ Endpoint not found`);
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          console.log(`   ❌ Unauthorized`);
        } else {
          console.log(`   ✅ Response received`);
          if (data && data.length < 200) {
            console.log(`   Data: ${data.substring(0, 100)}`);
          }
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
      resolve();
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function main() {
  console.log('🔎 Zoom API Meeting Endpoints Check');
  console.log('Account ID:', ZOOM_ACCOUNT_ID);
  console.log('Meeting ID:', MEETING_ID);

  try {
    // Test various endpoints
    await testEndpoint(
      'Get Meeting Details',
      'GET',
      `/v2/meetings/${MEETING_ID}`
    );

    await testEndpoint(
      'Get Meeting Recording Status',
      'GET',
      `/v2/meetings/${MEETING_ID}/recordings`
    );

    await testEndpoint(
      'Update Meeting with Description',
      'PATCH',
      `/v2/meetings/${MEETING_ID}`,
      JSON.stringify({
        agenda: 'Swar Sadhana Video is now available - https://vz-638748.bunnycdn.com/da4f8bdd-0e41-4b2a-a34c-c911074fb483/playlist.m3u8',
      })
    );

    await testEndpoint(
      'Send Meeting Notification',
      'POST',
      `/v2/meetings/${MEETING_ID}/chat/messages`,
      JSON.stringify({ message: 'Test message' })
    );

    await testEndpoint(
      'Get Chat Messages',
      'GET',
      `/v2/meetings/${MEETING_ID}/chat/messages`
    );

    console.log('\n\n📝 Summary:');
    console.log('- Checkout which endpoints are available');
    console.log('- Chat endpoint seems to not exist for server API');
    console.log('- Best approach: Use WhatsApp to send video link to participants');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
