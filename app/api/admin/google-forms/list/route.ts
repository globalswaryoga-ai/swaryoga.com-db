import { NextRequest, NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { resolveGoogleAccounts, getGoogleAccessToken, refreshGoogleAccessToken } from '@/lib/googleFormsAccounts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const userScope = viewer.superAdmin ? 'shared' : viewer.userId;
    let accounts = await resolveGoogleAccounts(userScope);
    if (!accounts.length && userScope !== 'shared') {
      accounts = await resolveGoogleAccounts('shared');
    }
    if (!accounts.length) return NextResponse.json({ error: 'Google Forms is not connected. Reconnect Google.', needsAuth: true }, { status: 401 });
    const errors: string[] = [];
    for (const entry of accounts) {
      try {
        let token = await getGoogleAccessToken(entry);
        if (entry.account.tokenExpiresAt && new Date(entry.account.tokenExpiresAt).getTime() <= Date.now() + 60000 && entry.account.refreshToken) {
          try {
            token = await refreshGoogleAccessToken(entry);
          } catch (refreshErr) {
            console.warn('[Google Forms List] Preemptive token refresh failed:', refreshErr);
          }
        }
        const forms: Array<{ id: string; name: string; webViewLink?: string }> = [];
        let pageToken = '';
        const pageTokens = new Set<string>();
        do {
          if (pageTokens.has(pageToken)) throw new Error('Google Drive returned a repeated page token.');
          pageTokens.add(pageToken);
          const url = new URL('https://www.googleapis.com/drive/v3/files');
          url.search = new URLSearchParams({
            q: "mimeType='application/vnd.google-apps.form' and trashed=false",
            fields: 'nextPageToken,files(id,name,webViewLink)', pageSize: '100', ...(pageToken ? { pageToken } : {}),
          }).toString();
          const fetchPage = () => fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
          let response = await fetchPage();
          if ((response.status === 401 || response.status === 403) && entry.account.refreshToken) {
            token = await refreshGoogleAccessToken(entry);
            response = await fetchPage();
          }
          if (!response.ok) throw new Error(`Google Drive form list failed (${response.status}). Reconnect Google and grant Drive access.`);
          const data = await response.json() as { files?: typeof forms; nextPageToken?: string };
          if (data.files !== undefined && !Array.isArray(data.files)) throw new Error('Google Drive returned an invalid form list.');
          forms.push(...(data.files || []));
          pageToken = data.nextPageToken || '';
        } while (pageToken);
        return NextResponse.json({ forms }, { headers: { 'Cache-Control': 'private, no-store' } });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Google Forms account unavailable.');
      }
    }
    return NextResponse.json({ error: errors.join('; '), needsAuth: true }, {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[Google Forms List] Failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Google Forms list unavailable.' }, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }
}
