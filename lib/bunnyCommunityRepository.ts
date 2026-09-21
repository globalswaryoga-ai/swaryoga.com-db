import { bunnyExecute } from '@/lib/bunnyDatabase';
import { bunnyBatch } from '@/lib/bunnyDatabase';

function sanitizeEJSON(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeEJSON);
  
  if ('$numberInt' in obj) return Number(obj.$numberInt);
  if ('$numberLong' in obj) return Number(obj.$numberLong);
  if ('$numberDouble' in obj) return Number(obj.$numberDouble);
  if ('$oid' in obj) return String(obj.$oid);
  if ('$date' in obj) {
    if (typeof obj.$date === 'object' && '$numberLong' in obj.$date) return new Date(Number(obj.$date.$numberLong)).toISOString();
    return new Date(obj.$date).toISOString();
  }
  if ('$boolean' in obj) return Boolean(obj.$boolean);
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeEJSON(value);
  }
  return result;
}

function parse(value: unknown): any { 
  try { 
    return sanitizeEJSON(JSON.parse(String(value))); 
  } catch { 
    return {}; 
  } 
}

export async function initBunnyCommunitySchema() {
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS community_members_sql (document_id TEXT PRIMARY KEY,community_id TEXT,user_id TEXT,status TEXT,approved INTEGER NOT NULL DEFAULT 1,joined_at TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_community_members_scope ON community_members_sql(community_id,status,joined_at DESC)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_videos_sql (document_id TEXT PRIMARY KEY,community_id TEXT,title TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_posts_sql (document_id TEXT PRIMARY KEY,community_id TEXT,user_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_watch_logs_sql (document_id TEXT PRIMARY KEY,community_id TEXT,user_id TEXT,video_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_experiences_sql (document_id TEXT PRIMARY KEY,user_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_questions_sql (document_id TEXT PRIMARY KEY,user_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
  ]);
}

export async function listBunnyCommunityMembers(input: { communityId?: string; status?: string; skip?: number; limit?: number }) {
  await initBunnyCommunitySchema(); const clauses = ['1=1']; const args: any[] = [];
  if (input.communityId) { clauses.push('community_id = ?'); args.push(input.communityId); }
  if (input.status && input.status !== 'all') { clauses.push(input.status === 'pending' ? 'approved = 0' : 'status = ?'); if (input.status !== 'pending') args.push(input.status); }
  const count = await bunnyExecute({ sql: `SELECT COUNT(*) AS count FROM community_members_sql WHERE ${clauses.join(' AND ')}`, args });
  const limit = input.limit && input.limit > 0 ? input.limit : 100000; const skip = Math.max(input.skip || 0, 0);
  const rows = await bunnyExecute({ sql: `SELECT data_json FROM community_members_sql WHERE ${clauses.join(' AND ')} ORDER BY joined_at DESC LIMIT ? OFFSET ?`, args: [...args, limit, skip] });
  return { members: rows.rows.map((row) => ({ ...parse(row.data_json), deviceCount: 0, activeDeviceCount: 0, latestDevice: null })), total: Number(count.rows[0]?.count || 0) };
}

export async function listBunnyCommunities() {
  const result = await bunnyExecute({ sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'communities' ORDER BY created_at DESC", args: [] });
  return result.rows.flatMap((row: any) => {
    try {
      const community = sanitizeEJSON(JSON.parse(String(row.document_json)));
      const id = String(community.id || community._id || '');
      if (!id) return [];
      return [{ id, name: community.name || 'Unnamed Community', isPublic: community.isPublic ?? false, category: community.category || 'common' }];
    } catch { return []; }
  });
}
