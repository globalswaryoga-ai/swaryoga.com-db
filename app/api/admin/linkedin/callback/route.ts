/**
 * LinkedIn OAuth Callback
 * GET /api/admin/linkedin/callback?code=XXX&state=XXX
 * Exchanges authorization code for access token, saves to DB
 * Then redirects back to the social media setup page
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';

export const dynamic = 'force-dynamic';


const SETUP_PAGE = '/admin/social-media-setup?platform=linkedin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  // Handle errors from LinkedIn
  if (error) {
    console.error('LinkedIn OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`${SETUP_PAGE}&error=${encodeURIComponent(errorDescription || error)}`, 'https://swaryoga.com')
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`${SETUP_PAGE}&error=linkedin_missing_code`, 'https://swaryoga.com')
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${SETUP_PAGE}&error=linkedin_missing_credentials`, 'https://swaryoga.com')
    );
  }

  // Must match the redirect URI used in the auth route exactly
  const redirectUri = 'https://swaryoga.com/api/admin/linkedin/callback';

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
      return NextResponse.redirect(
        new URL(`${SETUP_PAGE}&error=${encodeURIComponent('Token exchange failed: ' + errText)}`, 'https://swaryoga.com')
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // seconds (usually 5184000 = 60 days)
    const refreshToken = tokenData.refresh_token || '';

    if (!accessToken) {
      return NextResponse.redirect(
        new URL(`${SETUP_PAGE}&error=linkedin_token_failed`, 'https://swaryoga.com')
      );
    }

    // Profile fetch skipped — we only have w_member_social scope
    const profileName = 'Swar Yoga';
    const profileEmail = '';
    const profilePicture = '';

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
        grantedScopes: ['w_member_social'],
        metadata: {
          lastSyncedAt: new Date(),
          website: 'https://swaryoga.com',
        },
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log('✅ LinkedIn connected! Token expires:', tokenExpiresAt.toISOString());

    return NextResponse.redirect(
      new URL(`${SETUP_PAGE}&success=linkedin_connected&linkedin_account=${encodeURIComponent(profileName)}`, 'https://swaryoga.com')
    );
  } catch (err: any) {
    console.error('LinkedIn OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(`${SETUP_PAGE}&error=${encodeURIComponent(err.message || 'Unknown error')}`, 'https://swaryoga.com')
    );
  }
}
