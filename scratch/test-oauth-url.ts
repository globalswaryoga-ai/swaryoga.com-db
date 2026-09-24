import { URL } from 'url';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const authUrl = new URL(GOOGLE_AUTH_URL);
authUrl.searchParams.set('client_id', 'test_client_id');
authUrl.searchParams.set('redirect_uri', 'https://crm.swaryoga.com/api/admin/social-media/youtube/oauth/callback');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl');
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');
authUrl.searchParams.set('state', 'test_token');
console.log(authUrl.toString());

