import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
import { decryptCredential } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Step 1: Check if Bunny DB is configured
    const isConfigured = isBunnyDatabaseConfigured();
    if (!isConfigured) {
      return NextResponse.json({
        status: 'BUNNY_DB_NOT_CONFIGURED',
        message: 'BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are not set in environment variables.',
        fix: 'Add these to your Vercel environment variables and redeploy.'
      }, { status: 500 });
    }

    // Step 2: Try DB connection
    try {
      await bunnyExecute({
        sql: `CREATE TABLE IF NOT EXISTS mongo_documents (
          id TEXT PRIMARY KEY,
          collection_name TEXT NOT NULL,
          document_json TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )`
      });
    } catch (tableErr: any) {
      return NextResponse.json({ status: 'DB_CONNECT_FAILED', error: tableErr.message }, { status: 500 });
    }

    // Step 3: Read all socialmediaaccounts
    const accountRes = await bunnyExecute({
      sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });

    const rows: any[] = [];
    let googleAccount: any = null;
    let googleRowId: string | null = null;

    for (const row of (accountRes?.rows || [])) {
      try {
        const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
        rows.push({ id: row.id, platform: parsed.platform, hasAccessToken: !!parsed.accessToken, hasRefreshToken: !!parsed.refreshToken, tokenExpiresAt: parsed.tokenExpiresAt });
        if (parsed.platform === 'google_forms') {
          googleAccount = parsed;
          googleRowId = String(row.id);
        }
      } catch (e: any) {
        rows.push({ id: row.id, parseError: e.message });
      }
    }

    if (!googleAccount) {
      return NextResponse.json({
        status: 'NO_GOOGLE_TOKEN',
        message: 'Bunny DB is connected but no Google Forms token found. You need to click "Reconnect Google" button on the CRM page.',
        totalRows: rows.length,
        allRows: rows
      });
    }

    // Step 4: Test the token with Google Drive
    let driveTest: any = null;
    try {
      const accessToken = decryptCredential(googleAccount.accessToken);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false")}&fields=files(id,name)&pageSize=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      driveTest = { httpStatus: res.status, formsFound: data.files?.length ?? 0, forms: data.files || [], error: data.error };
    } catch (e: any) {
      driveTest = { error: e.message };
    }

    return NextResponse.json({
      status: 'OK',
      bunnyDbConfigured: true,
      googleToken: {
        found: true,
        rowId: googleRowId,
        hasAccessToken: !!googleAccount.accessToken,
        hasRefreshToken: !!googleAccount.refreshToken,
        tokenExpiresAt: googleAccount.tokenExpiresAt,
      },
      driveTest,
      allRows: rows
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'ERROR', error: error.message }, { status: 500 });
  }
}
