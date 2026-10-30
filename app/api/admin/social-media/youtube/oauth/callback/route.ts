import { NextRequest, NextResponse } from 'next/server';
import { encryptCredential } from '@/lib/encryption';
import { getYouTubeOAuthRedirectUri } from '@/lib/youtubeOAuth';
import { listBunnySocialAccounts, upsertBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_CHANNEL_URL = 'https://www.googleapis.com/youtube/v3/channels';

export async function GET(request: NextRequest) {
  const redirectUri = getYouTubeOAuthRedirectUri(request);
  const baseUrl = new URL(redirectUri).origin;
  const redirectError = (value: string) => NextResponse.redirect(new URL(`/admin/social-media-setup?platform=youtube&error=${encodeURIComponent(value)}`, baseUrl));

  try {
    const params = request.nextUrl.searchParams;
    const providerError = params.get('error');
    const code = params.get('code');
    if (providerError) return redirectError(providerError);
    if (!code) return redirectError('missing_code');

    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) return redirectError('missing_credentials');

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      cache: 'no-store',
    });
    const tokenData: any = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[YouTube OAuth] Token exchange failed:', tokenData);
      return redirectError(tokenData.error || 'token_exchange_failed');
    }

    const channelResponse = await fetch(`${YOUTUBE_CHANNEL_URL}?part=snippet,statistics&mine=true`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: 'no-store',
    });
    const channelData: any = await channelResponse.json().catch(() => ({}));
    if (!channelResponse.ok || !channelData.items?.length) {
      console.error('[YouTube OAuth] Channel lookup failed:', channelData);
      return redirectError('no_channel_found');
    }

    const channel = channelData.items[0];
    const channelName = String(channel.snippet?.title || 'YouTube Channel');
    const channelHandle = String(channel.snippet?.customUrl || channel.id);
    const now = new Date().toISOString();
    const existing = (await listBunnySocialAccounts({ scopeType: 'super_admin', scopeKey: 'super_admin', connectedOnly: false }))
      .find((account: any) => account.platform === 'youtube');
    const refreshToken = tokenData.refresh_token
      ? encryptCredential(String(tokenData.refresh_token))
      : String(existing?.refreshToken || '');

    await upsertBunnySocialAccount({
      ...(existing || {}),
      _id: existing?._id,
      scopeType: 'super_admin',
      scopeKey: 'super_admin',
      ownerUserId: 'admincrm',
      platform: 'youtube',
      accountName: channelName,
      accountHandle: channelHandle,
      accountId: String(channel.id),
      accessToken: encryptCredential(String(tokenData.access_token)),
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString(),
      isConnected: true,
      connectedAt: existing?.connectedAt || now,
      metadata: {
        ...(existing?.metadata || {}),
        followers: Number(channel.statistics?.subscriberCount || 0),
        postsCount: Number(channel.statistics?.videoCount || 0),
        lastSyncedAt: now,
      },
      grantedScopes: ['youtube.upload', 'youtube.readonly'],
    });

    // Also update YOUTUBE_REFRESH_TOKEN in .env.local if present so worker scripts have immediate access
    if (tokenData.refresh_token) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const envLocalPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
          let envContent = fs.readFileSync(envLocalPath, 'utf8');
          if (envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/YOUTUBE_REFRESH_TOKEN=.*/, `YOUTUBE_REFRESH_TOKEN=${tokenData.refresh_token}`);
          } else {
            envContent += `\nYOUTUBE_REFRESH_TOKEN=${tokenData.refresh_token}\n`;
          }
          fs.writeFileSync(envLocalPath, envContent, 'utf8');
          console.log('[YouTube OAuth] Updated YOUTUBE_REFRESH_TOKEN in .env.local');
        }
      } catch (envErr) {
        console.warn('[YouTube OAuth] Could not update .env.local:', envErr);
      }
    }

    const state = params.get('state') || '';
    let returnUrl = `/admin/social-media-setup?platform=youtube&success=connected&channel=${encodeURIComponent(channelName)}`;
    if (state.startsWith('swaryoga_admin_auth:')) {
      const decodedReturnTo = decodeURIComponent(state.replace('swaryoga_admin_auth:', ''));
      if (decodedReturnTo.startsWith('/')) {
        const joinChar = decodedReturnTo.includes('?') ? '&' : '?';
        returnUrl = `${decodedReturnTo}${joinChar}youtube_connected=true&channel=${encodeURIComponent(channelName)}`;
      }
    }

    return NextResponse.redirect(new URL(returnUrl, baseUrl));
  } catch (error) {
    console.error('[YouTube OAuth] Callback error:', error);
    return new NextResponse(String(error) + '\\n' + (error as any)?.stack, { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
