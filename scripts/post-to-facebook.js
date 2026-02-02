#!/usr/bin/env node
/**
 * Post to Facebook Page
 * Uses Page Access Token for the correct page
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// Set timeout for the whole script
setTimeout(() => {
  console.log('\n⏰ Script timed out after 20 seconds');
  process.exit(1);
}, 20000);

const appSecret = process.env.META_APP_SECRET;

function generateProof(token) {
  return crypto.createHmac('sha256', appSecret).update(token).digest('hex');
}

async function main() {
  const userToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const proof = generateProof(userToken);
  
  console.log('🔍 Getting your Facebook Pages...\n');
  
  // Get pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,fan_count&access_token=${userToken}&appsecret_proof=${proof}`
  );
  const pagesData = await pagesRes.json();
  
  if (pagesData.error) {
    console.log('❌ Error:', pagesData.error.message);
    return;
  }
  
  console.log('📄 Your Pages:');
  pagesData.data.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id}) - ${p.fan_count || 0} followers`);
  });
  
  // Use "Swar Yoga International Yoga & Naturopathy" - the one with 979 followers
  const page = pagesData.data.find(p => p.id === '232791777198228');
  
  if (!page) {
    console.log('\n❌ Target page not found. Using first page instead.');
    page = pagesData.data[0];
  }
  
  console.log(`\n📘 Posting to: ${page.name}\n`);
  
  const pageToken = page.access_token;
  const pageProof = generateProof(pageToken);
  
  const message = `🧘 Swar Yoga Daily Wisdom

"The breath is the bridge between the body and the mind."

Practice deep breathing today for 5 minutes and feel the difference!

#SwarYoga #Pranayama #DailyWisdom #Yoga #Wellness

📅 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  
  console.log('📝 Message:');
  console.log('─'.repeat(50));
  console.log(message);
  console.log('─'.repeat(50));
  console.log('\n⏳ Posting...\n');
  
  const postRes = await fetch(
    `https://graph.facebook.com/v24.0/${page.id}/feed?appsecret_proof=${pageProof}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        access_token: pageToken,
      }),
    }
  );
  
  const result = await postRes.json();
  
  if (result.error) {
    console.log('❌ Error:', result.error.message);
    if (result.error.code === 190) {
      console.log('   Token may have expired. Generate a new one at:');
      console.log('   https://developers.facebook.com/tools/explorer/');
    }
  } else {
    console.log('✅ SUCCESS! Post Created!');
    console.log('   Post ID:', result.id);
    console.log('   View at: https://facebook.com/' + result.id);
  }
}

main().catch(console.error);
