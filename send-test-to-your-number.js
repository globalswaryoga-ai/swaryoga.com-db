#!/usr/bin/env node

/**
 * Send test message to user's WhatsApp number via Meta API
 */

const https = require('https');
require('dotenv').config();

const PHONE_NUMBER = '919309986820';
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function sendTestMessage() {
  try {
    console.log('📱 Sending test message to', PHONE_NUMBER);
    console.log('Phone ID:', PHONE_ID);
    console.log('');

    const message = `🧘‍♀️ *Swar Sadhana Video Ready!*

Hi! Your Swar Sadhana video is now available.

📹 *Watch Now:*
https://vz-638748.bunnycdn.com/da4f8bdd-0e41-4b2a-a34c-c911074fb483/playlist.m3u8

🎥 *Join Zoom Meeting:*
https://us06web.zoom.us/j/84851713697

Let's begin! 🙏`;

    const body = JSON.stringify({
      messaging_product: 'whatsapp',
      to: PHONE_NUMBER,
      type: 'text',
      text: {
        body: message,
      },
    });

    const options = {
      hostname: 'graph.instagram.com',
      path: `/v24.0/${PHONE_ID}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          console.log('Response:', data);
          
          try {
            const json = JSON.parse(data);
            if (json.messages?.[0]?.id) {
              console.log('\n✅ Message sent successfully!');
              console.log('Message ID:', json.messages[0].id);
            } else if (json.error) {
              console.log('\n❌ Error:', json.error.message);
            }
          } catch (e) {
            console.log('\n⚠️ Could not parse response');
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

sendTestMessage();
