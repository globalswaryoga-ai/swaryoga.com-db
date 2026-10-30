import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export interface MohanRagAvatarConfig {
  avatarId: string;
  voiceId: string;
  avatarType: 'avatar' | 'talking_photo';
  avatarLabel: string;
  supportedLanguages: string[];
  authorized: boolean;
  updatedBy: string;
  updatedAt: string;
}

let schemaReady = false;

export async function ensureMohanRagAvatarConfigSchema() {
  if (schemaReady) return;
  if (!isBunnyDatabaseConfigured()) throw new Error('Bunny Database is not configured for Mohan RAG.');
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS mohan_rag_avatar_config_sql (
    id TEXT PRIMARY KEY,
    avatar_id TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    avatar_type TEXT NOT NULL DEFAULT 'talking_photo',
    avatar_label TEXT NOT NULL DEFAULT 'Mohan Sir clone',
    supported_languages_json TEXT NOT NULL DEFAULT '[]',
    authorized INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  try {
    await bunnyExecute(`ALTER TABLE mohan_rag_avatar_config_sql ADD COLUMN supported_languages_json TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    // The column is already present on databases created from the current schema.
  }
  schemaReady = true;
}

export async function getMohanRagAvatarConfig(): Promise<MohanRagAvatarConfig | null> {
  await ensureMohanRagAvatarConfigSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM mohan_rag_avatar_config_sql WHERE id = ? LIMIT 1', args: ['master'] });
  const row: any = result.rows[0];
  if (!row) return null;
  let supportedLanguages: string[] = [];
  try { supportedLanguages = JSON.parse(String(row.supported_languages_json || '[]')); } catch {}
  return {
    avatarId: String(row.avatar_id || ''),
    voiceId: String(row.voice_id || ''),
    avatarType: row.avatar_type === 'avatar' ? 'avatar' : 'talking_photo',
    avatarLabel: String(row.avatar_label || 'Mohan Sir clone'),
    supportedLanguages: Array.isArray(supportedLanguages) ? supportedLanguages : [],
    authorized: Boolean(row.authorized),
    updatedBy: String(row.updated_by || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export async function saveMohanRagAvatarConfig(input: {
  avatarId: string;
  voiceId: string;
  avatarType: 'avatar' | 'talking_photo';
  avatarLabel: string;
  supportedLanguages: string[];
  authorized: boolean;
  updatedBy: string;
}) {
  await ensureMohanRagAvatarConfigSchema();
  const updatedAt = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO mohan_rag_avatar_config_sql
      (id, avatar_id, voice_id, avatar_type, avatar_label, supported_languages_json, authorized, updated_by, updated_at)
      VALUES ('master', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET avatar_id=excluded.avatar_id, voice_id=excluded.voice_id,
      avatar_type=excluded.avatar_type, avatar_label=excluded.avatar_label, supported_languages_json=excluded.supported_languages_json,
      authorized=excluded.authorized, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    args: [input.avatarId, input.voiceId, input.avatarType, input.avatarLabel, JSON.stringify(input.supportedLanguages), input.authorized ? 1 : 0, input.updatedBy, updatedAt],
  });
  return getMohanRagAvatarConfig();
}
