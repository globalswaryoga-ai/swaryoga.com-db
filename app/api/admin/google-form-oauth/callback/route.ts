import { NextRequest, NextResponse } from 'next/server';
import { encryptCredential } from '@/lib/auth';
import { upsertBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';
import { requestGoogleFormsTokens, verifyGoogleFormsOAuthState } from '@/lib/googleFormsOAuth';

import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = getRequestBaseUrl(request) || request.nextUrl.origin;
  let response: NextResponse;
  try {
    const context = verifyGoogleFormsOAuthState(request.nextUrl.searchParams.get('state') || '', request.cookies.get('google_forms_oauth_state')?.value || '');
    const contextRedirectUrl = new URL(context.redirectUri);
    if (contextRedirectUrl.pathname !== '/api/admin/google-form-oauth/callback') {
      throw new Error('Google callback path is invalid.');
    }
    const error = request.nextUrl.searchParams.get('error');
    if (error) throw new Error(`Google consent failed (${error}).`);
    const code = request.nextUrl.searchParams.get('code');
    if (!code) throw new Error('Google authorization code is missing.');
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required to save Google credentials.');
    const token = await requestGoogleFormsTokens({ code, redirectUri: context.redirectUri });
    if (!token.refreshToken) throw new Error('Google did not provide offline access. Reconnect and approve access for automatic sync.');
    await upsertBunnySocialAccount({
      scopeType: context.superAdmin ? 'super_admin' : 'tenant',
      scopeKey: context.superAdmin ? 'super_admin' : context.userId,
      ownerUserId: context.superAdmin ? 'admincrm' : context.userId,
      platform: 'google_forms', accountId: 'forms-connection', accountName: 'Google Forms',
      accessToken: encryptCredential(token.accessToken), refreshToken: encryptCredential(token.refreshToken),
      oauthClientId: token.clientId, tokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000).toISOString(),
      isConnected: true, connectedAt: new Date().toISOString(),
    });
    response = NextResponse.redirect(new URL('/admin/crm/new-registration?success=google_forms_connected', baseUrl));
  } catch (error) {
    console.error('[Google Forms OAuth] Connection failed:', error);
    const target = new URL('/admin/crm/new-registration', baseUrl);
    target.searchParams.set('error', error instanceof Error ? error.message : 'Google Forms connection failed.');
    response = NextResponse.redirect(target);
  }
  response.cookies.set('google_forms_oauth_state', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
