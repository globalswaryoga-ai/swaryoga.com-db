import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const code = '4/0AXlqoi4i14x_l2uyk_bQh11tF0jSbhFS8Vhx7tym5btBH0glEFRDncvw9A5TGmy9RG-Ivg';
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'https://crm.swaryoga.com/api/admin/social-media/youtube/oauth/callback';

async function run() {
  console.log("Exchanging code for token...");
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("Token error:", tokenData);
    return;
  }
  
  console.log("Token Data:", JSON.stringify(tokenData, null, 2));
  
  const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const channelData = await channelResponse.json();
  console.log("Channel Data:", JSON.stringify(channelData, null, 2));
}
run();
