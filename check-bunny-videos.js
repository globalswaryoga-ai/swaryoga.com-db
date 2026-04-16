#!/usr/bin/env node

/**
 * Check Bunny CDN videos and get correct URL
 */

require('dotenv').config();

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '638748';
const BUNNY_ZONE_NAME = process.env.BUNNY_ZONE_NAME || 'swar-sadhana-video';

console.log('🎬 Bunny CDN Video Check');
console.log('='.repeat(50));
console.log(`Library ID: ${BUNNY_LIBRARY_ID}`);
console.log(`Zone Name: ${BUNNY_ZONE_NAME}`);
console.log(`API Key: ${BUNNY_API_KEY ? '✅ Configured' : '❌ Missing'}`);

if (!BUNNY_API_KEY) {
  console.error(
    '\n❌ ERROR: BUNNY_API_KEY is missing from .env.local'
  );
  console.log('\n📝 Required .env variables:');
  console.log('   BUNNY_API_KEY=your_api_key');
  console.log('   BUNNY_STREAM_LIBRARY_ID=your_library_id');
  console.log('   BUNNY_ZONE_NAME=your_zone_name');
  process.exit(1);
}

async function listBunnyCDNVideos() {
  try {
    console.log('\n📡 Fetching videos from Bunny CDN API...');

    const response = await fetch(
      `https://api.bunny.net/videolibrary/${BUNNY_LIBRARY_ID}/videos`,
      {
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ API Error (${response.status}): ${error}`);
      return;
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('❌ No videos found in Bunny CDN library');
      console.log(
        '\n📹 Next steps:\n' +
        '   1. Upload a video to Bunny Stream\n' +
        '   2. Use the video GUID\n' +
        '   3. URL format: https://vz-[libraryId].bunnycdn.com/[videoGuid]/playlist.m3u8'
      );
      return;
    }

    console.log(`\n✅ Found ${data.items.length} video(s):\n`);

    data.items.forEach((video, idx) => {
      console.log(`${idx + 1}. ${video.title || 'Untitled'}`);
      console.log(`   GUID: ${video.guid}`);
      console.log(`   Duration: ${video.duration || 'N/A'} seconds`);
      console.log(`   DASH URL: https://vz-${BUNNY_LIBRARY_ID}.bunnycdn.com/${video.guid}/playlist.mpd`);
      console.log(`   HLS URL: https://vz-${BUNNY_LIBRARY_ID}.bunnycdn.com/${video.guid}/playlist.m3u8`);
      console.log(`   MP4 URL: https://vz-${BUNNY_LIBRARY_ID}.bunnycdn.com/${video.guid}.mp4`);
      console.log('');
    });

    console.log('💡 For Zoom Live Stream, use MP4 URL or HLS URL');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

listBunnyCDNVideos();
