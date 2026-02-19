import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Initiates YouTube OAuth 2.0 Authorization Flow
 * 
 * Redirects the user to Google's OAuth consent screen
 * with the required YouTube upload scopes.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length) ||
                  request.nextUrl.searchParams.get('token');
    
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/social-media/youtube/oauth/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'GOOGLE_CLIENT_ID not configured. Set it in environment variables.' },
        { status: 500 }
      );
    }

    // Build OAuth URL with required scopes
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    authUrl.searchParams.set('state', token || ''); // Pass token for verification

    // Return the URL for the frontend to redirect to
    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('[YouTube OAuth] Error initiating auth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate YouTube authorization' },
      { status: 500 }
    );
  }
}
