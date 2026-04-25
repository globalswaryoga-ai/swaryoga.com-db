import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { encryptCredential } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

/**
 * YouTube OAuth 2.0 Callback Handler
 * 
 * This endpoint receives the authorization code from Google OAuth
 * and exchanges it for access/refresh tokens.
 * 
 * Flow:
 * 1. User clicks "Connect YouTube" in setup page
 * 2. Redirects to Google OAuth consent screen
 * 3. After consent, Google redirects here with ?code=...
 * 4. We exchange code for tokens and save to DB
 * 5. Redirect back to setup page with success/error
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_CHANNEL_URL = 'https://www.googleapis.com/youtube/v3/channels';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // Contains adminToken for auth

    // Handle OAuth errors
    if (error) {
      console.error('[YouTube OAuth] Error from Google:', error);
      return NextResponse.redirect(
        new URL(`/admin/social-media-setup?platform=youtube&error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/social-media-setup?platform=youtube&error=missing_code', request.url)
      );
    }

    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/admin/social-media/youtube/oauth/callback`;

    if (!clientId || !clientSecret) {
      console.error('[YouTube OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return NextResponse.redirect(
        new URL('/admin/social-media-setup?platform=youtube&error=missing_credentials', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[YouTube OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(`/admin/social-media-setup?platform=youtube&error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch channel info to get channel ID and name
    const channelResponse = await fetch(
      `${YOUTUBE_CHANNEL_URL}?part=snippet,statistics&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const channelData = await channelResponse.json();

    if (!channelResponse.ok || !channelData.items?.length) {
      console.error('[YouTube OAuth] Failed to fetch channel:', channelData);
      return NextResponse.redirect(
        new URL('/admin/social-media-setup?platform=youtube&error=no_channel_found', request.url)
      );
    }

    const channel = channelData.items[0];
    const channelId = channel.id;
    const channelName = channel.snippet?.title || 'YouTube Channel';
    const channelHandle = channel.snippet?.customUrl || channelId;
    const subscribers = parseInt(channel.statistics?.subscriberCount || '0', 10);
    const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);

    // Connect to database and save account
    await connectDB();

    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      platform: 'youtube',
      accountId: channelId,
    });

    const encryptedAccessToken = encryptCredential(access_token);
    const encryptedRefreshToken = refresh_token ? encryptCredential(refresh_token) : '';
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    if (existingAccount) {
      // Update existing account
      await SocialMediaAccount.updateOne(
        { _id: existingAccount._id },
        {
          $set: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt,
            isConnected: true,
            connectedAt: new Date(),
            accountName: channelName,
            accountHandle: channelHandle,
            metadata: {
              followers: subscribers,
              postsCount: videoCount,
              lastSyncedAt: new Date(),
            },
            grantedScopes: ['youtube.upload', 'youtube.readonly'],
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Create new account
      const newAccount = new SocialMediaAccount({
        platform: 'youtube',
        accountName: channelName,
        accountHandle: channelHandle,
        accountId: channelId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        isConnected: true,
        connectedAt: new Date(),
        metadata: {
          followers: subscribers,
          postsCount: videoCount,
          lastSyncedAt: new Date(),
        },
        grantedScopes: ['youtube.upload', 'youtube.readonly'],
      });

      await newAccount.save();
    }

    console.log(`[YouTube OAuth] Successfully connected channel: ${channelName} (${channelId})`);

    // Redirect back to setup page with success
    return NextResponse.redirect(
      new URL(`/admin/social-media-setup?platform=youtube&success=connected&channel=${encodeURIComponent(channelName)}`, request.url)
    );
  } catch (error) {
    console.error('[YouTube OAuth] Error:', error);
    return NextResponse.redirect(
      new URL(`/admin/social-media-setup?platform=youtube&error=${encodeURIComponent('internal_error')}`, request.url)
    );
  }
}
