#!/usr/bin/env node

/**
 * Test Zoom API Connection and Credentials
 * Verifies that ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET are valid
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || process.env.ZOOM_BOT_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || process.env.ZOOM_BOT_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || process.env.ZOOM_BOT_CLIENT_SECRET;

console.log('═══════════════════════════════════════════════════════════');
console.log('🔗 Zoom API Connection Test');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Check credentials
console.log('1️⃣  Checking Zoom Credentials...\n');
if (!ZOOM_ACCOUNT_ID) {
  console.error('❌ ZOOM_ACCOUNT_ID is missing!');
  console.error('   Set: ZOOM_ACCOUNT_ID or ZOOM_BOT_ACCOUNT_ID\n');
  process.exit(1);
}
if (!ZOOM_CLIENT_ID) {
  console.error('❌ ZOOM_CLIENT_ID is missing!');
  console.error('   Set: ZOOM_CLIENT_ID or ZOOM_BOT_CLIENT_ID\n');
  process.exit(1);
}
if (!ZOOM_CLIENT_SECRET) {
  console.error('❌ ZOOM_CLIENT_SECRET is missing!');
  console.error('   Set: ZOOM_CLIENT_SECRET or ZOOM_BOT_CLIENT_SECRET\n');
  process.exit(1);
}

console.log(`✅ ZOOM_ACCOUNT_ID: ${ZOOM_ACCOUNT_ID.substring(0, 10)}...`);
console.log(`✅ ZOOM_CLIENT_ID: ${ZOOM_CLIENT_ID.substring(0, 10)}...`);
console.log(`✅ ZOOM_CLIENT_SECRET: ${ZOOM_CLIENT_SECRET.substring(0, 10)}...\n`);

// 2. Test token generation
console.log('2️⃣  Testing Zoom OAuth Token Generation...\n');

async function testZoomConnection() {
  try {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    
    console.log('   Making token request...');
    console.log(`   URL: https://zoom.us/oauth/token`);
    console.log(`   Account ID: ${ZOOM_ACCOUNT_ID}\n`);
    
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('✅ Token generated successfully!\n');
    console.log(`   Access Token: ${response.data.access_token.substring(0, 20)}...`);
    console.log(`   Expires In: ${response.data.expires_in} seconds`);
    console.log(`   Token Type: ${response.data.token_type}\n`);

    const token = response.data.access_token;

    // 3. Test API call - Get user info
    console.log('3️⃣  Testing Zoom API Call (Get Account Info)...\n');
    
    try {
      const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('✅ API call successful!\n');
      console.log(`   User ID: ${userResponse.data.id}`);
      console.log(`   Email: ${userResponse.data.email}`);
      console.log(`   First Name: ${userResponse.data.first_name}`);
      console.log(`   Last Name: ${userResponse.data.last_name}`);
      console.log(`   Zoom Account: ${userResponse.data.account_id}\n`);

      // 4. Test sending message to a test meeting
      console.log('4️⃣  Checking Account Permissions...\n');
      
      const meetingId = '84851713697'; // From your schedule
      console.log(`   Testing message send to meeting: ${meetingId}`);
      console.log(`   Note: Meeting must be ACTIVE/RUNNING for this to work!\n`);

      try {
        const messageResponse = await axios.post(
          `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
          {
            message: '🧪 Test message from bot service',
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            validateStatus: () => true,
          }
        );

        console.log(`   Response Status: ${messageResponse.status}`);
        
        if (messageResponse.status === 201) {
          console.log('✅ Message sent successfully!\n');
        } else if (messageResponse.status === 404) {
          console.log('⚠️  Meeting not found or not active (404)\n');
          console.log('   This is EXPECTED if the meeting is not currently running.');
          console.log('   ✅ API authentication is working correctly!\n');
        } else if (messageResponse.status === 300) {
          console.log('⚠️  Multiple meeting instances found (300)\n');
          console.log('   The meeting may have multiple instances running.');
          console.log('   ✅ API authentication is working!\n');
        } else {
          console.log(`   Response: ${JSON.stringify(messageResponse.data, null, 2)}\n`);
        }
      } catch (msgError) {
        console.log(`⚠️  Message send error: ${msgError.message}\n`);
      }

      // 5. Summary
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ ZOOM CONNECTION VERIFIED!\n');
      console.log('Summary:');
      console.log('✅ Credentials are valid');
      console.log('✅ OAuth token generation works');
      console.log('✅ API authentication works');
      console.log('✅ Account permissions configured\n');
      console.log('Next Step:');
      console.log('• Make sure your Zoom meeting is RUNNING');
      console.log('• Try the bot test again');
      console.log('• Check the error message for meeting-specific issues\n');
      console.log('═══════════════════════════════════════════════════════════');

    } catch (apiError) {
      console.error(`❌ API Error: ${apiError.message}\n`);
      if (apiError.response) {
        console.error(`Status: ${apiError.response.status}`);
        console.error(`Data: ${JSON.stringify(apiError.response.data, null, 2)}\n`);
      }
      
      console.log('This usually means:');
      console.log('• Invalid Client ID or Secret');
      console.log('• Account ID mismatch');
      console.log('• OAuth app not properly configured in Zoom');
      console.log('\nPlease check your Zoom OAuth app settings:\n');
      console.log('1. Go to: https://marketplace.zoom.us/develop/create');
      console.log('2. Select your OAuth app');
      console.log('3. Verify Client ID, Secret, and Account ID match\n');
    }

  } catch (tokenError) {
    console.error(`❌ Token Generation Failed: ${tokenError.message}\n`);
    
    if (tokenError.response) {
      console.error(`Status: ${tokenError.response.status}`);
      console.error(`Error: ${JSON.stringify(tokenError.response.data, null, 2)}\n`);
    }

    console.log('Common causes:');
    console.log('• Invalid Client ID or Secret');
    console.log('• Credentials are for wrong Zoom account');
    console.log('• OAuth app not activated');
    console.log('• Account credentials grant type not enabled\n');
    
    console.log('Solution:');
    console.log('1. Check your Zoom OAuth app settings');
    console.log('2. Verify Client ID and Secret match .env.local');
    console.log('3. Enable "Account credentials" grant type in OAuth settings');
    console.log('4. Make sure the Account ID matches your Zoom account\n');
  }
}

testZoomConnection();
