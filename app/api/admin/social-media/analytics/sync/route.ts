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
          const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(accountId)}?fields=fan_count,followers_count,name&access_token=${encodeURIComponent(decryptedAccessToken)}`;
          const data = await fetchGraphJson(url);
          const followers = asNumber(data?.fan_count) ?? asNumber(data?.followers_count);

          if (followers === undefined) {
            throw new Error('Graph API did not return fan_count/followers_count for this page');
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
          const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(accountId)}?fields=followers_count,username&access_token=${encodeURIComponent(decryptedAccessToken)}`;
          const data = await fetchGraphJson(url);
          const followers = asNumber(data?.followers_count);

          if (followers === undefined) {
            throw new Error('Graph API did not return followers_count for this IG business account');
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

          let data: any;
          if (looksLikeYouTubeApiKey(tokenValue)) {
            if (!accountId) {
              throw new Error('Missing accountId (YouTube Channel ID). Please enter it in Social Media Setup.');
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
              'YouTube API did not return subscriberCount (it may be hidden for this channel, or credentials are invalid).'
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

        // Other platforms need additional API setup / scopes.
        results.push({
          accountMongoId,
          platform,
          accountId,
          ok: false,
          error: 'Auto-sync not configured for this platform yet (needs official API + scopes).',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        results.push({ accountMongoId, platform, accountId, ok: false, error: message });
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
