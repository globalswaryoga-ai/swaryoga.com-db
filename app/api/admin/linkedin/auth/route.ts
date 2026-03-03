/**
 * LinkedIn OAuth - Start Authorization
 * GET /api/admin/linkedin/auth
 * Redirects admin to LinkedIn OAuth consent screen
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Auth check
  const token = req.headers.get('authorization')?.slice('Bearer '.length) 
    || req.nextUrl.searchParams.get('token');
  const decoded = verifyToken(token || undefined);
  if (!decoded?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID not configured' }, { status: 500 });
  }

  // Use production URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://swaryoga.com';
  const redirectUri = `${baseUrl}/api/admin/linkedin/callback`;

  const scopes = [
    'openid',
    'profile',
    'email',
    'w_member_social',
  ].join(' ');

  // Generate state for CSRF protection
  const state = Buffer.from(JSON.stringify({ 
    ts: Date.now(), 
    admin: decoded.username || decoded.email || 'admin' 
  })).toString('base64');

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
