import { connectDB, SocialMediaAccount } from './db';
import { decryptCredential } from './encryption';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Get valid access token for YouTube account
 * Priority: 1) Env refresh token (easiest) 2) Database account (admin UI connected)
 */
export async function getYouTubeAccessToken() {
  try {
    // Try environment variable first (no database needed)
    const envRefreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    if (envRefreshToken) {
      console.log('[YouTube Auth] Using refresh token from environment');
      const accessToken = await refreshYouTubeTokenFromEnv(envRefreshToken);
      return accessToken;
    }

    // Fallback to database (if admin connected via Social Media UI)
    console.log('[YouTube Auth] No env token, trying database...');
    await connectDB();

    const account = await SocialMediaAccount.findOne({
      platform: 'youtube',
      isConnected: true,
    });

    if (!account) {
      throw new Error(
        'YouTube not configured. Set YOUTUBE_REFRESH_TOKEN in .env or connect via Settings → Social Media.'
      );
    }

    // Check if token is expired
    if (account.tokenExpiresAt && new Date() > new Date(account.tokenExpiresAt)) {
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
 * Refresh token using env refresh token
 */
async function refreshYouTubeTokenFromEnv(refreshToken: string) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
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
      throw new Error(`Token refresh failed: ${data.error || 'unknown error'}`);
    }

    console.log('[YouTube Auth] Access token refreshed from refresh token');
    return data.access_token;
  } catch (error: any) {
    console.error('[YouTube Auth] Env token refresh failed:', error.message);
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
