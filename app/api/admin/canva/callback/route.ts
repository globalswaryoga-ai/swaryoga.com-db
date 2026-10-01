import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `Canva OAuth Error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  
  // Dynamically generate the redirect URI based on the current host
  const redirectUri = `${url.protocol}//${url.host}/api/admin/canva/callback`;
  
  // Read code_verifier from cookies
  const codeVerifier = request.headers.get('cookie')?.split('; ')?.find(c => c.startsWith('canva_code_verifier='))?.split('=')[1];

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
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to exchange Canva token:', errorData);
      return NextResponse.json({ error: 'Failed to exchange token', details: errorData }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();

    // In a real application, you would save these tokens to your database here.
    // For now, we will log them so we can see it's working.
    console.log('Successfully connected to Canva!');
    console.log('Access Token:', tokenData.access_token);
    console.log('Refresh Token:', tokenData.refresh_token);

    // Redirect the user back to the workshop offer page with a success flag
    const returnUrl = new URL('/admin/crm/workshop-offer', request.url);
    returnUrl.searchParams.append('canva_connected', 'true');
    return NextResponse.redirect(returnUrl.toString());

  } catch (err) {
    console.error('Error during Canva OAuth callback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
