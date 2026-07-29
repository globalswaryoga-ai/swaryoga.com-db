import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Google OAuth callback handler
 * After user authorizes, Google redirects here with an authorization code
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    // Handle user denied access
    if (error) {
      return NextResponse.redirect(
        `/admin/crm/qr?backup_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `/admin/crm/qr?backup_error=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Get auth token from cookies or localStorage (need to check during request)
    // For now, we'll redirect to settings and let the frontend handle the token exchange
    const redirectUrl = new URL('/admin/crm/qr', request.url);
    redirectUrl.searchParams.append('backup_code', code);
    redirectUrl.searchParams.append('backup_state', state);

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[Google Callback] Error:', error);
    return NextResponse.redirect(
      `/admin/crm/qr?backup_error=${encodeURIComponent(error.message || 'OAuth callback failed')}`
    );
  }
}
