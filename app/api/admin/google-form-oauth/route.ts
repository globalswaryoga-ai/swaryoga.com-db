import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const forwardedHost = request.headers.get("x-forwarded-host");
    const cleanForwardedHost = forwardedHost ? forwardedHost.split(',')[0].trim() : null;
    const clientOrigin = request.nextUrl.searchParams.get('origin');
    const rawHost = cleanForwardedHost || request.headers.get("host") || request.nextUrl.host;
    const host = rawHost.split(':')[0];
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUri = clientOrigin ? `${clientOrigin}/api/admin/google-form-oauth/callback` : `${protocol}://${rawHost}/api/admin/google-form-oauth/callback`;

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
    authUrl.searchParams.set(
      'state',
      clientOrigin
        ? JSON.stringify({ origin: clientOrigin, csrf: 'swaryoga_admin_forms' })
        : 'swaryoga_admin_forms'
    );

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
