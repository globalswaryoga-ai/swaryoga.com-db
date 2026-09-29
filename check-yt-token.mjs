import dotenv from 'dotenv';
import { google } from 'googleapis';
dotenv.config();

async function check() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  try {
    const res = await youtube.channels.list({ part: ['snippet'], mine: true });
    console.log(res.data.items.map(i => i.snippet.title));
  } catch(e) {
    console.error(e.message);
  }
}
check();
