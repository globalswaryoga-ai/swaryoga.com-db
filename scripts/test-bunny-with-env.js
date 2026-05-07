require('dotenv').config({ path: '.env.local' });
const https = require('https');

async function testBunny() {
  console.log('🔍 Testing Bunny CDN with Environment Variables\n');
  console.log('═'.repeat(60));

  const BUNNY_ENDPOINT = process.env.BUNNY_STORAGE_ENDPOINT;
  const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE;
  const BUNNY_KEY = process.env.BUNNY_STORAGE_KEY;

  console.log('\n📋 Configuration from .env.local:');
  console.log(`   BUNNY_STORAGE_ENDPOINT: ${BUNNY_ENDPOINT}`);
  console.log(`   BUNNY_STORAGE_ZONE: ${BUNNY_ZONE}`);
  console.log(`   BUNNY_STORAGE_KEY: ${BUNNY_KEY ? BUNNY_KEY.substring(0, 10) + '...' : 'NOT SET'}`);

  if (!BUNNY_KEY || !BUNNY_ZONE) {
    console.log('\n❌ Missing Configuration');
    console.log('   Cannot test Bunny CDN without key and zone');
    return;
  }

  console.log('\n🧪 Testing Bunny Storage Connection...');
  console.log('─'.repeat(60));

  return new Promise((resolve) => {
    const options = {
      hostname: 'storage.bunnycdn.com',
      path: `/${BUNNY_ZONE}/`,
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_KEY,
      }
    };

    https.request(options, (res) => {
      console.log(`✅ Bunny Storage Connected`);
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   Status Message: ${res.statusMessage}`);
      console.log(`   Zone: ${BUNNY_ZONE}`);
      
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`\n✅ Zone is accessible and contains files`);
          try {
            const files = JSON.parse(data);
            console.log(`   Files/Folders: ${files.length}`);
            if (files.length > 0) {
              console.log(`   Sample entries: ${files.slice(0, 3).map(f => f.ObjectName).join(', ')}`);
            }
          } catch (e) {
            // Sometimes response is not JSON
          }
        } else {
          console.log(`\n📊 Response Status: ${res.statusCode}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`❌ Bunny Storage Connection Failed`);
      console.log(`   Error: ${err.message}`);
      resolve();
    }).end();
  });
}

testBunny().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Bunny CDN Test Complete\n');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
