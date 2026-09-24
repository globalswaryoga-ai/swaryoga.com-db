import { bunnyExecute } from '@/lib/bunnyDatabase';

export type BunnyCrmUserSettings = Record<string, any> & { userId: string };

function parse(value: unknown): Record<string, any> {
  try { return value ? JSON.parse(String(value)) : {}; } catch { return {}; }
}

export async function getBunnyCrmUserSettings(userId: string): Promise<BunnyCrmUserSettings | null> {
  const result = await bunnyExecute({ sql: 'SELECT user_id, data_json FROM crm_user_settings_sql WHERE user_id = ? LIMIT 1', args: [userId] });
  const row = result.rows[0];
  return row ? { ...parse(row.data_json), userId: String(row.user_id) } : null;
}

export async function findBunnyCrmUserSettingsBySecret(secret: string, excludeUserId?: string): Promise<BunnyCrmUserSettings | null> {
  const result = await bunnyExecute({
    sql: 'SELECT user_id, data_json FROM crm_user_settings_sql WHERE json_extract(data_json, \'$.qrBridgeSecret\') = ? AND user_id <> ? LIMIT 1',
    args: [secret, excludeUserId || ''],
  });
  const row = result.rows[0];
  return row ? { ...parse(row.data_json), userId: String(row.user_id) } : null;
}

export async function getBunnyTenant(tenantSlug: string): Promise<Record<string, any> | null> {
  const result = await bunnyExecute({
    sql: 'SELECT data_json FROM crm_tenants_sql WHERE tenant_slug = ? LIMIT 1',
    args: [tenantSlug],
  });
  const row = result.rows[0];
  return row ? parse(row.data_json) : null;
}

export async function saveBunnyCrmUserSettings(userId: string, patch: Record<string, any>) {
  const current = await getBunnyCrmUserSettings(userId);
  const next = { ...(current || {}), ...patch, userId };
  const timestamp = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO crm_user_settings_sql (user_id,document_id,data_json,created_at,updated_at,migrated_at)
      VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`,
    args: [userId, String(current?.document_id || userId), JSON.stringify(next), current?.createdAt || timestamp, timestamp],
  });
  return next;
}
