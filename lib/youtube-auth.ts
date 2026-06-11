import { connectDB, SocialMediaAccount } from './db';
import { decryptCredential } from './encryption';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Get valid access token for YouTube account by email
 * Refreshes if expired
 */
export async function getYouTubeAccessToken(accountEmail?: string) {
  try {
    await connectDB();

    // Find the YouTube account (prioritize by email or first connected account)
    let account: any;
    if (accountEmail) {
      // Try to find by email in metadata or accountHandle
      account = await SocialMediaAccount.findOne({
        platform: 'youtube',
        $or: [
          { accountHandle: accountEmail },
          { 'metadata.email': accountEmail },
        ],
      });
    }

    // Fallback to first connected YouTube account
    if (!account) {
      account = await SocialMediaAccount.findOne({
        platform: 'youtube',
        isConnected: true,
      });
    }

    if (!account) {
      throw new Error('No YouTube account connected. Connect account in admin settings.');
    }

    // Check if token is expired
    if (account.tokenExpiresAt && new Date() > new Date(account.tokenExpiresAt)) {
      // Token expired, try to refresh
      console.log('[YouTube Auth] Token expired, refreshing...');
      const refreshedToken = await refreshYouTubeToken(account);
      return refreshedToken;
    }

    // Decrypt and return access token
    const accessToken = account.accessToken ? decryptCredential(account.accessToken) : null;
    if (!accessToken) {
      throw new Error('Could not decrypt YouTube access token');
    }

    return accessToken;
  } catch (error: any) {
    console.error('[YouTube Auth] Error getting token:', error.message);
    throw error;
  }
}

/**
 * Refresh YouTube access token using refresh token
 */
async function refreshYouTubeToken(account: any) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = account.refreshToken ? decryptCredential(account.refreshToken) : null;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing OAuth credentials or refresh token');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      throw new Error(`Token refresh failed: ${data.error}`);
    }

    // Update token in database
    const { encryptCredential } = await import('./encryption');
    const newAccessToken = encryptCredential(data.access_token);
    const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    await SocialMediaAccount.updateOne(
      { _id: account._id },
      {
        $set: {
          accessToken: newAccessToken,
          tokenExpiresAt: newExpiry,
          updatedAt: new Date(),
        },
      }
    );

    console.log('[YouTube Auth] Token refreshed successfully');
    return data.access_token;
  } catch (error: any) {
    console.error('[YouTube Auth] Refresh failed:', error.message);
    throw error;
  }
}

/**
 * Get YouTube video with authentication headers (for private videos)
 */
export async function getYouTubeVideoWithAuth(videoId: string, accessToken: string) {
  try {
    const ytdl = (await import('@distube/ytdl-core')).default;

    // Set custom headers with authorization
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
      requestOptions: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    return info;
  } catch (error: any) {
    console.error('[YouTube Video] Error fetching with auth:', error.message);
    throw error;
  }
}
