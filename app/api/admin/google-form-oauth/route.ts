import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
                  request.nextUrl.searchParams.get('token');
    
    const decoded = verifyToken(token || undefined);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '703696926660-' + 'qjjj7rbqorssr7o4mki71bmf6b8dfrtr.apps.googleusercontent.com';
    const envRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
    const clientOrigin = request.nextUrl.searchParams.get('origin');
    const baseUrl = (clientOrigin && clientOrigin !== 'null' && clientOrigin !== 'undefined') ? clientOrigin.replace(/\/$/, '') : (getRequestBaseUrl(request) || 'https://swaryoga.com');
    const computedRedirectUri = `${baseUrl}/api/admin/google-form-oauth/callback`;
    const redirectUri = envRedirectUri || computedRedirectUri;

    if (!clientId) {
      return NextResponse.json(
        { error: 'GOOGLE_CLIENT_ID not configured.' },
        { status: 500 }
      );
    }

    // Google Forms scopes
    const scopes = [
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/forms.body.readonly',
    ];

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    const stateVal = clientOrigin
      ? Buffer.from(JSON.stringify({ origin: clientOrigin, csrf: 'swaryoga_admin_forms' })).toString('base64url')
      : 'swaryoga_admin_forms';

    authUrl.searchParams.set('state', stateVal);

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('[Google Forms OAuth] Error initiating auth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization' },
      { status: 500 }
    );
  }
}
