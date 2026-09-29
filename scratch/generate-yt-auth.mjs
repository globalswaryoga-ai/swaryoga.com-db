import dotenv from 'dotenv';
import { google } from 'googleapis';
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // special redirect uri for terminal/cli apps
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube',
  ],
});

console.log('\n======================================================');
console.log('1. Click this link to authorize YouTube:');
console.log('======================================================\n');
console.log(authUrl);
console.log('\n======================================================');
console.log('2. Sign in with swarsakshi9999@gmail.com and check all boxes.');
console.log('3. Copy the "Authorization Code" it gives you.');
console.log('4. Paste that code back here in our chat!');
console.log('======================================================\n');
