/**
 * LinkedIn OAuth Callback
 * GET /api/admin/linkedin/callback?code=XXX&state=XXX
 * Exchanges authorization code for access token, saves to DB and .env
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  // Handle errors from LinkedIn
  if (error) {
    console.error('LinkedIn OAuth error:', error, errorDescription);
    return new NextResponse(renderHTML(false, `LinkedIn OAuth Error: ${errorDescription || error}`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code) {
    return new NextResponse(renderHTML(false, 'No authorization code received'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(renderHTML(false, 'LinkedIn credentials not configured'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://swaryoga.com');
  const redirectUri = `${baseUrl}/api/admin/linkedin/callback`;

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('LinkedIn token exchange failed:', errText);
      return new NextResponse(renderHTML(false, `Token exchange failed: ${errText}`), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // seconds (usually 5184000 = 60 days)
    const refreshToken = tokenData.refresh_token || '';

    if (!accessToken) {
      return new NextResponse(renderHTML(false, 'No access token in response'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Fetch user profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let profileName = 'Swar Yoga';
    let profileEmail = '';
    let profilePicture = '';
    let personId = '';

    if (profileRes.ok) {
      const profile = await profileRes.json();
      profileName = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'Swar Yoga';
      profileEmail = profile.email || '';
      profilePicture = profile.picture || '';
      personId = profile.sub || '';
    }

    // Save to database
    await connectDB();

    const orgId = process.env.LINKEDIN_ORGANIZATION_ID || '112069236';
    const tokenExpiresAt = new Date(Date.now() + (expiresIn || 5184000) * 1000);

    await SocialMediaAccount.findOneAndUpdate(
      { platform: 'linkedin', accountId: orgId },
      {
        platform: 'linkedin',
        accountName: profileName,
        accountHandle: `company/${orgId}`,
        accountId: orgId,
        accountEmail: profileEmail,
        profileImage: profilePicture,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiresAt,
        isConnected: true,
        connectedAt: new Date(),
        lastTokenRefresh: new Date(),
        grantedScopes: ['openid', 'profile', 'email', 'w_member_social'],
        metadata: {
          lastSyncedAt: new Date(),
          website: 'https://swaryoga.com',
        },
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log('✅ LinkedIn connected! Token expires:', tokenExpiresAt.toISOString());
    console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...');

    return new NextResponse(
      renderHTML(true, 'LinkedIn connected successfully!', {
        name: profileName,
        email: profileEmail,
        orgId,
        expiresAt: tokenExpiresAt.toLocaleDateString('en-IN', { 
          day: '2-digit', month: 'short', year: 'numeric' 
        }),
        token: accessToken.substring(0, 15) + '...' + accessToken.substring(accessToken.length - 10),
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    console.error('LinkedIn OAuth callback error:', err);
    return new NextResponse(renderHTML(false, err.message || 'Unknown error'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function renderHTML(
  success: boolean, 
  message: string, 
  details?: { name: string; email: string; orgId: string; expiresAt: string; token: string }
) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>LinkedIn ${success ? 'Connected' : 'Error'} – Swar Yoga</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
           background: #f8fafc; display: flex; justify-content: center; align-items: center; 
           min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; padding: 40px; max-width: 480px; 
            width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 8px; color: ${success ? '#10B981' : '#EF4444'}; }
    p { color: #6b7280; font-size: 14px; line-height: 1.6; }
    .detail { background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin: 16px 0 4px; 
              text-align: left; font-size: 13px; }
    .detail-label { color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600; }
    .detail-value { color: #1f2937; font-weight: 600; margin-top: 2px; }
    .btn { display: inline-block; margin-top: 20px; padding: 10px 24px; border-radius: 8px; 
           background: #6366F1; color: white; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn:hover { background: #4F46E5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${success ? 'LinkedIn Connected!' : 'Connection Failed'}</h1>
    <p>${message}</p>
    ${details ? `
      <div class="detail">
        <div class="detail-label">Account</div>
        <div class="detail-value">${details.name} ${details.email ? `(${details.email})` : ''}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Organization ID</div>
        <div class="detail-value">${details.orgId}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Token Expires</div>
        <div class="detail-value">${details.expiresAt}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Access Token</div>
        <div class="detail-value" style="font-family:monospace;font-size:11px;">${details.token}</div>
      </div>
    ` : ''}
    <a class="btn" href="/admin/crm">← Back to CRM</a>
  </div>
</body>
</html>`;
}
