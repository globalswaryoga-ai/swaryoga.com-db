#!/usr/bin/env node
/**
 * Test posting to social media platforms
 * Posts a simple text message to Facebook (text posts don't work on Instagram/YouTube)
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

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

function decryptCredential(encryptedData) {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

function generateAppSecretProof(accessToken, appSecret) {
  if (!appSecret) return null;
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

async function testFacebookPost() {
  console.log('\n📘 Testing Facebook Post...');
  
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  if (!token || !pageId) {
    console.log('❌ Missing FACEBOOK_PAGE_ACCESS_TOKEN or FACEBOOK_PAGE_ID');
    return false;
  }
  
  const proof = generateAppSecretProof(token, appSecret);
  
  // Test message
  const testMessage = `🧘 Swar Yoga Daily Wisdom

"The breath is the bridge between the body and the mind."

Practice deep breathing today for 5 minutes and feel the difference!

#SwarYoga #Pranayama #DailyWisdom #Yoga #Wellness

📅 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  
  let url = `https://graph.facebook.com/v24.0/${pageId}/feed`;
  if (proof) url += `?appsecret_proof=${proof}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: testMessage,
        access_token: token,
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ Facebook Error:', data.error.message);
      return false;
    }
    
    console.log('✅ Facebook Post Created!');
    console.log('   Post ID:', data.id);
    console.log('   View at: https://facebook.com/' + data.id);
    return true;
  } catch (error) {
    console.log('❌ Facebook Error:', error.message);
    return false;
  }
}

async function testYouTubePost() {
  console.log('\n📺 Testing YouTube Community Post...');
  console.log('⚠️  YouTube Data API does NOT support community posts');
  console.log('   YouTube API only supports: video uploads, comments, playlists');
  console.log('   Community posts can only be created via YouTube Studio');
  return 'skipped';
}

async function testInstagramPost() {
  console.log('\n📸 Testing Instagram Post...');
  console.log('⚠️  Instagram API requires image/video URL');
  console.log('   Instagram does not support text-only posts');
  console.log('   To test: provide a public image URL');
  
  const token = process.env.INSTAGRAM_BUSINESS_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  if (!token || !igId) {
    console.log('❌ Missing INSTAGRAM_BUSINESS_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ID');
    return false;
  }
  
  // For a real test, we'd need an image URL
  // const testImageUrl = 'https://example.com/yoga-image.jpg';
  console.log('   Skipping actual post (no image URL provided)');
  return 'skipped';
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🚀 SOCIAL MEDIA POST TEST');
  console.log('═══════════════════════════════════════════════════════════');
  
  const results = {
    facebook: await testFacebookPost(),
    youtube: await testYouTubePost(),
    instagram: await testInstagramPost(),
  };
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Facebook:', results.facebook === true ? '✅ Posted' : results.facebook === 'skipped' ? '⏭️ Skipped' : '❌ Failed');
  console.log('   YouTube:', results.youtube === true ? '✅ Posted' : results.youtube === 'skipped' ? '⏭️ Skipped (API limitation)' : '❌ Failed');
  console.log('   Instagram:', results.instagram === true ? '✅ Posted' : results.instagram === 'skipped' ? '⏭️ Skipped (needs image)' : '❌ Failed');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
