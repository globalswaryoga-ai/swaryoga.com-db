/**
 * LinkedIn OAuth - Start Authorization
 * GET /api/admin/linkedin/auth
 * Redirects to LinkedIn OAuth consent screen
 * No auth required — this only redirects to LinkedIn's page.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID not configured' }, { status: 500 });
  }

  // Always use the canonical production URL for redirect
  const redirectUri = 'https://swaryoga.com/api/admin/linkedin/callback';

  const scopes = [
    'w_member_social',
  ].join(' ');

  // Generate state for CSRF protection
  const state = Buffer.from(JSON.stringify({ 
    ts: Date.now(), 
    source: 'swaryoga-crm'
  })).toString('base64');

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
