import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accountRes = await bunnyExecute({
      sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });

    const rows: any[] = [];
    let googleAccount: any = null;

    if (accountRes && accountRes.rows) {
      for (const row of accountRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          rows.push({ id: row.id, platform: parsed.platform, hasAccessToken: !!parsed.accessToken, hasRefreshToken: !!parsed.refreshToken, tokenExpiresAt: parsed.tokenExpiresAt });
          if (parsed.platform === 'google_forms') {
            googleAccount = parsed;
          }
        } catch (e: any) {
          rows.push({ id: row.id, parseError: e.message });
        }
      }
    }

    if (!googleAccount) {
      return NextResponse.json({ 
        status: 'NO_ACCOUNT', 
        message: 'No google_forms account in database. You need to click Reconnect Google and complete OAuth.',
        totalRows: rows.length,
        rows 
      });
    }

    let accessToken = '';
    let decryptError = '';
    try {
      accessToken = decryptCredential(googleAccount.accessToken);
    } catch(e: any) {
      decryptError = e.message;
    }

    // Try calling Google Drive to see what error we get
    let driveStatus: any = null;
    if (accessToken) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false")}&fields=files(id,name)&pageSize=10`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        driveStatus = { httpStatus: res.status, response: data };
      } catch(e: any) {
        driveStatus = { error: e.message };
      }
    }

    return NextResponse.json({
      status: 'FOUND',
      tokenExpiresAt: googleAccount.tokenExpiresAt,
      hasAccessToken: !!googleAccount.accessToken,
      hasRefreshToken: !!googleAccount.refreshToken,
      decryptError: decryptError || null,
      driveTest: driveStatus,
      allAccounts: rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
