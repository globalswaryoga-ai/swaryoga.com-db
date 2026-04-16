#!/usr/bin/env node

/**
 * Test sending via production API endpoint
 */

const https = require('https');

const PHONE = '919309986820';

async function sendViaProductionEndpoint() {
  try {
    console.log('📱 Testing Sadhana message via production endpoint');
    console.log('Phone: +' + PHONE);
    console.log('');

    const body = JSON.stringify({
      toPhone: PHONE,
      message: `🧘‍♀️ *Swar Sadhana Video Ready!*

Hi! Your Swar Sadhana video is now available.

📹 *Watch Now:*
https://vz-638748.bunnycdn.com/da4f8bdd-0e41-4b2a-a34c-c911074fb483/playlist.m3u8

🎥 *Join Zoom Meeting:*
https://us06web.zoom.us/j/84851713697

Let's begin! 🙏`,
      channel: 'meta'
    });

    const options = {
      hostname: 'crm.swaryoga.com',
      path: '/api/admin/crm/whatsapp/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          console.log('Response:', data.substring(0, 200));
          
          try {
            const json = JSON.parse(data);
            if (json.success) {
              console.log('\n✅ Message sent successfully!');
            } else if (json.error) {
              console.log('\n❌ Error:', json.error);
            }
          } catch (e) {
            if (res.statusCode === 200 || res.statusCode === 201) {
              console.log('\n✅ Message sent!');
            } else {
              console.log('\n⚠️ Status', res.statusCode);
            }
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        console.error('Request error:', err.message);
        resolve();
      });

      req.write(body);
      req.end();
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

sendViaProductionEndpoint();
