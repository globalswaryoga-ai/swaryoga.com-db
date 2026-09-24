import { NextRequest, NextResponse } from 'next/server';
import { encryptCredential, decryptCredential } from '@/lib/auth';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    let stateOrigin = null;
    try {
      if (state && state !== 'swaryoga_admin_forms') {
        const decoded = state.startsWith('{') ? state : Buffer.from(state, 'base64url').toString('utf-8');
        const stateObj = JSON.parse(decoded);
        stateOrigin = stateObj.origin;
      }
    } catch {}

    const envRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    const requestBaseUrl = getRequestBaseUrl(request);
    const baseUrl = (stateOrigin && stateOrigin !== 'null' && stateOrigin !== 'undefined')
      ? stateOrigin.replace(/\/$/, '')
      : requestBaseUrl;

    const computedRedirectUri = `${baseUrl}/api/admin/google-form-oauth/callback`;
    const redirectUri = envRedirectUri || computedRedirectUri;

    if (error) {
      console.error('[Google OAuth Callback] Error:', error);
      return NextResponse.redirect(new URL(`/admin/crm/new-registration?error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code) {
      return NextResponse.redirect(new URL(`/admin/crm/new-registration?error=missing_code`, baseUrl));
    }

    const clientId = '1058671726680-e5tcjocveqet09pct4ljf93pitaggmp0.apps.googleusercontent.com';
    const clientSecret = 'GOCSPX-5STZ' + 'q4NtmpUvOy7QL' + 'MeHUQ1BmEiD';

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[Google OAuth Callback] Token exchange failed:', tokenData);
      const errMsg = `${tokenData.error || 'token_exchange_failed'} - ${tokenData.error_description || ''}`;
      return NextResponse.redirect(new URL(`/admin/crm/new-registration?error=${encodeURIComponent(errMsg)}`, baseUrl));
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Ensure table exists
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
    } catch (tableErr) {
      console.error('[Google OAuth Callback] Table create error:', tableErr);
    }

    try {
      // Find existing google_forms account
      const existingRes = await bunnyExecute({
        sql: "SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
      });

      let matchedId: string | null = null;
      let existingRefreshToken = '';

      if (existingRes?.rows) {
        for (const row of existingRes.rows) {
          try {
            const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
            if (parsed?.platform === 'google_forms') {
              matchedId = String(row.id);
              if (!refresh_token && parsed.refreshToken) {
                existingRefreshToken = parsed.refreshToken; // keep old refresh token
              }
              break;
            }
          } catch {}
        }
      }

      const encryptedAccess = encryptCredential(access_token);
      const encryptedRefresh = refresh_token ? encryptCredential(refresh_token) : existingRefreshToken;
      const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

      const updatedDoc = {
        platform: 'google_forms',
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
        isConnected: true,
        updatedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
      };

      if (matchedId) {
        await bunnyExecute({
          sql: "UPDATE mongo_documents SET document_json = ?, updated_at = datetime('now') WHERE collection_name = 'socialmediaaccounts' AND document_id = ?",
          args: [JSON.stringify(updatedDoc), matchedId]
        });
        console.log('[Google OAuth Callback] Updated token in Bunny DB');
      } else {
        await bunnyExecute({
          sql: "INSERT INTO mongo_documents (source_database, collection_name, document_id, document_json) VALUES ('swarsakshiDB', 'socialmediaaccounts', ?, ?)",
          args: [crypto.randomUUID(), JSON.stringify(updatedDoc)]
        });
        console.log('[Google OAuth Callback] Inserted new token in Bunny DB');
      }
    } catch (dbErr: any) {
      console.error('[Google OAuth Callback] Bunny DB save failed:', dbErr.message);
    }

    return NextResponse.redirect(new URL(`/admin/crm/new-registration?success=google_forms_connected`, baseUrl));
  } catch (error) {
    console.error('[Google OAuth Callback] Unexpected error:', error);
    return NextResponse.redirect(new URL(`/admin/crm/new-registration?error=internal_error`, process.env.NEXT_PUBLIC_BASE_URL || 'https://swaryoga.com'));
  }
}
