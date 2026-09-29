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

    return NextResponse.redirect(new URL(`/admin/social-media-setup?platform=youtube&success=connected&channel=${encodeURIComponent(channelName)}`, baseUrl));
  } catch (error) {
    console.error('[YouTube OAuth] Callback error:', error);
    return new NextResponse(String(error) + '\\n' + (error as any)?.stack, { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
