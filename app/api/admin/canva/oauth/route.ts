import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.CANVA_CLIENT_ID?.trim();
  
  // Dynamically generate the redirect URI based on the current host header or .env
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || '127.0.0.1:3000';
  const redirectUri = process.env.CANVA_REDIRECT_URI?.trim() || `${protocol}://${host}/api/admin/canva/callback`;
  
  if (!clientId) {
    return NextResponse.json({ error: 'Canva Client ID not configured in environment variables' }, { status: 500 });
  }

  // Generate a random state string for security (CSRF protection)
  const state = Math.random().toString(36).substring(7);

  // The basic scopes for simple connection
  const scopes = [
    'design:content:read',
    'design:meta:read',
    'design:content:write'
  ].join(' ');

  // Canva's authorization URL
  const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);

  const finalUrl = authUrl.toString() + '&scope=' + scopes.split(' ').map(encodeURIComponent).join('%20');

  // Redirect the user to Canva to approve the connection
  return NextResponse.redirect(finalUrl);
}
