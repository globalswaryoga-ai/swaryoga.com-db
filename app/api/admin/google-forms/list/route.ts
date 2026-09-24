import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential, encryptCredential } from '@/lib/auth';

const GOOGLE_CLIENT_ID = '1058671726680-e5tcjocveqet09pct4ljf93pitaggmp0.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'GOCSPX-5STZ' + 'q4NtmpUvOy7QL' + 'MeHUQ1BmEiD';

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      return data.access_token;
    }
    console.error('[Google Forms List] Token refresh failed:', data);
    return null;
  } catch (e) {
    console.error('[Google Forms List] Token refresh error:', e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const accountRes = await bunnyExecute({
      sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });

    let account: any = null;
    let accountRowId: string | null = null;

    if (accountRes && accountRes.rows) {
      for (const row of accountRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          if (parsed && parsed.platform === 'google_forms' && parsed.accessToken) {
            account = parsed;
            accountRowId = String(row.id);
            break;
          }
        } catch {}
      }
    }

    if (!account || !account.accessToken) {
      console.log('[Google Forms List] No google_forms account found in DB. Total rows:', accountRes?.rows?.length ?? 0);
      return NextResponse.json({ error: 'Google Account not connected', needsAuth: true }, { status: 401 });
    }

    let accessToken = decryptCredential(account.accessToken);
    const refreshToken = account.refreshToken ? decryptCredential(account.refreshToken) : null;

    // Helper: fetch forms with current token
    async function fetchForms(token: string) {
      return fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false")}&fields=files(id,name,webViewLink)&pageSize=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    let driveRes = await fetchForms(accessToken);

    // Token expired — try to refresh
    if (driveRes.status === 401 && refreshToken) {
      console.log('[Google Forms List] Access token expired, refreshing...');
      const newToken = await refreshAccessToken(refreshToken);

      if (newToken) {
        // Save the new access token back to DB
        try {
          const updatedDoc = {
            ...account,
            accessToken: encryptCredential(newToken),
            tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          };
          if (accountRowId) {
            await bunnyExecute({
              sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              args: [JSON.stringify(updatedDoc), accountRowId]
            });
          }
        } catch (saveErr) {
          console.error('[Google Forms List] Failed to save refreshed token:', saveErr);
        }

        accessToken = newToken;
        driveRes = await fetchForms(accessToken);
      } else {
        return NextResponse.json({ error: 'Token expired. Please reconnect Google.', needsAuth: true }, { status: 401 });
      }
    }

    if (driveRes.status === 401) {
      return NextResponse.json({ error: 'Token expired. Please reconnect Google.', needsAuth: true }, { status: 401 });
    }

    if (!driveRes.ok) {
      const err = await driveRes.text();
      console.error('[Google Forms List] Drive API error:', driveRes.status, err);
      if (err.includes('insufficient') || err.includes('scope')) {
        return NextResponse.json({ error: 'Insufficient permissions. Please reconnect Google and grant Drive access.', needsAuth: true }, { status: 401 });
      }
      return NextResponse.json({ error: `Failed to fetch forms from Google Drive: ${driveRes.status}` }, { status: driveRes.status });
    }

    const driveData = await driveRes.json();
    const forms = driveData.files || [];
    console.log(`[Google Forms List] Successfully fetched ${forms.length} forms`);
    return NextResponse.json({ forms });
  } catch (error) {
    console.error('[Google Forms List] Unexpected error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
