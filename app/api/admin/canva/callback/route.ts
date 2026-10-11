import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { saveCanvaConnection, canvaRedirect } from '@/lib/canvaConnection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.log('[CALLBACK ERROR] Canva OAuth Error:', error);
    return NextResponse.json({ error: `Canva OAuth Error: ${error}` }, { status: 400 });
  }

  if (!code) {
    console.warn('[CALLBACK ERROR] No authorization code provided');
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  const clientId = process.env.CANVA_CLIENT_ID?.trim();
  const clientSecret = process.env.CANVA_CLIENT_SECRET?.trim();
  
  // Dynamically generate the redirect URI based on the current host header or .env
  const redirectUri = canvaRedirect(request);
  
  // Read code_verifier from cookies
  const codeVerifier = request.headers.get('cookie')?.split('; ')?.find(c => c.startsWith('canva_code_verifier='))?.split('=')[1];
  const cookies = new Map((request.headers.get('cookie') || '').split(';').map(value => { const [key, ...parts] = value.trim().split('='); return [key, decodeURIComponent(parts.join('='))]; }));
  const expectedState = cookies.get('canva_oauth_state');
  const decoded = verifyToken(cookies.get('canva_crm_token'));
  if (!expectedState || url.searchParams.get('state') !== expectedState || !decoded?.isAdmin) {
    return NextResponse.json({ error: 'Canva connection session could not be verified. Connect again from Workshop Offer.' }, { status: 400 });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Canva credentials not configured' }, { status: 500 });
  }

  if (!codeVerifier) {
    return NextResponse.json({ error: 'Session expired. Please try connecting to Canva again.' }, { status: 400 });
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      }).toString(),
      signal: AbortSignal.timeout(30000),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange Canva token:', tokenResponse.status);
      return NextResponse.json({ error: 'Failed to connect Canva. Check OAuth credentials and redirect URI.' }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    await saveCanvaConnection(getViewerUserId(decoded), tokenData);

    // Store tokens in cookies
    const returnUrl = new URL('/admin/crm/workshop-offer', request.url);
    returnUrl.searchParams.append('canva_connected', 'true');
    
    const res = NextResponse.redirect(returnUrl.toString());
    res.cookies.delete('canva_oauth_state');
    res.cookies.delete('canva_crm_token');
    res.cookies.delete('canva_code_verifier');
    
    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: tokenData.expires_in || 3600 // usually 1 hour
    };

    res.cookies.set('canva_access_token', tokenData.access_token, cookieOptions);
    if (tokenData.refresh_token) {
      res.cookies.set('canva_refresh_token', tokenData.refresh_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30 // 30 days for refresh token
      });
    }

    return res;

  } catch (err) {
    console.error('Error during Canva OAuth callback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
