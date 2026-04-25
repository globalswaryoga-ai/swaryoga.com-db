/**
 * Script to update Swar Aahar Shastra recording thumbnail
 * Usage: node scripts/update-aahar-thumbnail.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function updateThumbnail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    // Get CommunityVideo model
    const { getCommunityVideo } = await import('../lib/db');
    const CommunityVideo = getCommunityVideo();

    const thumbnailUrl = 'https://vz-d0769ece-079.b-cdn.net/39135f72-5d16-4f22-baa3-7d2a28deebeb/thumbnail_a7afc153.jpg';
    const recordingTitle = 'Swar Aahar Shastra';

    console.log(`\n📝 Searching for: "${recordingTitle}"`);

    const updated = await CommunityVideo.findOneAndUpdate(
      { title: { $regex: new RegExp(recordingTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
      { thumbnailUrl },
      { new: true }
    );

    if (updated) {
      console.log(`✅ Updated successfully!`);
      console.log(`📌 Recording: ${updated.title}`);
      console.log(`🖼️  Thumbnail: ${updated.thumbnailUrl}`);
    } else {
      console.log(`❌ Recording "${recordingTitle}" not found`);
      console.log('\n📋 Available recordings:');
      const recordings = await CommunityVideo.find({}).select('title').limit(5).lean();
      recordings.forEach(r => console.log(`  - ${r.title}`));
    }

    await mongoose.connection.close();
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateThumbnail();
