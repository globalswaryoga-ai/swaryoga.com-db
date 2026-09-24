import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const accountRes = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });
    
    let account: any = null;
    if (accountRes && accountRes.rows) {
      for (const row of accountRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          if (parsed && parsed.platform === 'google_forms' && parsed.accessToken) {
            account = parsed;
            break;
          }
        } catch {}
      }
    }
    
    if (!account || !account.accessToken) {
      return NextResponse.json({ error: 'Google Account not connected', needsAuth: true }, { status: 401 });
    }

    let accessToken = decryptCredential(account.accessToken);

    // Fetch form list from Google Drive
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false")}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // If token expired, we should refresh it, but for simplicity let frontend handle 401 and redirect to oauth
    if (driveRes.status === 401) {
      return NextResponse.json({ error: 'Token expired', needsAuth: true }, { status: 401 });
    }

    if (!driveRes.ok) {
      const err = await driveRes.text();
      // If the error says insufficient scope, it means they need to re-login to grant drive scope
      if (err.includes('insufficient')) {
         return NextResponse.json({ error: 'Insufficient scope. Please reconnect Google Account.', needsAuth: true }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: driveRes.status });
    }

    const driveData = await driveRes.json();
    return NextResponse.json({ forms: driveData.files || [] });
  } catch (error) {
    console.error('List Forms API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
