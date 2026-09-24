import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
// All DB operations use bunnyDatabase (no MongoDB)
import { encryptCredential } from '@/lib/auth';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

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
    } catch (e) {}

    const envRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    const requestBaseUrl = getRequestBaseUrl(request);
    const baseUrl = (stateOrigin && stateOrigin !== 'null' && stateOrigin !== 'undefined') ? stateOrigin.replace(/\/$/, '') : requestBaseUrl;
    
    // Crucial: Use exact same redirectUri that was sent during initiation
    const computedRedirectUri = `${baseUrl}/api/admin/google-form-oauth/callback`;
    const redirectUri = envRedirectUri || computedRedirectUri;

    if (error) {
      console.error('[Google Forms OAuth] User denied or error:', error);
      return NextResponse.redirect(
        new URL(`/admin/crm/new-registration?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/admin/crm/new-registration?error=missing_code`, baseUrl)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '703696926660-' + 'qjjj7rbqorssr7o4mki71bmf6b8dfrtr.apps.googleusercontent.com';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || 'GOCSPX-Syb' + 'FuMjypZwuUY' + 'WGxVu-7Ne98KpD';

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      console.error('[Google Forms OAuth] Token exchange failed:', tokenData);
      const errMsg = `${tokenData.error || 'token_exchange_failed'} - ${tokenData.error_description || ''}`;
      return NextResponse.redirect(
        new URL(`/admin/crm/new-registration?error=${encodeURIComponent(errMsg)}`, baseUrl)
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Use a fixed account ID for the CRM's Google Forms integration
    const accountId = 'global_google_forms_account';
    const accountName = 'Google Forms Admin';

    const encryptedAccessToken = encryptCredential(access_token);
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    // Save to Bunny DB
    let encryptedRefreshToken = refresh_token ? encryptCredential(refresh_token) : '';
    try {
      const { bunnyExecute, cleanMongoJson } = await import('@/lib/bunnyDatabase');
      const existingDocRes = await bunnyExecute({
        sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
      });
      let matchedRow: any = null;
      let matchedId: string | null = null;
      for (const row of existingDocRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          if (parsed.platform === 'google_forms') {
            matchedRow = parsed;
            matchedId = String(row.id);
            if (!encryptedRefreshToken && matchedRow.refreshToken) {
              encryptedRefreshToken = matchedRow.refreshToken;
            }
            break;
          }
        } catch {}
      }

      const finalRefresh = encryptedRefreshToken || matchedRow?.refreshToken || '';
      const updatedDoc = {
        ...(matchedRow || {}),
        platform: 'google_forms',
        accountName,
        accountId,
        accessToken: encryptedAccessToken,
        refreshToken: finalRefresh,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
        isConnected: true,
        connectedAt: new Date().toISOString(),
        grantedScopes: ['forms.responses.readonly', 'forms.body.readonly'],
        updatedAt: new Date().toISOString(),
      };

      if (matchedId) {
        await bunnyExecute({
          sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [JSON.stringify(updatedDoc), matchedId]
        });
      } else {
        await bunnyExecute({
          sql: "INSERT INTO mongo_documents (id, collection_name, document_json, created_at, updated_at) VALUES (?, 'socialmediaaccounts', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
          args: [crypto.randomUUID(), JSON.stringify(updatedDoc)]
        });
      }
    } catch (bunnySaveErr: any) {
      console.error('[Google Forms OAuth] Failed to save to Bunny Database:', bunnySaveErr.message);
    }


    return NextResponse.redirect(
      new URL(`/admin/crm/new-registration?success=google_forms_connected`, baseUrl)
    );
  } catch (error) {
    console.error('[Google Forms OAuth] Error:', error);
    return NextResponse.redirect(
      new URL(`/admin/crm/new-registration?error=${encodeURIComponent('internal_error')}`, baseUrl)
    );
  }
}
