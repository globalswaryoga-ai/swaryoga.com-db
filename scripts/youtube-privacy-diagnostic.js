#!/usr/bin/env node

/**
 * YouTube Video Privacy Diagnostic
 * 
 * Checks:
 * 1. Is YouTube OAuth connected?
 * 2. Can we verify video privacy?
 * 3. Can we auto-switch private → unlisted?
 * 4. Are community videos set up correctly?
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const DB_NAME = process.env.MONGODB_MAIN_DB_NAME;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN not configured in .env.local');
  process.exit(1);
}

async function diagnose() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     YouTube Video Privacy Diagnostic                       ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected');

    // Check YouTube OAuth connection
    console.log('\n🔐 Checking YouTube OAuth...');
    const SocialMediaAccountSchema = new mongoose.Schema({
      platform: String,
      email: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date,
      isVerified: Boolean,
    });
    const SocialMediaAccount = mongoose.model('SocialMediaAccount', SocialMediaAccountSchema);
    
    const youtubeAccount = await SocialMediaAccount.findOne({ platform: 'youtube' }).lean();
    
    if (!youtubeAccount) {
      console.log('❌ No YouTube account connected');
      console.log('   → Go to Admin Dashboard → Settings → Social Media');
      console.log('   → Connect your YouTube account');
    } else if (!youtubeAccount.refreshToken) {
      console.log('❌ YouTube account connected but no refresh token (try reconnecting)');
    } else {
      console.log('✅ YouTube account connected');
      console.log(`   Email: ${youtubeAccount.email}`);
    }

    // Check YouTube email verification
    console.log('\n📧 Checking YouTube email verification...');
    const YoutubeEmailVerificationSchema = new mongoose.Schema({
      email: { type: String, index: true },
      isVerified: Boolean,
      verifiedAt: Date,
      expiresAt: Date,
    });
    const YoutubeEmailVerification = mongoose.model('YoutubeEmailVerification', YoutubeEmailVerificationSchema);
    
    const verifiedEmails = await YoutubeEmailVerification.find({ isVerified: true }).lean();
    if (verifiedEmails.length === 0) {
      console.log('❌ No YouTube emails verified');
      console.log('   → Go to Admin Dashboard → Community → Verify YouTube Email');
    } else {
      console.log(`✅ ${verifiedEmails.length} YouTube email(s) verified:`);
      verifiedEmails.forEach((e: any) => {
        console.log(`   ✓ ${e.email} (expires: ${e.expiresAt})`);
      });
    }

    // Check community videos
    console.log('\n🎬 Checking community videos...');
    const CommunityVideoSchema = new mongoose.Schema({
      communityId: String,
      youtubeVideoId: String,
      youtubeUnlisted: Boolean,
      source: String,
      thumbnailUrl: String,
    });
    const CommunityVideo = mongoose.model('CommunityVideo', CommunityVideoSchema);
    
    const videos = await CommunityVideo.find({ source: 'youtube_recording' }).limit(5).lean();
    if (videos.length === 0) {
      console.log('ℹ️  No YouTube recordings in database yet');
    } else {
      console.log(`Found ${videos.length} YouTube videos:`);
      videos.forEach((v: any) => {
        console.log(`   • ${v.youtubeVideoId} (${v.communityId})`);
        console.log(`     - Unlisted flag: ${v.youtubeUnlisted}`);
        console.log(`     - Thumbnail: ${v.thumbnailUrl ? '✅' : '❌'}`);
      });
    }

    // Recommendations
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     RECOMMENDATIONS                                        ║
╚════════════════════════════════════════════════════════════╝

For YouTube videos to play in the community:

1️⃣  Connect YouTube OAuth
   → Admin Dashboard → Settings → Social Media → Connect YouTube
   → This allows auto-switching PRIVATE → UNLISTED

2️⃣  Verify YouTube Email  
   → Admin Dashboard → Community → Verify YouTube Email
   → Use your YouTube channel email (swarsakshi9@gmail.com)
   → Enter OTP sent to that email

3️⃣  Upload YouTube Video
   → Go to Community → Add YouTube Recording
   → Enter video URL
   → If video is PRIVATE, it will auto-switch to UNLISTED
   → If you get "Video unavailable" error, make sure YouTube email is verified

4️⃣  Test in Community
   → Go to Community → Recording tab
   → Click on the video
   → It should play (if UNLISTED or PUBLIC)
   → If it doesn't, the video is still PRIVATE on YouTube

5️⃣  Manual Fix (if auto-switch didn't work)
   → Go to YouTube Studio: https://studio.youtube.com
   → Find the video in your channel
   → Change privacy: PRIVATE → UNLISTED
   → Wait 1-2 minutes
   → Refresh community page
    `);

    await mongoose.disconnect();
    console.log('✅ Diagnostic complete\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnose();
