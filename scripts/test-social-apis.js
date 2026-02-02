const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const secret = process.env.META_APP_SECRET;
const proof = crypto.createHmac('sha256', secret).update(fbToken).digest('hex');

async function test() {
  console.log('Testing APIs...\n');

  // Test Facebook
  try {
    const fbRes = await fetch(`https://graph.facebook.com/v24.0/232791777198228?fields=name,fan_count,followers_count&access_token=${fbToken}&appsecret_proof=${proof}`);
    const fb = await fbRes.json();
    if (fb.error) {
      console.log('❌ Facebook:', fb.error.message);
    } else {
      console.log('✅ Facebook:', fb.name, '- Followers:', fb.followers_count || fb.fan_count);
    }
  } catch (e) {
    console.log('❌ Facebook Error:', e.message);
  }

  // Test YouTube
  try {
    const ytKey = process.env.YOUTUBE_API_KEY;
    const ytChannel = process.env.YOUTUBE_CHANNEL_ID;
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${ytChannel}&key=${ytKey}`);
    const yt = await ytRes.json();
    if (yt.error) {
      console.log('❌ YouTube:', yt.error.message);
    } else if (yt.items && yt.items[0]) {
      const ch = yt.items[0];
      console.log('✅ YouTube:', ch.snippet.title, '- Subscribers:', ch.statistics.subscriberCount);
    } else {
      console.log('⚠️ YouTube: No channel data');
    }
  } catch (e) {
    console.log('❌ YouTube Error:', e.message);
  }

  // Check Instagram
  try {
    const igRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?fields=id,name,instagram_business_account&access_token=${fbToken}&appsecret_proof=${proof}`);
    const ig = await igRes.json();
    const hasInsta = ig.data?.some(p => p.instagram_business_account);
    if (hasInsta) {
      const page = ig.data.find(p => p.instagram_business_account);
      console.log('✅ Instagram linked to:', page.name, '- IG ID:', page.instagram_business_account.id);
    } else {
      console.log('⚠️ Instagram: Not linked to any Facebook Page');
    }
  } catch (e) {
    console.log('❌ Instagram Error:', e.message);
  }
}

test();
