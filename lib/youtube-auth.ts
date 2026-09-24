import { connectDB, SocialMediaAccount } from './db';
import { decryptCredential } from './encryption';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── Cookie-based agent (the reliable way to access PRIVATE videos) ──
// YouTube grants private-video access based on the invited account's logged-in
// session COOKIES (swarsakshi9@gmail.com), not OAuth tokens. We pass those
// cookies to ytdl-core so it can fetch the stream as that invited viewer.
let cachedAgent: any = null;
let cachedCookieRaw = '';

/**
 * Build a ytdl-core agent from the YOUTUBE_COOKIES env var.
 * YOUTUBE_COOKIES should be the JSON cookie array exported from a browser
 * logged in as the invited account (swarsakshi9@gmail.com).
 * Returns null if no cookies are configured (caller falls back to anonymous).
 */
export async function getYouTubeAgent(): Promise<any | null> {
  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw || !raw.trim()) return null;

  // Reuse the same agent unless the cookie value changed
  if (cachedAgent && cachedCookieRaw === raw) return cachedAgent;

  try {
    const ytdl = (await import('@distube/ytdl-core')).default;
    let cookies: any;
    try {
      cookies = JSON.parse(raw);
    } catch {
      throw new Error('YOUTUBE_COOKIES is not valid JSON. Export cookies as JSON.');
    }
    if (!Array.isArray(cookies) || cookies.length === 0) {
      throw new Error('YOUTUBE_COOKIES JSON must be a non-empty array of cookie objects.');
    }
    cachedAgent = ytdl.createAgent(cookies);
    cachedCookieRaw = raw;
    console.log(`[YouTube Auth] Cookie agent ready (${cookies.length} cookies)`);
    return cachedAgent;
  } catch (error: any) {
    console.error('[YouTube Auth] Failed to build cookie agent:', error.message);
    return null;
  }
}

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
    let account: any = null;

    try {
      await connectDB();
      account = await SocialMediaAccount.findOne({
        platform: 'youtube',
        isConnected: true,
      });
    } catch (mongoErr: any) {
      console.warn('[YouTube Auth] MongoDB unavailable, trying Bunny Database fallback:', mongoErr.message);
    }

    // Bunny Database fallback
    if (!account) {
      try {
        const { bunnyExecute } = await import('./bunnyDatabase');
        const res = await bunnyExecute({
          sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
        });
        for (const row of res.rows) {
          try {
            const parsed = JSON.parse(String(row.document_json || '{}'));
            if (parsed.platform === 'youtube' && parsed.isConnected) {
              account = parsed;
              console.log('[YouTube Auth] Found YouTube account in Bunny Database');
              break;
            }
          } catch {}
        }
      } catch (bunnyErr: any) {
        console.error('[YouTube Auth] Bunny fallback error:', bunnyErr.message);
      }
    }

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
      if (data.error === 'invalid_grant') {
        throw new Error(
          'YouTube token expired or was revoked (invalid_grant). In Google Cloud Console, ensure Publishing status is "In production" (not "Testing"), then reconnect YouTube via Settings → Social Media.'
        );
      }
      throw new Error(`Token refresh failed: ${data.error || 'unknown error'}`);
    }

    // Update token in database
    const { encryptCredential } = await import('./encryption');
    const newAccessToken = encryptCredential(data.access_token);
    const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    try {
      if (account._id) {
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
      }
    } catch (mErr: any) {
      console.warn('[YouTube Auth] Could not update token in Mongo:', mErr.message);
    }

    // Also update in Bunny DB mongo_documents
    try {
      const { bunnyExecute } = await import('./bunnyDatabase');
      const updatedAccount = { ...account, accessToken: newAccessToken, tokenExpiresAt: newExpiry, updatedAt: new Date() };
      await bunnyExecute({
        sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE collection_name = 'socialmediaaccounts' AND document_json LIKE '%\"platform\":\"youtube\"%'",
        args: [JSON.stringify(updatedAccount)]
      });
    } catch (bErr: any) {
      console.warn('[YouTube Auth] Could not update token in Bunny DB:', bErr.message);
    }

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
