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
    { sql: 'CREATE TABLE IF NOT EXISTS communities_sql (id TEXT PRIMARY KEY, type TEXT NOT NULL, is_archived INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT, data_json TEXT NOT NULL)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_communities_type ON communities_sql(type, is_archived)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_members_sql (document_id TEXT PRIMARY KEY,community_id TEXT,user_id TEXT,status TEXT,approved INTEGER NOT NULL DEFAULT 1,joined_at TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_community_members_scope ON community_members_sql(community_id,status,joined_at DESC)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_videos_sql (document_id TEXT PRIMARY KEY,community_id TEXT,title TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_posts_sql (document_id TEXT PRIMARY KEY,community_id TEXT,user_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_watch_logs_sql (document_id TEXT PRIMARY KEY,community_id TEXT,user_id TEXT,video_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_experiences_sql (document_id TEXT PRIMARY KEY,user_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS community_questions_sql (document_id TEXT PRIMARY KEY,user_id TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
  ]);
}

export async function createBunnyCommunity(community: any) {
  await initBunnyCommunitySchema();
  const id = community.id || community._id?.toString() || Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  
  const communityData = {
    ...community,
    _id: id,
    id,
    createdAt: community.createdAt || now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: 'INSERT INTO communities_sql (id, type, is_archived, created_at, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      id,
      community.type || 'workshop_active',
      community.isArchived ? 1 : 0,
      communityData.createdAt,
      now,
      JSON.stringify(communityData)
    ]
  });

  return communityData;
}

export async function updateBunnyCommunity(id: string, updates: any) {
  await initBunnyCommunitySchema();
  const existing = await getBunnyCommunity(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const merged = { ...existing, ...updates, updatedAt: now };

  await bunnyExecute({
    sql: 'UPDATE communities_sql SET type = ?, is_archived = ?, updated_at = ?, data_json = ? WHERE id = ?',
    args: [
      merged.type || 'workshop_active',
      merged.isArchived ? 1 : 0,
      now,
      JSON.stringify(merged),
      id
    ]
  });

  return merged;
}

export async function getBunnyCommunity(id: string) {
  await initBunnyCommunitySchema();
  const res = await bunnyExecute({
    sql: 'SELECT data_json FROM communities_sql WHERE id = ?',
    args: [id]
  });
  if (res.rows.length === 0) return null;
  return parse(res.rows[0].data_json);
}

export async function getBunnyCommunityByName(name: string) {
  await initBunnyCommunitySchema();
  // Name is stored in JSON, this is a bit slower but okay for creation checks
  const res = await bunnyExecute({
    sql: "SELECT data_json FROM communities_sql WHERE is_archived = 0 AND json_extract(data_json, '$.name') LIKE ?",
    args: [name]
  });
  if (res.rows.length === 0) return null;
  return parse(res.rows[0].data_json);
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

export async function listBunnyCommunities(query: any = {}) {
  await initBunnyCommunitySchema();
  const clauses = ['1=1'];
  const args: any[] = [];

  if (query.type) {
    clauses.push('type = ?');
    args.push(query.type);
  }
  
  if (query.isArchived === false) {
    clauses.push('is_archived = 0');
  } else if (query.isArchived === true) {
    clauses.push('is_archived = 1');
  }

  // Handle _id $in query
  if (query._id && query._id.$in) {
    const ids = query._id.$in;
    if (ids.length > 0) {
      clauses.push(`id IN (${ids.map(() => '?').join(',')})`);
      args.push(...ids);
    } else {
      // If $in is empty, match nothing
      clauses.push('1=0');
    }
  }

  const res = await bunnyExecute({
    sql: `SELECT data_json FROM communities_sql WHERE ${clauses.join(' AND ')} ORDER BY type ASC, created_at DESC`,
    args
  });

  return res.rows.map((row: any) => parse(row.data_json));
}

export async function initializeSystemCommunities() {
  await initBunnyCommunitySchema();
  
  let globalCommunity = await getBunnyCommunity('global-community');
  if (!globalCommunity) {
    globalCommunity = await createBunnyCommunity({
      id: 'global-community',
      name: 'Swar Yoga Global Community',
      description: 'Public community for all Swar Yoga practitioners and enthusiasts',
      type: 'global',
      isArchived: false,
    });
  }

  let oldSadhakCommunity = await getBunnyCommunity('old-sadhak-community');
  if (!oldSadhakCommunity) {
    oldSadhakCommunity = await createBunnyCommunity({
      id: 'old-sadhak-community',
      name: 'Swar Yoga Sadhak Alumni',
      description: 'Community for practitioners who have completed Swar Yoga workshops',
      type: 'old_sadhak',
      isArchived: false,
    });
  }

  return { global: globalCommunity, oldSadhak: oldSadhakCommunity };
}

export async function createWorkshopCommunity(
  workshopId: string,
  workshopName: string,
  description?: string
) {
  const { oldSadhak } = await initializeSystemCommunities();
  
  const communityData = {
    id: `workshop-${workshopId}`,
    name: `${workshopName} Community`,
    description: description || `Community for ${workshopName} participants`,
    type: 'workshop_active',
    workshopId: workshopId,
    parentCommunityId: oldSadhak._id,
    isArchived: false,
  };

  const community = await createBunnyCommunity(communityData);
  console.log(`✅ Created workshop community: ${community.name}`);
  return community;
}
