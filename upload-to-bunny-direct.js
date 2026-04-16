#!/usr/bin/env node

/**
 * Direct Bunny Stream Video Upload
 * Bypasses API size limits - upload directly to Bunny CDN
 * Usage: node upload-to-bunny-direct.js <path-to-video.mp4>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '638748';

if (!BUNNY_API_KEY) {
  console.error('❌ ERROR: BUNNY_API_KEY is not set in .env.local');
  process.exit(1);
}

const videoPath = process.argv[2];

if (!videoPath) {
  console.error('❌ Usage: node upload-to-bunny-direct.js <video-file-path>');
  console.error('Example: node upload-to-bunny-direct.js sadhana-video.mp4');
  process.exit(1);
}

if (!fs.existsSync(videoPath)) {
  console.error(`❌ ERROR: File not found: ${videoPath}`);
  process.exit(1);
}

const fileName = path.basename(videoPath);
const fileSize = fs.statSync(videoPath).size;
const fileSizeMB = Math.round(fileSize / 1024 / 1024);

console.log(`\n📹 Direct Bunny Stream Upload`);
console.log('='.repeat(50));
console.log(`File: ${fileName}`);
console.log(`Size: ${fileSizeMB} MB`);
console.log(`Library: ${BUNNY_LIBRARY_ID}`);
console.log('');

async function uploadToBunnyDirect() {
  try {
    console.log('🚀 Uploading to Bunny CDN...');

    const form = new FormData();
    const fileStream = fs.createReadStream(videoPath);
    form.append('file', fileStream, fileName);

    return new Promise((resolve, reject) => {
      const url = `https://api.bunny.net/videolibrary/${BUNNY_LIBRARY_ID}/videos/upload`;

      const options = {
        hostname: 'api.bunny.net',
        path: `/videolibrary/${BUNNY_LIBRARY_ID}/videos/upload`,
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          ...form.getHeaders(),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              console.log(`\n✅ Upload successful!`);
              console.log(`\n🎬 Video Details:`);
              console.log(`   GUID: ${response.guid}`);
              console.log(`   Title: ${response.title}`);
              console.log(`   Duration: ${response.duration || 'Processing...'} seconds`);

              const cdnUrl = `https://vz-${BUNNY_LIBRARY_ID}.bunnycdn.com/${response.guid}.mp4`;
              const hlsUrl = `https://vz-${BUNNY_LIBRARY_ID}.bunnycdn.com/${response.guid}/playlist.m3u8`;

              console.log(`\n📍 CDN URLs:`);
              console.log(`\n   MP4 (Direct):`);
              console.log(`   ${cdnUrl}`);
              console.log(`\n   HLS (Streaming):`);
              console.log(`   ${hlsUrl}`);

              console.log(`\n💡 Next Step:`);
              console.log(`   1. Go to https://crm.swaryoga.com/admin/crm/sadhana-scheduler`);
              console.log(`   2. Copy the MP4 URL above`);
              console.log(`   3. Paste into "Sadhana Video URL" field`);
              console.log(`   4. Save schedule`);

              resolve(cdnUrl);
            } catch (e) {
              reject(new Error(`Invalid response: ${data}`));
            }
          } else {
            reject(new Error(`Upload failed (${res.statusCode}): ${data}`));
          }
        });
      });

      req.on('error', reject);
      form.pipe(req);

      // Show progress
      let uploadedBytes = 0;
      fileStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const percentComplete = Math.round((uploadedBytes / fileSize) * 100);
        process.stdout.write(`\r   Progress: ${percentComplete}%`);
      });
    });
  } catch (error) {
    console.error(`\n❌ Upload failed:`, error.message);
    process.exit(1);
  }
}

uploadToBunnyDirect();
