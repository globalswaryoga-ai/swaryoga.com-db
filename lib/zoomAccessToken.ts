export async function getZoomAccessToken(): Promise<string> {
  const { ZOOM_ACCOUNT_ID: accountId, ZOOM_CLIENT_ID: clientId, ZOOM_CLIENT_SECRET: clientSecret } = process.env;
  if (!accountId || !clientId || !clientSecret) throw new Error('Missing Zoom credentials in environment variables');
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Failed to get Zoom access token (${response.status})`);
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !data.access_token) throw new Error('Zoom returned no access token');
  return data.access_token;
}
