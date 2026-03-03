#!/usr/bin/env node
/**
 * Test Zoom API endpoints directly to debug analytics data
 */
require('dotenv').config({ path: '.env.local' });

async function test() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  console.log('=== Zoom API Test ===');
  console.log('Credentials present:', { accountId: !!accountId, clientId: !!clientId, clientSecret: !!clientSecret });

  // 1) Get access token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!tokenRes.ok) {
    console.error('TOKEN ERROR:', await tokenRes.text());
    return;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  console.log('\nAccess token obtained successfully');
  console.log('Scopes:', tokenData.scope);

  const meetingId = '88246689132';

  // 2) Test past_meetings instances
  console.log(`\n--- GET /v2/past_meetings/${meetingId}/instances ---`);
  const instancesRes = await fetch(
    `https://api.zoom.us/v2/past_meetings/${meetingId}/instances`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log('Status:', instancesRes.status);
  const instancesText = await instancesRes.text();
  console.log('Response:', instancesText.slice(0, 2000));

  let instancesData;
  try {
    instancesData = JSON.parse(instancesText);
  } catch { instancesData = null; }

  // 3) Test direct report
  console.log(`\n--- GET /v2/report/meetings/${meetingId} ---`);
  const reportRes = await fetch(
    `https://api.zoom.us/v2/report/meetings/${meetingId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log('Status:', reportRes.status);
  const reportText = await reportRes.text();
  console.log('Response:', reportText.slice(0, 2000));

  // 4) Test participants on the meeting ID directly
  console.log(`\n--- GET /v2/report/meetings/${meetingId}/participants ---`);
  const partRes = await fetch(
    `https://api.zoom.us/v2/report/meetings/${meetingId}/participants?page_size=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log('Status:', partRes.status);
  const partText = await partRes.text();
  console.log('Response:', partText.slice(0, 2000));

  // 5) If instances found, test participants for first UUID
  if (instancesData && instancesData.meetings && instancesData.meetings.length > 0) {
    const firstUUID = instancesData.meetings[0].uuid;
    console.log(`\n--- Testing participants for first instance UUID: ${firstUUID} ---`);

    let encodedUUID = firstUUID;
    if (firstUUID.includes('/') || firstUUID.includes('//')) {
      encodedUUID = encodeURIComponent(encodeURIComponent(firstUUID));
      console.log('Double-encoded UUID:', encodedUUID);
    }

    const uuidPartRes = await fetch(
      `https://api.zoom.us/v2/report/meetings/${encodedUUID}/participants?page_size=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('Status:', uuidPartRes.status);
    const uuidPartText = await uuidPartRes.text();
    console.log('Response:', uuidPartText.slice(0, 3000));
  }

  // 6) Also try the Hindi morning meeting (849 0101 1677 -> 84901011677)
  const meetingId2 = '84901011677';
  console.log(`\n--- Also testing meeting ${meetingId2} (Hindi Morning) ---`);
  const instances2Res = await fetch(
    `https://api.zoom.us/v2/past_meetings/${meetingId2}/instances`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  console.log('Instances status:', instances2Res.status);
  const instances2Text = await instances2Res.text();
  console.log('Response:', instances2Text.slice(0, 1000));
}

test().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
