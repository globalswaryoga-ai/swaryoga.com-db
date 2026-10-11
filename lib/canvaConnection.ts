import { bunnyExecute } from './bunnyDatabase';
import { encryptCredential, decryptCredential } from './encryption';

async function schema() {
  if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required to store Canva credentials');
  await bunnyExecute('CREATE TABLE IF NOT EXISTS canva_connections_sql(user_id TEXT PRIMARY KEY,credentials TEXT NOT NULL,expires_at INTEGER NOT NULL)');
}

export async function saveCanvaConnection(userId: string, data: { access_token: string; refresh_token: string; expires_in: number }) {
  await schema();
  await bunnyExecute({ sql: 'INSERT INTO canva_connections_sql(user_id,credentials,expires_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET credentials=excluded.credentials,expires_at=excluded.expires_at',
    args: [userId, encryptCredential(JSON.stringify(data)), Date.now() + Number(data.expires_in) * 1000] });
}

const refreshes = new Map<string, Promise<string | null>>();

export async function canvaToken(userId: string) {
  const existing = refreshes.get(userId);
  if (existing) return existing;
  const operation = loadCanvaToken(userId);
  refreshes.set(userId, operation);
  try { return await operation; }
  finally { refreshes.delete(userId); }
}

async function loadCanvaToken(userId: string): Promise<string | null> {
  await schema();
  const rows = await bunnyExecute({ sql: 'SELECT credentials,expires_at FROM canva_connections_sql WHERE user_id=?', args: [userId] });
  if (!rows.rows[0]) return null;
  const data = JSON.parse(decryptCredential(String(rows.rows[0].credentials)));
  if (Number(rows.rows[0].expires_at) > Date.now() + 60000) return String(data.access_token);
  const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: data.refresh_token }), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Canva connection expired or was revoked. Reconnect Canva.');
  const refreshed = await response.json();
  await saveCanvaConnection(userId, { ...refreshed, refresh_token: refreshed.refresh_token || data.refresh_token });
  return String(refreshed.access_token);
}

export function canvaRedirect(request: Request) {
  return process.env.CANVA_REDIRECT_URI?.trim() || new URL('/api/admin/canva/callback', request.url).toString();
}
