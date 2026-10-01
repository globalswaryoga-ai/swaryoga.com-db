import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const clientId = process.env.CANVA_CLIENT_ID;
  
  // Dynamically generate the redirect URI based on the current host header or .env
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || '127.0.0.1:3000';
  const redirectUri = process.env.CANVA_REDIRECT_URI || `${protocol}://${host}/api/admin/canva/callback`;
  
  if (!clientId) {
    return NextResponse.json({ error: 'Canva Client ID not configured in environment variables' }, { status: 500 });
  }

  // Generate a random state string for security
  const state = Math.random().toString(36).substring(7);

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

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
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  // Redirect the user to Canva to approve the connection
  const response = NextResponse.redirect(authUrl.toString());
  
  // Store code_verifier in cookie for the callback route to use
  response.cookies.set('canva_code_verifier', codeVerifier, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });
  
  return response;
}
