import { NextRequest, NextResponse } from 'next/server';
import { decryptCredential, encryptCredential } from '@/lib/auth';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

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
    if (data.access_token) return data.access_token;
    console.error('[Google Forms List] Token refresh failed:', data);
    return null;
  } catch (e) {
    console.error('[Google Forms List] Refresh error:', e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure table exists first
    try {
      await bunnyExecute({
        sql: `CREATE TABLE IF NOT EXISTS mongo_documents (
          source_database TEXT NOT NULL DEFAULT 'swarsakshiDB',
          collection_name TEXT NOT NULL,
          document_id TEXT NOT NULL,
          document_json TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (collection_name, document_id)
        )`
      });
    } catch {}

    const accountRes = await bunnyExecute({
      sql: "SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });

    let account: any = null;
    let accountRowId: string | null = null;

    if (accountRes?.rows) {
      for (const row of accountRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          if (parsed?.platform === 'google_forms' && parsed.accessToken) {
            account = parsed;
            accountRowId = String(row.id);
            break;
          }
        } catch {}
      }
    }

    if (!account) {
      console.log('[Google Forms List] No google_forms token in Bunny DB. Rows found:', accountRes?.rows?.length ?? 0);
      return NextResponse.json({ error: 'Google Account not connected. Please click Reconnect Google.', needsAuth: true }, { status: 401 });
    }

    let accessToken: string;
    try {
      accessToken = decryptCredential(account.accessToken);
    } catch (e: any) {
      console.error('[Google Forms List] Decrypt failed:', e.message);
      return NextResponse.json({ error: 'Token corrupt. Please reconnect Google.', needsAuth: true }, { status: 401 });
    }

    async function fetchForms(token: string) {
      return fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false")}&fields=files(id,name,webViewLink)&pageSize=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    let driveRes = await fetchForms(accessToken);

    // Auto-refresh if expired
    if (driveRes.status === 401 && account.refreshToken) {
      console.log('[Google Forms List] Token expired, refreshing...');
      let refreshToken: string;
      try { refreshToken = decryptCredential(account.refreshToken); } catch {
        return NextResponse.json({ error: 'Token expired. Please reconnect Google.', needsAuth: true }, { status: 401 });
      }

      const newToken = await refreshAccessToken(refreshToken);
      if (newToken && accountRowId) {
        const updatedDoc = { ...account, accessToken: encryptCredential(newToken), tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(), updatedAt: new Date().toISOString() };
        await bunnyExecute({
          sql: "UPDATE mongo_documents SET document_json = ?, updated_at = datetime('now') WHERE id = ?",
          args: [JSON.stringify(updatedDoc), accountRowId]
        });
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
      const errText = await driveRes.text();
      console.error('[Google Forms List] Drive API error:', driveRes.status, errText);
      if (errText.includes('insufficient') || errText.includes('scope')) {
        return NextResponse.json({ error: 'Insufficient permissions. Please reconnect Google and grant Drive access.', needsAuth: true }, { status: 401 });
      }
      return NextResponse.json({ error: `Google Drive error: ${driveRes.status}` }, { status: driveRes.status });
    }

    const driveData = await driveRes.json();
    const forms = driveData.files || [];
    console.log(`[Google Forms List] Found ${forms.length} forms`);
    return NextResponse.json({ forms });
  } catch (error: any) {
    console.error('[Google Forms List] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
