import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = process.env.CANVA_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Canva credentials not configured in environment variables' }, { status: 500 });
  }

  // Generate a random state string for security (CSRF protection)
  const state = Math.random().toString(36).substring(7);

  // The scopes needed to use the Autofill API and create designs
  const scopes = [
    'autofill:write',
    'design:content:read',
    'design:meta:read',
    'design:content:write'
  ].join(' ');

  // Canva's authorization URL
  const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  // Redirect the user to Canva to approve the connection
  return NextResponse.redirect(authUrl.toString());
}
