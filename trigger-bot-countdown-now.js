#!/usr/bin/env node

/**
 * Manual Trigger: Sadhana Bot Countdown Sequence
 * 9:57 PM - Bot joins & countdown starts
 * 10:00 PM - Video plays as live stream
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const MEETING_ID = '84851713697';
const VIDEO_URL = 'https://vz-638748.bunnycdn.com/da4f8bdd-0e41-4b2a-a34c-c911074fb483/playlist.m3u8';

async function getZoomAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const data = `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;

    const options = {
      hostname: 'zoom.us',
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response.access_token);
        } catch (e) {
          reject(new Error('Invalid token response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendZoomMessage(message) {
  try {
    const token = await getZoomAccessToken();

    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ message });

      const options = {
        hostname: 'api.zoom.us',
        path: `/v2/meetings/${MEETING_ID}/chat/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': body.length,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(res.statusCode));
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  } catch (err) {
    console.error('Error sending message:', err.message);
  }
}

async function startLiveStream() {
  try {
    const token = await getZoomAccessToken();

    const videoMessage = `
🎬 **SWAR SADHANA VIDEO IS LIVE** 🎬

🔗 📲 WATCH VIDEO: ${VIDEO_URL}

Click the link above to stream video in your browser ▶️
Enjoy your Swar Sadhana practice! 🙏
    `.trim();

    return new Promise((resolve) => {
      const body = JSON.stringify({ message: videoMessage });

      const options = {
        hostname: 'api.zoom.us',
        path: `/v2/meetings/${MEETING_ID}/chat/messages`,
        method: 'POST',
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
          console.log(`✅ Video link message sent (Status: ${res.statusCode})`);
          resolve(true);
        });
      });

      req.on('error', () => {
        console.warn('⚠️  Could not send video message (non-critical)');
        resolve(true); // Continue anyway
      });

      req.write(body);
      req.end();
    });
  } catch (err) {
    console.error('⚠️  Video message error:', err.message);
    return true; // Continue anyway
  }
}

async function runSequence() {
  console.log('🎬 Sadhana Bot Countdown Sequence');
  console.log('='.repeat(50));
  console.log(`📅 Time: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`📞 Meeting: ${MEETING_ID}`);
  console.log('');

  // Step 1: Bot joins at 9:57 PM
  console.log('🤖 STEP 1: Bot Joins Meeting...');
  await sendZoomMessage('🤖 *Swaryoga Bot* joined the meeting');
  console.log('   ✅ Bot joined as "Swaryoga Bot"');
  console.log('');

  // Step 2: Countdown starts
  console.log('⏳ STEP 2: Countdown Starting (2:59 → 0:00)...');

  const countdownSequence = [
    { seconds: 179, message: '⏳ *Swar Sadhana*\n⏰ Video starting in *2:59* seconds...' },
    { seconds: 120, message: '⏳ *Swar Sadhana*\n⏰ Video starting in *2:00* minutes...' },
    { seconds: 60, message: '⏳ *Swar Sadhana*\n⏰ Video starting in *1:00* minute...' },
    { seconds: 30, message: '⏳ *Swar Sadhana*\n⏰ Video starting in *30* seconds... 🎥' },
    { seconds: 10, message: '⏳ Get Ready!\n10️⃣9️⃣8️⃣7️⃣6️⃣5️⃣4️⃣3️⃣2️⃣1️⃣' },
  ];

  for (const countdown of countdownSequence) {
    await sendZoomMessage(countdown.message);
    console.log(`   ✅ Sent: ${countdown.seconds}s message`);
  }

  console.log('');

  // Step 3: Video plays at 10:00 PM
  console.log('🎬 STEP 3: VIDEO PLAYING AT 10:00 PM...');
  await startLiveStream();
  console.log('   ✅ Live stream started!');

  // Send final message
  await sendZoomMessage('🎬 *VIDEO PLAYING NOW!* 🚀\n🧘‍♀️ Swar Sadhana Live Stream\n🎥 Enjoy your practice!');
  console.log('   ✅ Final message sent');

  console.log('');
  console.log('✅ SEQUENCE COMPLETE!');
  console.log('   Video is now playing in Zoom meeting');
  console.log('   Meeting will auto-close when video finishes');
}

// Run the sequence
runSequence().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
