import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';

type SyncResultItem = {
  accountMongoId: string;
  platform: string;
  accountId: string;
  ok: boolean;
  followers?: number;
  error?: string;
};

async function fetchGraphJson(url: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    // Don't cache live metrics
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || data?.error?.error_user_msg || data?.error || 'Graph API error';
    throw new Error(message);
  }
  return data;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function looksLikeYouTubeApiKey(token: string): boolean {
  // YouTube API keys commonly start with AIza...
  return /^AIza[0-9A-Za-z\-_]{20,}$/.test(token);
}

function createUserFriendlyErrorMessage(error: string, platform: string, accountId: string): string {
  // Handle Facebook/Instagram permission errors
  if (error.includes('(#100)') || error.includes('does not exist')) {
    return `⚠️ ${platform.toUpperCase()}: Missing permissions. Go to Admin → Social Media Setup → Facebook App → Permissions → Request "pages_read_engagement" and "Page Public Content Access" features. Account ID: ${accountId}`;
  }
  if (error.includes('fan_count') || error.includes('followers_count')) {
    return `⚠️ ${platform.toUpperCase()}: Account ID format incorrect. Use numeric Page/Account ID only (not URL). Current: ${accountId}. Find your ID at findmyfbid.com`;
  }
  if (error.includes('Invalid') && error.includes('token')) {
    return `⚠️ ${platform.toUpperCase()}: Token has expired or is invalid. Go to Admin → Social Media Setup and reconnect the account.`;
  }
  
  // Handle YouTube errors
  if (error.includes('youtube') || error.includes('YouTube')) {
    if (error.includes('blocked') || error.includes('disabled')) {
      return `⚠️ YOUTUBE: API is disabled or blocked. Enable YouTube Data API v3 in Google Cloud Console. Verify API Key at console.cloud.google.com`;
    }
    if (error.includes('subscriberCount') || error.includes('statistics') || error.includes('hidden')) {
      return `⚠️ YOUTUBE: Channel stats hidden or credentials invalid. Ensure channel is set to public (youtube.com/@YOUR_CHANNEL/about → Visibility). Account ID: ${accountId}`;
    }
    if (error.includes('quota')) {
      return `⚠️ YOUTUBE: API quota exceeded. Wait 24 hours and try again. Or upgrade your API quota at console.cloud.google.com`;
    }
  }
  
  // Handle X/Twitter errors
  if (error.includes('twitter') || error.includes('Twitter') || error.includes('X/Twitter')) {
    if (error.includes('AAAA') || error.includes('Bearer')) {
      return `⚠️ X/TWITTER: Invalid Bearer token format. Token must start with "AAAA". Go to Admin → Social Media Setup and reconnect with a valid X API v2 Bearer token.`;
    }
    if (error.includes('401') || error.includes('Unauthorized')) {
      return `⚠️ X/TWITTER: Token is invalid or expired. Go to Admin → Social Media Setup → Reconnect X/Twitter account. Get token from https://developer.twitter.com`;
    }
    if (error.includes('429') || error.includes('rate limit')) {
      return `⚠️ X/TWITTER: Rate limit exceeded. Wait a few minutes and try again.`;
    }
  }
  
  // Handle LinkedIn errors
  if (error.includes('linkedin') || error.includes('LinkedIn')) {
    if (error.includes('401') || error.includes('Unauthorized')) {
      return `⚠️ LINKEDIN: Token is invalid or expired. Go to Admin → Social Media Setup → Reconnect LinkedIn account.`;
    }
    if (error.includes('numeric')) {
      return `⚠️ LINKEDIN: Company ID must be numeric. Find it at linkedin.com/company/YOUR_COMPANY/about/. Current: ${accountId}`;
    }
    if (error.includes('permission') || error.includes('scope')) {
      return `⚠️ LINKEDIN: Missing permissions. Ensure token has "r_organization_admin" and "w_organization_metadata" scopes.`;
    }
  }
  
  // Generic message with actionable hint
  const hint = error.length > 100 ? error.substring(0, 100) + '...' : error;
  return `❌ ${platform.toUpperCase()}: ${hint}. Check Admin → Social Media Setup → Reconnect this account or verify API credentials.`;
}

