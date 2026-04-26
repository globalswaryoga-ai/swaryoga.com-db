/**
 * Fix community videos that have Bunny CDN URLs but wrong/missing videoSource
 * Usage: MONGODB_URI=... node scripts/fix-bunny-videos.js
 */

const mongoose = require('mongoose');

async function fixBunnyVideos() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  if (!mongoUri) throw new Error('MONGODB_URI not set');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  const CommunityVideo = mongoose.models.CommunityVideo ||
    mongoose.model('CommunityVideo', new mongoose.Schema({}, { strict: false }));

  const all = await CommunityVideo.find({}).lean();
  console.log(`Total videos: ${all.length}`);

  // Show all videos with their current state
  console.log('\nCurrent video data:');
  all.forEach(v => {
    console.log(`  "${v.title}" | source=${v.videoSource} | s3Url=${v.s3Url?.substring(0,60)} | s3Key=${v.s3Key?.substring(0,60)}`);
  });

  let fixed = 0;
  for (const v of all) {
    const isBunnyCDN =
      (v.s3Url && v.s3Url.includes('b-cdn.net')) ||
      (v.s3Key && v.s3Key.includes('b-cdn.net')) ||
      (v.bunnyUrl && v.bunnyUrl.includes('b-cdn.net'));

    if (!isBunnyCDN) continue;

    const updates = {};
    const rawUrl = v.s3Url || v.s3Key || v.bunnyUrl || '';

    // Build proper HLS playlist URL
    let streamUrl = rawUrl;
    if (!streamUrl.includes('playlist.m3u8')) {
      const videoIdMatch = rawUrl.match(/\/([a-f0-9-]{36})/);
      const libraryMatch = rawUrl.match(/vz-([a-zA-Z0-9-]+)\./);
      if (videoIdMatch && libraryMatch) {
        streamUrl = `https://vz-${libraryMatch[1]}.b-cdn.net/${videoIdMatch[1]}/playlist.m3u8`;
      }
    }

    if (v.videoSource !== 'bunny-stream') updates.videoSource = 'bunny-stream';
    if (streamUrl && v.s3Url !== streamUrl) updates.s3Url = streamUrl;

    if (!v.thumbnailUrl && streamUrl) {
      const videoIdMatch = streamUrl.match(/\/([a-f0-9-]{36})/);
      const libraryMatch = streamUrl.match(/vz-([a-zA-Z0-9-]+)\./);
      if (videoIdMatch && libraryMatch) {
        updates.thumbnailUrl = `https://vz-${libraryMatch[1]}.b-cdn.net/${videoIdMatch[1]}/thumbnail.jpg`;
      }
    }

    if (Object.keys(updates).length > 0) {
      await CommunityVideo.updateOne({ _id: v._id }, { $set: updates });
      console.log(`\nFixed: "${v.title}"`);
      console.log(`  videoSource: ${v.videoSource} → ${updates.videoSource || v.videoSource}`);
      console.log(`  s3Url: ${updates.s3Url || '(unchanged)'}`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} videos.`);
  await mongoose.connection.close();
}

fixBunnyVideos().catch(e => { console.error(e); process.exit(1); });
