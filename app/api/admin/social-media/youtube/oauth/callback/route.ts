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
      const allParams = Array.from(searchParams.entries()).map(([k, v]) => `${k}=${v}`).join("&");
      return NextResponse.redirect(
        new URL(`/admin/social-media-setup?platform=youtube&error=missing_code&debug=${encodeURIComponent(allParams)}`, request.url)
      );
    }

    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const host = request.headers.get("host") || request.nextUrl.host;
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/admin/social-media/youtube/oauth/callback`;

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

    const encryptedAccessToken = encryptCredential(access_token);
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    // ── PRIMARY SAVE: Bunny Database ──
    // Save to Bunny DB first (works regardless of MongoDB availability)
    let encryptedRefreshToken = refresh_token ? encryptCredential(refresh_token) : '';
    try {
      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      const existingDocRes = await bunnyExecute({
        sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
      });
      let matchedRow: any = null;
      let matchedId: string | null = null;
      for (const row of existingDocRes.rows) {
        try {
          const parsed = JSON.parse(String(row.document_json || '{}'));
          if (parsed.platform === 'youtube') {
            matchedRow = parsed;
            matchedId = String(row.id);
            // Preserve old refresh token if new one not provided
            if (!encryptedRefreshToken && matchedRow.refreshToken) {
              encryptedRefreshToken = matchedRow.refreshToken;
            }
            break;
          }
        } catch {}
      }

      const finalRefresh = encryptedRefreshToken || matchedRow?.refreshToken || '';
      const updatedDoc = {
        ...(matchedRow || {}),
        platform: 'youtube',
        accountName: channelName,
        accountHandle: channelHandle,
        accountId: channelId,
        accessToken: encryptedAccessToken,
        refreshToken: finalRefresh,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
        isConnected: true,
        connectedAt: new Date().toISOString(),
        metadata: {
          ...(matchedRow?.metadata || {}),
          followers: subscribers,
          postsCount: videoCount,
          lastSyncedAt: new Date().toISOString(),
        },
        grantedScopes: ['youtube.upload', 'youtube.readonly'],
        updatedAt: new Date().toISOString(),
      };

      if (matchedId) {
        await bunnyExecute({
          sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [JSON.stringify(updatedDoc), matchedId]
        });
      } else {
        await bunnyExecute({
          sql: "INSERT INTO mongo_documents (id, collection_name, document_json, created_at, updated_at) VALUES (?, 'socialmediaaccounts', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
          args: [crypto.randomUUID(), JSON.stringify(updatedDoc)]
        });
      }
      console.log('[YouTube OAuth] Saved YouTube account to Bunny Database (primary storage).');
    } catch (bunnySaveErr: any) {
      console.error('[YouTube OAuth] Failed to save to Bunny Database:', bunnySaveErr.message);
    }

    // ── SECONDARY SAVE: MongoDB (best-effort) ──
    try {
      await connectDB();
      const existingMongo = await SocialMediaAccount.findOne({ platform: 'youtube', accountId: channelId });
      const finalRefresh = encryptedRefreshToken || existingMongo?.refreshToken || '';
      if (existingMongo) {
        await SocialMediaAccount.updateOne(
          { _id: existingMongo._id },
          {
            $set: {
              accessToken: encryptedAccessToken,
              ...(finalRefresh ? { refreshToken: finalRefresh } : {}),
              tokenExpiresAt,
              isConnected: true,
              connectedAt: new Date(),
              accountName: channelName,
              accountHandle: channelHandle,
              metadata: { followers: subscribers, postsCount: videoCount, lastSyncedAt: new Date() },
              grantedScopes: ['youtube.upload', 'youtube.readonly'],
              updatedAt: new Date(),
            },
          }
        );
      } else {
        const newAccount = new SocialMediaAccount({
          platform: 'youtube',
          accountName: channelName,
          accountHandle: channelHandle,
          accountId: channelId,
          accessToken: encryptedAccessToken,
          refreshToken: finalRefresh,
          tokenExpiresAt,
          isConnected: true,
          connectedAt: new Date(),
          metadata: { followers: subscribers, postsCount: videoCount, lastSyncedAt: new Date() },
          grantedScopes: ['youtube.upload', 'youtube.readonly'],
        });
        await newAccount.save();
      }
      console.log('[YouTube OAuth] Also mirrored to MongoDB.');
    } catch (mongoSaveErr: any) {
      console.warn('[YouTube OAuth] Could not mirror to MongoDB (non-critical):', mongoSaveErr.message);
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