async function fetchYouTubeJson(url: string, bearerToken?: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || data?.error || 'YouTube API error';
    throw new Error(message);
  }
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    await connectDB();

    const accounts = await SocialMediaAccount.find({ isConnected: true }).lean();
    const now = new Date();

    const results: SyncResultItem[] = [];

    for (const acc of accounts) {
      const accountMongoId = String(acc._id);
      const platform = String(acc.platform);
      const accountId = String(acc.accountId || '').trim();

      if (!accountId) {
        results.push({
          accountMongoId,
          platform,
          accountId: '',
          ok: false,
          error: 'Missing accountId/pageId. Open Social Media Setup and enter Account/Page ID.',
        });
        continue;
      }

      let decryptedAccessToken = '';
      try {
        decryptedAccessToken = decryptCredential(String(acc.accessToken || ''));
      } catch (e) {
        results.push({
          accountMongoId,
          platform,
          accountId,
          ok: false,
          error:
            'Token could not be decrypted. Ensure ENCRYPTION_KEY is set and unchanged between saves/deployments.',
        });
        continue;
      }

      try {
        if (platform === 'facebook') {
          if (!decryptedAccessToken) {
            throw new Error('Missing Facebook access token. Go to https://developers.facebook.com and create a long-lived token with pages_read_engagement,pages_read_user_content,instagram_basic scopes.');
          }

          if (!accountId || !/^\d+$/.test(accountId)) {
            throw new Error('Invalid Facebook Page ID. Must be numeric. Find it at facebook.com/YOUR_PAGE/settings/page-info/');
          }

          const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(accountId)}?fields=fan_count,followers_count,name&access_token=${encodeURIComponent(decryptedAccessToken)}`;
          const data = await fetchGraphJson(url);
          const followers = asNumber(data?.fan_count) ?? asNumber(data?.followers_count);

          if (followers === undefined) {
            throw new Error('Graph API did not return fan_count. Check token permissions: pages_read_engagement,pages_read_user_content required.');
          }

          await SocialMediaAccount.updateOne(
            { _id: acc._id },
            {
              $set: {
                'metadata.followers': followers,
                'metadata.lastSyncedAt': now,
                updatedAt: now,
              },
            }
          );

          results.push({ accountMongoId, platform, accountId, ok: true, followers });
          continue;
        }

        if (platform === 'instagram') {
          if (!decryptedAccessToken) {
            throw new Error('Missing Instagram access token. Go to https://developers.facebook.com and create a long-lived token with instagram_basic,instagram_manage_insights scopes.');
          }

          if (!accountId || !/^\d+$/.test(accountId)) {
            throw new Error('Invalid Instagram Business Account ID. Must be numeric. Find it via Facebook Graph API Explorer.');
          }

          const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(accountId)}?fields=followers_count,username&access_token=${encodeURIComponent(decryptedAccessToken)}`;
          const data = await fetchGraphJson(url);
          const followers = asNumber(data?.followers_count);

          if (followers === undefined) {
            throw new Error('Graph API did not return followers_count. Ensure: 1) Account is Business type, 2) Token has instagram_basic,instagram_manage_insights scopes, 3) Account is connected to this app.');
          }

          await SocialMediaAccount.updateOne(
            { _id: acc._id },
            {
              $set: {
                'metadata.followers': followers,
                'metadata.lastSyncedAt': now,
                updatedAt: now,
              },
            }
          );

          results.push({ accountMongoId, platform, accountId, ok: true, followers });
          continue;
        }

        if (platform === 'youtube') {
          // accountId should be the Channel ID (recommended). If omitted, we can try mine=true for OAuth.
          const tokenValue = decryptedAccessToken;

          if (!tokenValue) {
            throw new Error('Missing YouTube credential. Go to https://console.cloud.google.com and create either: 1) API Key (+ enter Channel ID), or 2) OAuth token (auto-detect channel).');
          }

          let data: any;
          if (looksLikeYouTubeApiKey(tokenValue)) {
            if (!accountId) {
              throw new Error('Missing accountId (YouTube Channel ID). Find it at youtube.com/@YOUR_CHANNEL/about and enter it in Social Media Setup.');
            }
            const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(accountId)}&key=${encodeURIComponent(tokenValue)}`;
            data = await fetchYouTubeJson(url);
          } else {
            // Treat as OAuth access token
            const url = accountId
              ? `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(accountId)}`
              : 'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true';
            data = await fetchYouTubeJson(url, tokenValue);
          }

          const item = Array.isArray(data?.items) ? data.items[0] : null;
          const followers = asNumber(item?.statistics?.subscriberCount);
          if (followers === undefined) {
            throw new Error(
              'YouTube API did not return subscriberCount. Possible reasons: 1) Channel subscriber count is hidden (make it public at youtube.com/channel/YOUR_ID/about), 2) Token is invalid or revoked, 3) API quota exceeded (wait 24h).'
            );
          }

          await SocialMediaAccount.updateOne(
            { _id: acc._id },
            {
              $set: {
                'metadata.followers': followers,
                'metadata.lastSyncedAt': now,
                updatedAt: now,
              },
            }
          );

          results.push({ accountMongoId, platform, accountId, ok: true, followers });
          continue;
        }

        if (platform === 'x') {
          // X/Twitter API v2 requires Bearer Token
          const tokenValue = decryptedAccessToken;
          if (!tokenValue || !tokenValue.startsWith('AAAA')) {
            throw new Error('Invalid X/Twitter Bearer token. Go to https://developer.twitter.com and create a Bearer token with read:users scope.');
          }

          const url = 'https://api.twitter.com/2/users/me?user.fields=public_metrics';
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenValue}`,
              'Accept': 'application/json',
            },
            cache: 'no-store',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData?.detail || errorData?.error?.message || 'X/Twitter API error';
            throw new Error(message);
          }

          const data = await response.json();
          const followers = asNumber(data?.data?.public_metrics?.followers_count);

          if (followers === undefined) {
            throw new Error('X/Twitter API did not return followers_count. Ensure account is public.');
          }

          await SocialMediaAccount.updateOne(
            { _id: acc._id },
            {
              $set: {
                'metadata.followers': followers,
                'metadata.lastSyncedAt': now,
                updatedAt: now,
              },
            }
          );

          results.push({ accountMongoId, platform, accountId, ok: true, followers });
          continue;
        }

        if (platform === 'linkedin') {
          // LinkedIn API v2 requires Authorization header with Bearer token
          const tokenValue = decryptedAccessToken;
          if (!tokenValue) {
            throw new Error('Missing LinkedIn access token. Go to https://www.linkedin.com/developers and create an OAuth token with r_liteprofile scope.');
          }

          // accountId should be the LinkedIn Company ID (numeric)
          if (!accountId || !/^\d+$/.test(accountId)) {
            throw new Error('Invalid LinkedIn Company ID. Must be numeric. Find it at linkedin.com/company/YOUR_COMPANY/about/');
          }

          const url = `https://api.linkedin.com/v2/organizations/${encodeURIComponent(accountId)}?projection=(id,localizedName,localizedDescription,followersCount)`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenValue}`,
              'Accept': 'application/json',
              'LinkedIn-Version': '202312',
            },
            cache: 'no-store',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData?.message || errorData?.serviceErrorCode || 'LinkedIn API error';
            throw new Error(message);
          }

          const data = await response.json();
          const followers = asNumber(data?.followersCount);

          if (followers === undefined) {
            throw new Error('LinkedIn API did not return followersCount. Ensure token has correct permissions.');
          }

          await SocialMediaAccount.updateOne(
            { _id: acc._id },
            {
              $set: {
                'metadata.followers': followers,
                'metadata.lastSyncedAt': now,
                updatedAt: now,
              },
            }
          );

          results.push({ accountMongoId, platform, accountId, ok: true, followers });
          continue;
        }

        // Unknown platform
        results.push({
          accountMongoId,
          platform,
          accountId,
          ok: false,
          error: `Platform "${platform}" is not supported yet.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        const friendlyMessage = createUserFriendlyErrorMessage(message, platform, accountId);
        results.push({ accountMongoId, platform, accountId, ok: false, error: friendlyMessage });
      }
    }

    const sanitizedAccounts = await SocialMediaAccount.find({ isConnected: true })
      .select('-accessToken -refreshToken')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        results,
        accounts: sanitizedAccounts,
        syncedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error syncing social media analytics:', error);
    return NextResponse.json({ error: 'Failed to sync analytics' }, { status: 500 });
  }
}
