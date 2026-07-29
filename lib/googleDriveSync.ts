/**
 * Per-tenant Google Drive mirror for QR WhatsApp chat archives.
 *
 * Bunny remains the system of record for the 6-month retention/archive
 * pipeline (see lib/qrWhatsappArchive.ts) — this is an optional, additive
 * mirror: a tenant can connect their own personal Google Drive account and
 * have the same archived data copied there too, so they can browse it
 * independently of our app.
 *
 * Reuses the same Google Cloud OAuth client already configured for YouTube
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET), but requests the much narrower
 * `drive.file` scope (the app can only see files it creates itself — never
 * a tenant's existing Drive contents).
 *
 * Known limitation: while the Google Cloud OAuth consent screen is in
 * "Testing" publishing status (unverified app), Google expires refresh
 * tokens after 7 days. When a refresh attempt fails with `invalid_grant`,
 * callers should mark the connection `needsReconnect: true` and stop
 * retrying until the tenant reconnects — never loop/retry a dead token.
 */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const DRIVE_BACKUP_FOLDER_NAME = 'Swar Yoga WhatsApp Backup';

export function getGoogleOAuthUrl(redirectUri: string, state: string, scopes: string[]): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', [...new Set([...scopes, 'email'])].join(' '));
  url.searchParams.set('access_type', 'offline'); // need a refresh token for ongoing sync
  url.searchParams.set('prompt', 'consent');       // force a fresh refresh token every reconnect
  url.searchParams.set('state', state);
  return url.toString();
}

export function getDriveOAuthUrl(redirectUri: string, state: string): string {
  // drive.file limits access to files created by this app; it cannot browse a
  // customer's existing Drive content.
  return getGoogleOAuthUrl(redirectUri, state, ['https://www.googleapis.com/auth/drive.file']);
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not configured');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token || null, expiresIn: data.expires_in || 3600 };
}

/** Throws with `err.code === 'invalid_grant'` when the refresh token is dead (expired/revoked). */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not configured');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const err: any = new Error(data.error_description || data.error || 'Token refresh failed');
    err.code = data.error || 'refresh_failed';
    throw err;
  }
  return data.access_token;
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json().catch(() => ({}));
  return res.ok ? data.email || '' : '';
}

/** Finds (or creates) the shared top-level backup folder in the tenant's own Drive. */
export async function ensureDriveFolder(accessToken: string, folderName: string = DRIVE_BACKUP_FOLDER_NAME): Promise<string> {
  const query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchUrl = new URL(DRIVE_FILES_URL);
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('fields', 'files(id,name)');
  searchUrl.searchParams.set('spaces', 'drive');

  const searchRes = await fetch(searchUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const searchData = await searchRes.json();
  if (searchRes.ok && searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(createData.error?.message || 'Failed to create Drive folder');
  }
  return createData.id;
}

/** Uploads (or updates, if a same-named file already exists in the folder) a file into a Drive folder. */
export async function upsertFileInDriveFolder(
  accessToken: string,
  folderId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
  const query = `name='${filename.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`;
  const searchUrl = new URL(DRIVE_FILES_URL);
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('fields', 'files(id)');
  const searchRes = await fetch(searchUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const searchData = await searchRes.json();
  const existingId: string | undefined = searchRes.ok ? searchData.files?.[0]?.id : undefined;

  const boundary = `swaryoga-${Date.now()}`;
  const metadata = existingId ? { name: filename } : { name: filename, parents: [folderId] };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    buffer.toString('utf-8') +
    `\r\n--${boundary}--`;

  const uploadUrl = existingId
    ? `${DRIVE_UPLOAD_URL}/${existingId}?uploadType=multipart&fields=id,webViewLink`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink`;

  const res = await fetch(uploadUrl, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Failed to upload file to Drive');
  }
  return { fileId: data.id, webViewLink: data.webViewLink || '' };
}
