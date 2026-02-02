const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Must match lib/encryption.ts EXACTLY
function getEncryptionKey() {
  let key = process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key';
  if (key.length < 32) {
    key = key.padEnd(32, '0');
  } else if (key.length > 32) {
    key = key.substring(0, 32);
  }
  return Buffer.from(key, 'utf-8');
}

function encryptCredential(text) {
  if (!text) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

async function setupAccounts() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  
  const now = new Date();
  const accounts = [];
  
  // Facebook
  const fbPageId = process.env.FACEBOOK_PAGE_ID;
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (fbPageId && fbToken) {
    accounts.push({
      platform: 'facebook',
      accountName: 'Swar Yoga International Yoga & Naturopathy',
      accountHandle: '@swaryoga',
      accountId: fbPageId,
      accountEmail: '',
      accessToken: encryptCredential(fbToken),
      refreshToken: '',
      isConnected: true,
      connectedAt: now,
      metadata: {
        followers: 979,
        following: 0,
        postsCount: 0,
        engagementRate: 0
      },
      grantedScopes: ['pages_read_engagement', 'pages_read_user_content'],
      createdAt: now,
      updatedAt: now
    });
    console.log('✅ Facebook account prepared - Page ID:', fbPageId);
  }
  
  // YouTube  
  const ytChannelId = process.env.YOUTUBE_CHANNEL_ID;
  const ytApiKey = process.env.YOUTUBE_API_KEY;
  if (ytChannelId && ytApiKey) {
    accounts.push({
      platform: 'youtube',
      accountName: 'Swar Yoga Science',
      accountHandle: '@SwarYogaScience',
      accountId: ytChannelId,
      accountEmail: '',
      accessToken: encryptCredential(ytApiKey),
      refreshToken: '',
      isConnected: true,
      connectedAt: now,
      metadata: {
        followers: 0, // Will be synced
        following: 0,
        postsCount: 0,
        engagementRate: 0
      },
      grantedScopes: [],
      createdAt: now,
      updatedAt: now
    });
    console.log('✅ YouTube account prepared - Channel ID:', ytChannelId);
  }
  
  // Instagram
  const igBusinessId = process.env.INSTAGRAM_BUSINESS_ID;
  const igToken = process.env.INSTAGRAM_BUSINESS_ACCESS_TOKEN;
  if (igBusinessId && igToken) {
    accounts.push({
      platform: 'instagram',
      accountName: 'swar.yoga',
      accountHandle: '@swar.yoga',
      accountId: igBusinessId,
      accountEmail: '',
      accessToken: encryptCredential(igToken),
      refreshToken: '',
      isConnected: true,
      connectedAt: now,
      metadata: {
        followers: 0, // Will be synced
        following: 0,
        postsCount: 0,
        engagementRate: 0
      },
      grantedScopes: ['instagram_basic'],
      createdAt: now,
      updatedAt: now
    });
    console.log('✅ Instagram account prepared - Business ID:', igBusinessId);
  }
  
  // Clear existing and insert fresh
  await db.collection('socialmediaaccounts').deleteMany({});
  console.log('\n🗑️ Cleared old accounts');
  
  // Insert accounts
  if (accounts.length > 0) {
    const result = await db.collection('socialmediaaccounts').insertMany(accounts);
    console.log('✅ Inserted', result.insertedCount, 'accounts');
  }
  
  // Summary
  const fb = accounts.find(a => a.platform === 'facebook');
  const yt = accounts.find(a => a.platform === 'youtube');
  const ig = accounts.find(a => a.platform === 'instagram');
  
  console.log('\n📊 SUMMARY:');
  console.log('   Facebook:', fb ? '✅ Connected' : '❌ Missing credentials');
  console.log('   YouTube:', yt ? '✅ Connected' : '❌ Missing credentials');
  console.log('   Instagram:', ig ? '✅ Connected' : '❌ Missing credentials');
  console.log('\n🔄 Refresh dashboard and click "Sync now" to get follower counts!');
  
  process.exit(0);
}

setupAccounts().catch(console.error);
