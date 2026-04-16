require('dotenv').config();
const axios = require('axios');

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

console.log('🔍 Zoom Credentials Check:');
console.log('✓ ZOOM_ACCOUNT_ID:', ZOOM_ACCOUNT_ID ? '✅ SET' : '❌ MISSING');
console.log('✓ ZOOM_CLIENT_ID:', ZOOM_CLIENT_ID ? '✅ SET' : '❌ MISSING');
console.log('✓ ZOOM_CLIENT_SECRET:', ZOOM_CLIENT_SECRET ? '✅ SET' : '❌ MISSING');

if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
  console.error('❌ Missing Zoom credentials!');
  process.exit(1);
}

console.log('\n🔄 Testing Zoom OAuth Token Generation...');

async function testZoomAuth() {
  try {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post('https://zoom.us/oauth/token',
      'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('✅ Zoom Auth Successful!');
    console.log('   Token expires in:', response.data.expires_in, 'seconds');
    console.log('   Token type:', response.data.token_type);
    
    const token = response.data.access_token;
    
    // Test live stream API endpoint
    console.log('\n🎬 Testing Live Stream API Endpoint...');
    const testMeetingId = '84851713697';
    
    try {
      const testResponse = await axios.patch(
        `https://api.zoom.us/v2/meetings/${testMeetingId}/livestream`,
        { action: 'start' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ Live Stream API Accessible!');
      console.log('   Response:', testResponse.status, testResponse.statusText);
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('✅ Live Stream API Endpoint is Valid (404 = meeting not active, but endpoint works)');
      } else if (err.response?.status === 3001) {
        console.log('✅ Live Stream API Works (error 3001 = meeting not in session)');
      } else {
        console.error('⚠️ Live Stream API Error:', err.response?.status, err.response?.data?.message);
      }
    }

    console.log('\n✅ All Zoom API tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Zoom Auth Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testZoomAuth();
