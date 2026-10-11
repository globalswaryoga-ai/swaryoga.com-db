import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { createGoogleFormsOAuthState, googleFormsOAuthConfig, googleFormsRedirect } from '@/lib/googleFormsOAuth';

import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  const decoded = verifyToken(authorization.replace(/^Bearer /, '') || request.nextUrl.searchParams.get('token') || undefined);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { clientId } = googleFormsOAuthConfig();
    const queryOrigin = request.nextUrl.searchParams.get('origin')?.trim();
    const requestBase = queryOrigin || getRequestBaseUrl(request) || request.nextUrl.origin;
    const redirectUri = googleFormsRedirect(requestBase);
    const state = createGoogleFormsOAuthState(getViewerUserId(decoded), isSuperAdmin(decoded), redirectUri);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/forms.body.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/contacts',
      ].join(' '),
      access_type: 'offline', prompt: 'consent', state,
    }).toString();
    const response = NextResponse.json({ success: true, authUrl: url.toString() });
    response.cookies.set('google_forms_oauth_state', state, {
      httpOnly: true, sameSite: 'lax', secure: redirectUri.startsWith('https://'), path: '/', maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error('[Google Forms OAuth] Authorization setup failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Google Forms authorization setup failed.' }, { status: 503 });
  }
}
