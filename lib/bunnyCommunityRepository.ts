import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { DEFAULT_COMMUNITIES } from '@/lib/communitySeed';

export type BunnyCommunity = {
  id: string;
  _id?: string;
  slug: string;
  name: string;
  description?: string;
  type: string;
  isArchived: boolean;
  membersCount?: number;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
  rawDoc?: Record<string, any>;
};

export type BunnyCommunityMember = {
  id: string;
  _id?: string;
  userId: string;
  communityId: string;
  name: string;
  mobile: string;
  email?: string;
  countryCode?: string;
  country?: string;
  role: string;
  status: string;
  approved: boolean;
  joinedAt: string;
  updatedAt: string;
  rawDoc?: Record<string, any>;
};

export type BunnyCommunityPost = {
  id: string;
  _id?: string;
  communityId: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  content: string;
  images: string[];
  category: string;
  isPublic: boolean;
  status: string;
  likes: string[];
  comments: Array<{
    userId: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  rawDoc?: Record<string, any>;
};

export type BunnyCommunityVideo = {
  id: string;
  _id?: string;
  communityId: string;
  title: string;
  description?: string;
  s3Key: string;
  bunnyVideoId?: string;
  duration: number;
  thumbnailUrl?: string;
  uploadedBy: string;
  isShareable: boolean;
  createdAt: string;
  updatedAt: string;
  rawDoc?: Record<string, any>;
};

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (val: unknown, fallback: unknown) => JSON.stringify(val ?? fallback);
const parse = <T>(val: unknown, fallback: T): T => {
  try {
    return val ? (JSON.parse(String(val)) as T) : fallback;
  } catch {
    return fallback;
  }
};

function parseMongoDate(val: any): string {
  if (!val) return now();
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val.$date) {
    if (typeof val.$date === 'string') return val.$date;
    if (val.$date.$numberLong) return new Date(Number(val.$date.$numberLong)).toISOString();
    return new Date(Number(val.$date)).toISOString();
  }
  return now();
}

function parseMongoNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'object' && val.$numberInt) return Number(val.$numberInt) || fallback;
  if (typeof val === 'object' && val.$numberDouble) return Number(val.$numberDouble) || fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

let communitySchemaPromise: Promise<void> | undefined;

export function initCommunitySchema() {
  if (!communitySchemaPromise) {
    communitySchemaPromise = initializeCommunitySchema().catch((err) => {
      communitySchemaPromise = undefined;
      throw err;
    });
  }
  return communitySchemaPromise;
}
export const initBunnyCommunitySchema = initCommunitySchema;

async function initializeCommunitySchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS communities_sql (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'global',
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_by_user_id TEXT,
        raw_doc_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities_sql(slug)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS community_members_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        community_id TEXT NOT NULL,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT,
        country_code TEXT DEFAULT '+91',
        country TEXT,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'active',
        approved INTEGER NOT NULL DEFAULT 1,
        raw_doc_json TEXT NOT NULL DEFAULT '{}',
        joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_comm_members_comm ON community_members_sql(community_id)',
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_comm_members_mobile ON community_members_sql(mobile)',
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_comm_members_email ON community_members_sql(email)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS community_posts_sql (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        user_photo TEXT,
        content TEXT NOT NULL,
        images_json TEXT NOT NULL DEFAULT '[]',
        category TEXT NOT NULL DEFAULT 'general',
        is_public INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'published',
        likes_json TEXT NOT NULL DEFAULT '[]',
        comments_json TEXT NOT NULL DEFAULT '[]',
        raw_doc_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_comm_posts_comm ON community_posts_sql(community_id, status, created_at)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS community_videos_sql (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        s3_key TEXT NOT NULL,
        bunny_video_id TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        thumbnail_url TEXT,
        uploaded_by TEXT,
        is_shareable INTEGER NOT NULL DEFAULT 0,
        raw_doc_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_comm_videos_comm ON community_videos_sql(community_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS community_moderation_sql (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        user_phone TEXT,
        user_email TEXT,
        content TEXT NOT NULL,
        rating INTEGER,
        photo_url TEXT,
        community_id TEXT NOT NULL DEFAULT 'global',
        status TEXT NOT NULL DEFAULT 'approved',
        featured INTEGER NOT NULL DEFAULT 0,
        raw_doc_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_comm_mod_type ON community_moderation_sql(type, status)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS community_join_requests_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT,
        community_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        raw_doc_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
  ]);

  // Seed communities_sql from mongo_documents if empty
  const countComm = await bunnyExecute('SELECT COUNT(*) as cnt FROM communities_sql');
  if (Number(countComm.rows[0]?.cnt || 0) === 0) {
    try {
      const archived = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'communities'"
      );
      for (const row of archived.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const cId = String(doc.id || doc._id || row.document_id);
          const slug = String(doc.slug || doc.id || cId);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO communities_sql (
              id, slug, name, description, type, is_archived, created_by_user_id, raw_doc_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              cId,
              slug,
              String(doc.name || slug),
              String(doc.description || ''),
              String(doc.type || 'global'),
              doc.isArchived ? 1 : 0,
              doc.createdByUserId ? String(doc.createdByUserId) : null,
              json(doc, {}),
              parseMongoDate(doc.createdAt),
              parseMongoDate(doc.updatedAt),
            ],
          });
        } catch (itemErr) {
          console.error('[Seed communities_sql] Error migrating item:', itemErr);
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed communities_sql] mongo_documents read skipped:', archiveErr);
    }

    // Ensure default system communities exist
    for (const def of DEFAULT_COMMUNITIES) {
      await bunnyExecute({
        sql: `INSERT OR IGNORE INTO communities_sql (
          id, slug, name, description, type, is_archived, raw_doc_json, created_at, updated_at
        ) VALUES (?, ?, ?, '', 'global', 0, '{}', ?, ?)`,
        args: [def.id, def.id, def.name, now(), now()],
      }).catch(() => {});
    }
  }

  // Seed community_members_sql from mongo_documents if empty
  const countMembers = await bunnyExecute('SELECT COUNT(*) as cnt FROM community_members_sql');
  if (Number(countMembers.rows[0]?.cnt || 0) === 0) {
    try {
      const archived = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'communitymembers'"
      );
      for (const row of archived.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const mId = String(doc._id || row.document_id);
          const rawMobile = String(doc.mobile || doc.phone || '');
          if (!rawMobile) continue;
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO community_members_sql (
              id, user_id, community_id, name, mobile, email, country_code, country, role, status, approved, raw_doc_json, joined_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              mId,
              doc.userId ? String(doc.userId) : null,
              String(doc.communityId || 'global'),
              String(doc.name || 'Member'),
              rawMobile,
              doc.email ? String(doc.email) : null,
              String(doc.countryCode || '+91'),
              String(doc.country || ''),
              String(doc.role || 'member'),
              String(doc.status || 'active'),
              doc.approved !== false ? 1 : 0,
              json(doc, {}),
              parseMongoDate(doc.joinedAt || doc.createdAt),
              parseMongoDate(doc.updatedAt || doc.createdAt),
            ],
          });
        } catch (itemErr) {
          console.error('[Seed community_members_sql] Error migrating item:', itemErr);
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed community_members_sql] mongo_documents read skipped:', archiveErr);
    }
  }

  // Seed community_posts_sql from mongo_documents if empty
  const countPosts = await bunnyExecute('SELECT COUNT(*) as cnt FROM community_posts_sql');
  if (Number(countPosts.rows[0]?.cnt || 0) === 0) {
    try {
      const archived = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'communityposts'"
      );
      for (const row of archived.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const pId = String(doc._id || row.document_id);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO community_posts_sql (
              id, community_id, user_id, user_name, user_photo, content, images_json,
              category, is_public, status, likes_json, comments_json, raw_doc_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              pId,
              String(doc.communityId || 'global'),
              String(doc.userId || 'admin'),
              doc.userName || null,
              doc.userPhoto || null,
              String(doc.content || ''),
              json(doc.images, []),
              String(doc.category || 'general'),
              doc.isPublic !== false ? 1 : 0,
              String(doc.status || 'published'),
              json(doc.likes, []),
              json(doc.comments, []),
              json(doc, {}),
              parseMongoDate(doc.createdAt),
              parseMongoDate(doc.updatedAt),
            ],
          });
        } catch (itemErr) {
          console.error('[Seed community_posts_sql] Error migrating item:', itemErr);
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed community_posts_sql] mongo_documents read skipped:', archiveErr);
    }
  }

  // Seed community_videos_sql from mongo_documents if empty
  const countVideos = await bunnyExecute('SELECT COUNT(*) as cnt FROM community_videos_sql');
  if (Number(countVideos.rows[0]?.cnt || 0) === 0) {
    try {
      const archived = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'communityvideos'"
      );
      for (const row of archived.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const vId = String(doc._id || row.document_id);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO community_videos_sql (
              id, community_id, title, description, s3_key, bunny_video_id, duration,
              thumbnail_url, uploaded_by, is_shareable, raw_doc_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              vId,
              String(doc.communityId || 'global'),
              String(doc.title || 'Video'),
              String(doc.description || ''),
              String(doc.s3Key || ''),
              doc.bunnyVideoId ? String(doc.bunnyVideoId) : null,
              parseMongoNumber(doc.duration, 0),
              doc.thumbnailUrl ? String(doc.thumbnailUrl) : null,
              String(doc.uploadedBy || 'admin'),
              doc.isShareable ? 1 : 0,
              json(doc, {}),
              parseMongoDate(doc.createdAt),
              parseMongoDate(doc.updatedAt),
            ],
          });
        } catch (itemErr) {
          console.error('[Seed community_videos_sql] Error migrating item:', itemErr);
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed community_videos_sql] mongo_documents read skipped:', archiveErr);
    }
  }

  // Seed community_moderation_sql from mongo_documents if empty
  const countMod = await bunnyExecute('SELECT COUNT(*) as cnt FROM community_moderation_sql');
  if (Number(countMod.rows[0]?.cnt || 0) === 0) {
    try {
      const collMap: Record<string, string> = {
        community_experiences: 'experience',
        community_questions: 'question',
        community_tips: 'tip',
        community_transformations: 'transformation',
      };
      for (const [coll, type] of Object.entries(collMap)) {
        const archived = await bunnyExecute({
          sql: 'SELECT document_id, document_json FROM mongo_documents WHERE collection_name = ?',
          args: [coll],
        });
        for (const row of archived.rows) {
          try {
            const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
            const mId = String(doc._id || row.document_id);
            await bunnyExecute({
              sql: `INSERT OR REPLACE INTO community_moderation_sql (
                id, type, user_id, user_name, user_phone, user_email, content,
                rating, photo_url, community_id, status, featured, raw_doc_json, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                mId,
                type,
                doc.userId ? String(doc.userId) : null,
                String(doc.userName || 'Member'),
                doc.userPhone ? String(doc.userPhone) : null,
                doc.userEmail ? String(doc.userEmail) : null,
                String(doc.content || doc.question || doc.text || ''),
                parseMongoNumber(doc.rating, 5),
                doc.photoUrl ? String(doc.photoUrl) : null,
                String(doc.communityId || 'global'),
                String(doc.status || 'approved'),
                doc.featured ? 1 : 0,
                json(doc, {}),
                parseMongoDate(doc.createdAt),
                parseMongoDate(doc.updatedAt),
              ],
            });
          } catch (itemErr) {
            console.error(`[Seed community_moderation_sql] Error for ${type}:`, itemErr);
          }
        }
      }
    } catch (archiveErr) {
      console.warn('[Seed community_moderation_sql] mongo_documents read skipped:', archiveErr);
    }
  }
}

// ============================================
// Communities CRUD
// ============================================

export async function listCommunities(filter?: {
  viewerId?: string;
  isSuperAdmin?: boolean;
}): Promise<BunnyCommunity[]> {
  await initCommunitySchema();
  let sql = 'SELECT * FROM communities_sql WHERE is_archived = 0';
  const args: any[] = [];

  if (filter && !filter.isSuperAdmin && filter.viewerId) {
    sql += ' AND (created_by_user_id = ? OR created_by_user_id IS NULL OR created_by_user_id = \'\')';
    args.push(filter.viewerId);
  }

  sql += ' ORDER BY created_at ASC';
  const res = await bunnyExecute({ sql, args });

  return Promise.all(
    res.rows.map(async (row: any) => {
      const countRes = await bunnyExecute({
        sql: 'SELECT COUNT(*) as cnt FROM community_members_sql WHERE community_id = ? AND status = \'active\'',
        args: [String(row.id)],
      });
      return {
        id: String(row.id),
        _id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
        description: row.description || '',
        type: String(row.type),
        isArchived: Boolean(row.is_archived),
        membersCount: Number(countRes.rows[0]?.cnt || 0),
        createdByUserId: row.created_by_user_id || undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        rawDoc: parse(row.raw_doc_json, {}),
      };
    })
  );
}

export async function getCommunity(idOrSlug: string): Promise<BunnyCommunity | null> {
  await initCommunitySchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM communities_sql WHERE id = ? OR slug = ? LIMIT 1',
    args: [idOrSlug, idOrSlug],
  });
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  const countRes = await bunnyExecute({
    sql: 'SELECT COUNT(*) as cnt FROM community_members_sql WHERE community_id = ? AND status = \'active\'',
    args: [String(row.id)],
  });
  return {
    id: String(row.id),
    _id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description ? String(row.description) : '',
    type: String(row.type),
    isArchived: Boolean(row.is_archived),
    membersCount: Number(countRes.rows[0]?.cnt || 0),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    rawDoc: parse(row.raw_doc_json, {}),
  };
}

// ============================================
// Posts & Comments
// ============================================

export async function listCommunityPosts(filter: {
  communityId?: string;
  category?: string;
  publicOnly?: boolean;
  limit?: number;
  skip?: number;
}): Promise<{ posts: BunnyCommunityPost[]; total: number }> {
  await initCommunitySchema();
  const conditions: string[] = ["status = 'published'"];
  const args: any[] = [];

  if (filter.publicOnly) {
    conditions.push('is_public = 1');
  }

  if (filter.category && filter.category !== 'all') {
    conditions.push('category = ?');
    args.push(filter.category);
  }

  if (filter.communityId) {
    conditions.push('(community_id = ? OR json_extract(raw_doc_json, "$.metadata.targetCommunityIds") LIKE ?)');
    args.push(filter.communityId, `%"${filter.communityId}"%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRes = await bunnyExecute({
    sql: `SELECT COUNT(*) as cnt FROM community_posts_sql ${where}`,
    args,
  });
  const total = Number(countRes.rows[0]?.cnt || 0);

  const limit = Math.max(1, Math.min(filter.limit || 20, 100));
  const skip = Math.max(0, filter.skip || 0);

  const res = await bunnyExecute({
    sql: `SELECT * FROM community_posts_sql ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, skip],
  });

  const posts = res.rows.map((row: any) => ({
    id: String(row.id),
    _id: String(row.id),
    communityId: String(row.community_id),
    userId: String(row.user_id),
    userName: row.user_name || undefined,
    userPhoto: row.user_photo || undefined,
    content: String(row.content),
    images: parse(row.images_json, []),
    category: String(row.category || 'general'),
    isPublic: Boolean(row.is_public),
    status: String(row.status || 'published'),
    likes: parse(row.likes_json, []),
    comments: parse(row.comments_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    rawDoc: parse(row.raw_doc_json, {}),
  }));

  return { posts, total };
}

export async function getCommunityPost(postId: string): Promise<BunnyCommunityPost | null> {
  await initCommunitySchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM community_posts_sql WHERE id = ? LIMIT 1',
    args: [postId],
  });
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: String(row.id),
    _id: String(row.id),
    communityId: String(row.community_id),
    userId: String(row.user_id),
    userName: row.user_name ? String(row.user_name) : undefined,
    userPhoto: row.user_photo ? String(row.user_photo) : undefined,
    content: String(row.content),
    images: parse(row.images_json, []),
    category: String(row.category || 'general'),
    isPublic: Boolean(row.is_public),
    status: String(row.status || 'published'),
    likes: parse(row.likes_json, []),
    comments: parse(row.comments_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    rawDoc: parse(row.raw_doc_json, {}),
  };
}

export async function createCommunityPost(data: {
  communityId: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  content: string;
  images?: string[];
  category?: string;
  isPublic?: boolean;
}): Promise<BunnyCommunityPost> {
  await initCommunitySchema();
  const postId = id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO community_posts_sql (
      id, community_id, user_id, user_name, user_photo, content, images_json,
      category, is_public, status, likes_json, comments_json, raw_doc_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', '[]', '[]', '{}', ?, ?)`,
    args: [
      postId,
      data.communityId,
      data.userId,
      data.userName || null,
      data.userPhoto || null,
      data.content,
      json(data.images, []),
      data.category || 'general',
      data.isPublic !== false ? 1 : 0,
      timestamp,
      timestamp,
    ],
  });

  const created = await getCommunityPost(postId);
  if (!created) throw new Error('Failed to retrieve created community post');
  return created;
}

export async function likeCommunityPost(postId: string, userId: string): Promise<{ likesCount: number; likedByMe: boolean }> {
  await initCommunitySchema();
  const post = await getCommunityPost(postId);
  if (!post) throw new Error('Post not found');

  const likes = new Set(post.likes);
  const alreadyLiked = likes.has(userId);

  if (alreadyLiked) {
    likes.delete(userId);
  } else {
    likes.add(userId);
  }

  const newLikesArray = Array.from(likes);
  await bunnyExecute({
    sql: 'UPDATE community_posts_sql SET likes_json = ?, updated_at = ? WHERE id = ?',
    args: [JSON.stringify(newLikesArray), now(), postId],
  });

  return {
    likesCount: newLikesArray.length,
    likedByMe: !alreadyLiked,
  };
}

export async function addCommunityComment(
  postId: string,
  comment: { userId: string; text: string }
): Promise<void> {
  await initCommunitySchema();
  const post = await getCommunityPost(postId);
  if (!post) throw new Error('Post not found');

  const comments = [...post.comments, {
    userId: comment.userId,
    text: comment.text,
    createdAt: now(),
  }];

  await bunnyExecute({
    sql: 'UPDATE community_posts_sql SET comments_json = ?, updated_at = ? WHERE id = ?',
    args: [JSON.stringify(comments), now(), postId],
  });
}

// ============================================
// Members & Stats
// ============================================

export async function getCommunityStats(): Promise<Record<string, number>> {
  await initCommunitySchema();
  const res = await bunnyExecute(
    'SELECT community_id, COUNT(*) as cnt FROM community_members_sql WHERE status = \'active\' GROUP BY community_id'
  );
  const result: Record<string, number> = {};
  for (const row of res.rows) {
    result[String(row.community_id)] = Number(row.cnt || 0);
  }
  return result;
}

export async function checkUserMemberships(mobile?: string, email?: string): Promise<string[]> {
  await initCommunitySchema();
  const conditions: string[] = ["status = 'active'"];
  const args: any[] = [];

  if (mobile) {
    const cleanMobile = mobile.replace(/\D/g, '');
    const variants = [cleanMobile, mobile];
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      variants.push(cleanMobile.slice(2));
    } else if (cleanMobile.length === 10) {
      variants.push('91' + cleanMobile);
    }
    const placeholders = variants.map(() => '?').join(',');
    conditions.push(`mobile IN (${placeholders})`);
    args.push(...variants);
  } else if (email) {
    conditions.push('LOWER(email) = ?');
    args.push(email.toLowerCase().trim());
  } else {
    return ['global'];
  }

  const res = await bunnyExecute({
    sql: `SELECT DISTINCT community_id FROM community_members_sql WHERE ${conditions.join(' AND ')}`,
    args,
  });

  const memberCommunities = res.rows.map((r: any) => String(r.community_id));
  if (!memberCommunities.includes('global')) {
    memberCommunities.push('global');
  }
  return memberCommunities;
}

export async function saveCommunityMember(data: {
  userId?: string;
  communityId: string;
  name: string;
  mobile: string;
  email?: string;
  countryCode?: string;
  country?: string;
  role?: string;
  status?: string;
}): Promise<BunnyCommunityMember> {
  await initCommunitySchema();
  const timestamp = now();
  const cleanMobile = data.mobile.replace(/\D/g, '');

  const existing = await bunnyExecute({
    sql: 'SELECT id FROM community_members_sql WHERE (user_id = ? OR mobile = ?) AND community_id = ? LIMIT 1',
    args: [data.userId || '', cleanMobile, data.communityId],
  });

  const memberId = existing.rows[0] ? String(existing.rows[0].id) : id();

  await bunnyExecute({
    sql: `INSERT INTO community_members_sql (
      id, user_id, community_id, name, mobile, email, country_code, country, role, status, approved, raw_doc_json, joined_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '{}', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = COALESCE(excluded.email, community_members_sql.email),
      country_code = excluded.country_code,
      country = excluded.country,
      status = excluded.status,
      updated_at = excluded.updated_at`,
    args: [
      memberId,
      data.userId || null,
      data.communityId,
      data.name.trim(),
      cleanMobile,
      data.email?.toLowerCase().trim() || null,
      data.countryCode || '+91',
      data.country || '',
      data.role || 'member',
      data.status || 'active',
      timestamp,
      timestamp,
    ],
  });

  const res = await bunnyExecute({
    sql: 'SELECT * FROM community_members_sql WHERE id = ? LIMIT 1',
    args: [memberId],
  });
  const row = res.rows[0];
  return {
    id: String(row.id),
    _id: String(row.id),
    userId: String(row.user_id || ''),
    communityId: String(row.community_id),
    name: String(row.name),
    mobile: String(row.mobile),
    email: row.email ? String(row.email) : undefined,
    role: String(row.role || 'member'),
    status: String(row.status || 'active'),
    approved: Boolean(row.approved),
    joinedAt: String(row.joined_at),
    updatedAt: String(row.updated_at),
  };
}

export async function removeCommunityMember(communityId: string, userIdOrMobile: string): Promise<void> {
  await initCommunitySchema();
  await bunnyExecute({
    sql: 'DELETE FROM community_members_sql WHERE community_id = ? AND (user_id = ? OR mobile = ?)',
    args: [communityId, userIdOrMobile, userIdOrMobile],
  });
}

// ============================================
// Videos
// ============================================

export async function listCommunityVideos(communityId: string): Promise<BunnyCommunityVideo[]> {
  await initCommunitySchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM community_videos_sql WHERE community_id = ? ORDER BY created_at DESC',
    args: [communityId],
  });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    _id: String(row.id),
    communityId: String(row.community_id),
    title: String(row.title),
    description: row.description || '',
    s3Key: String(row.s3_key),
    bunnyVideoId: row.bunny_video_id || undefined,
    duration: Number(row.duration || 0),
    thumbnailUrl: row.thumbnail_url || undefined,
    uploadedBy: String(row.uploaded_by || 'admin'),
    isShareable: Boolean(row.is_shareable),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function getCommunityVideo(videoId: string): Promise<BunnyCommunityVideo | null> {
  await initCommunitySchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM community_videos_sql WHERE id = ? LIMIT 1',
    args: [videoId],
  });
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: String(row.id),
    _id: String(row.id),
    communityId: String(row.community_id),
    title: String(row.title),
    description: row.description ? String(row.description) : '',
    s3Key: String(row.s3_key),
    bunnyVideoId: row.bunny_video_id ? String(row.bunny_video_id) : undefined,
    duration: Number(row.duration || 0),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
    uploadedBy: String(row.uploaded_by || 'admin'),
    isShareable: Boolean(row.is_shareable),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function saveCommunityVideo(data: {
  id?: string;
  communityId: string;
  title: string;
  description?: string;
  s3Key: string;
  bunnyVideoId?: string;
  duration?: number;
  thumbnailUrl?: string;
  uploadedBy?: string;
  isShareable?: boolean;
}): Promise<BunnyCommunityVideo> {
  await initCommunitySchema();
  const videoId = data.id || id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO community_videos_sql (
      id, community_id, title, description, s3_key, bunny_video_id, duration,
      thumbnail_url, uploaded_by, is_shareable, raw_doc_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      s3_key = excluded.s3_key,
      bunny_video_id = excluded.bunny_video_id,
      duration = excluded.duration,
      thumbnail_url = excluded.thumbnail_url,
      updated_at = excluded.updated_at`,
    args: [
      videoId,
      data.communityId,
      data.title,
      data.description || '',
      data.s3Key,
      data.bunnyVideoId || null,
      Number(data.duration || 0),
      data.thumbnailUrl || null,
      data.uploadedBy || 'admin',
      data.isShareable ? 1 : 0,
      timestamp,
      timestamp,
    ],
  });
  const video = await getCommunityVideo(videoId);
  if (!video) throw new Error('Failed to retrieve saved community video');
  return video;
}

export async function deleteCommunityVideo(videoId: string): Promise<void> {
  await initCommunitySchema();
  await bunnyExecute({
    sql: 'DELETE FROM community_videos_sql WHERE id = ?',
    args: [videoId],
  });
}

// ============================================
// Moderation (Experiences, Questions, Tips, Transformations)
// ============================================

export async function listModerationItems(
  type: string,
  status = 'approved',
  limit = 50
): Promise<any[]> {
  await initCommunitySchema();
  let sql = 'SELECT * FROM community_moderation_sql WHERE type = ?';
  const args: any[] = [type];

  if (status !== 'all') {
    sql += ' AND status = ?';
    args.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(Math.max(1, Math.min(limit, 200)));

  const res = await bunnyExecute({ sql, args });
  return res.rows.map((row: any) => ({
    _id: String(row.id),
    id: String(row.id),
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    userEmail: row.user_email,
    content: row.content,
    rating: Number(row.rating || 5),
    photoUrl: row.photo_url,
    communityId: row.community_id,
    status: row.status,
    featured: Boolean(row.featured),
    createdAt: row.created_at,
  }));
}

export async function countModerationPending(type: string): Promise<number> {
  await initCommunitySchema();
  const res = await bunnyExecute({
    sql: "SELECT COUNT(*) as cnt FROM community_moderation_sql WHERE type = ? AND status = 'pending'",
    args: [type],
  });
  return Number(res.rows[0]?.cnt || 0);
}

export async function createModerationItem(data: {
  type: string;
  userId?: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  content: string;
  rating?: number;
  photoUrl?: string;
  communityId?: string;
  status?: string;
}): Promise<any> {
  await initCommunitySchema();
  const itemId = id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO community_moderation_sql (
      id, type, user_id, user_name, user_phone, user_email, content,
      rating, photo_url, community_id, status, featured, raw_doc_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '{}', ?, ?)`,
    args: [
      itemId,
      data.type,
      data.userId || null,
      data.userName,
      data.userPhone || null,
      data.userEmail || null,
      data.content,
      Number(data.rating || 5),
      data.photoUrl || null,
      data.communityId || 'global',
      data.status || 'pending',
      timestamp,
      timestamp,
    ],
  });
  return { _id: itemId, id: itemId, ...data, createdAt: timestamp };
}

export async function updateModerationItem(
  id: string,
  updates: { status?: string; featured?: boolean }
): Promise<any> {
  await initCommunitySchema();
  const setClauses: string[] = ['updated_at = ?'];
  const args: any[] = [now()];

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    args.push(updates.status);
  }
  if (updates.featured !== undefined) {
    setClauses.push('featured = ?');
    args.push(updates.featured ? 1 : 0);
  }

  args.push(id);
  await bunnyExecute({
    sql: `UPDATE community_moderation_sql SET ${setClauses.join(', ')} WHERE id = ?`,
    args,
  });

  const res = await bunnyExecute({
    sql: 'SELECT * FROM community_moderation_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    userEmail: row.user_email,
    content: row.content,
    rating: Number(row.rating || 5),
    photoUrl: row.photo_url,
    communityId: row.community_id,
    status: row.status,
    featured: Boolean(row.featured),
    createdAt: row.created_at,
  };
}

// ============================================
// Join Requests
// ============================================

export async function createJoinRequest(data: {
  userId?: string;
  name: string;
  mobile: string;
  email?: string;
  communityId: string;
}): Promise<any> {
  await initCommunitySchema();
  const reqId = id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO community_join_requests_sql (
      id, user_id, name, mobile, email, community_id, status, raw_doc_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', '{}', ?, ?)`,
    args: [
      reqId,
      data.userId || null,
      data.name,
      data.mobile,
      data.email || null,
      data.communityId,
      timestamp,
      timestamp,
    ],
  });
  return { _id: reqId, id: reqId, ...data, status: 'pending', createdAt: timestamp };
}

// ============================================
// Admin Compatibility Helpers
// ============================================

export async function listBunnyCommunities(filter?: any): Promise<any[]> {
  await initCommunitySchema();
  let sql = 'SELECT * FROM communities_sql WHERE 1=1';
  const args: any[] = [];
  if (filter?.isArchived === false) {
    sql += ' AND is_archived = 0';
  } else if (filter?.isArchived === true) {
    sql += ' AND is_archived = 1';
  }
  if (filter?.type) {
    sql += ' AND type = ?';
    args.push(filter.type);
  }
  if (filter?._id?.$in && Array.isArray(filter._id.$in)) {
    const placeholders = filter._id.$in.map(() => '?').join(',');
    sql += ` AND id IN (${placeholders})`;
    args.push(...filter._id.$in);
  }
  sql += ' ORDER BY name ASC';
  const res = await bunnyExecute({ sql, args });
  return res.rows.map((row: any) => {
    const rawDoc = cleanMongoJson(parse(row.raw_doc_json || row.data_json, {}));
    const communityName = row.name && row.name !== 'null' ? String(row.name) : (rawDoc.name && rawDoc.name !== 'null' ? String(rawDoc.name) : String(row.id));
    const communitySlug = row.slug && row.slug !== 'null' ? String(row.slug) : (rawDoc.slug && rawDoc.slug !== 'null' ? String(rawDoc.slug) : String(row.id));
    return {
      ...rawDoc,
      id: String(row.id),
      _id: String(row.id),
      slug: communitySlug,
      name: communityName,
      description: row.description ? String(row.description) : (rawDoc.description || ''),
      type: String(row.type || rawDoc.type || 'global'),
      isArchived: Boolean(row.is_archived ?? rawDoc.isArchived),
      createdAt: String(row.created_at || rawDoc.createdAt || now()),
      updatedAt: String(row.updated_at || rawDoc.updatedAt || now()),
    };
  });
}

export async function getBunnyCommunity(idOrSlug: string): Promise<any> {
  const c = await getCommunity(idOrSlug);
  if (!c) return null;
  const rawDoc = cleanMongoJson(c.rawDoc || {});
  return {
    ...rawDoc,
    id: c.id,
    _id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    type: c.type,
    isArchived: c.isArchived,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export async function getBunnyCommunityByName(name: string): Promise<any> {
  await initCommunitySchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM communities_sql WHERE lower(name) = ? LIMIT 1',
    args: [name.toLowerCase().trim()],
  });
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  const rawDoc = cleanMongoJson(parse(row.raw_doc_json, {}));
  return {
    ...rawDoc,
    id: String(row.id),
    _id: String(row.id),
    slug: String(row.slug || row.id),
    name: String(row.name || row.id),
    description: row.description ? String(row.description) : '',
    type: String(row.type || 'global'),
    isArchived: Boolean(row.is_archived),
  };
}

export async function createBunnyCommunity(data: {
  id: string;
  name: string;
  description?: string;
  type?: string;
  joinLink?: string;
  whatsappGroupId?: string;
  isArchived?: boolean;
}): Promise<any> {
  await initCommunitySchema();
  const nowIso = now();
  const rawDoc = {
    joinLink: data.joinLink || '',
    whatsappGroupId: data.whatsappGroupId || '',
  };
  await bunnyExecute({
    sql: `INSERT INTO communities_sql (id, slug, name, description, type, is_archived, raw_doc_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id,
      data.id,
      data.name,
      data.description || '',
      data.type || 'global',
      data.isArchived ? 1 : 0,
      JSON.stringify(rawDoc),
      nowIso,
      nowIso,
    ],
  });
  return {
    id: data.id,
    _id: data.id,
    name: data.name,
    description: data.description || '',
    type: data.type || 'global',
    joinLink: data.joinLink || '',
    whatsappGroupId: data.whatsappGroupId || '',
    isArchived: Boolean(data.isArchived),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function updateBunnyCommunity(communityId: string, updates: any): Promise<any> {
  await initCommunitySchema();
  const existing = await getCommunity(communityId);
  const rawDoc = existing?.rawDoc || {};
  if (updates.joinLink !== undefined) rawDoc.joinLink = updates.joinLink;
  if (updates.whatsappGroupId !== undefined) rawDoc.whatsappGroupId = updates.whatsappGroupId;
  if (updates.archivedAt !== undefined) rawDoc.archivedAt = updates.archivedAt;

  const name = updates.name !== undefined ? updates.name : (existing?.name || communityId);
  const description = updates.description !== undefined ? updates.description : (existing?.description || '');
  const type = updates.type !== undefined ? updates.type : (existing?.type || 'global');
  const isArchived = updates.isArchived !== undefined ? (updates.isArchived ? 1 : 0) : (existing?.isArchived ? 1 : 0);
  const nowIso = now();

  await bunnyExecute({
    sql: `UPDATE communities_sql SET
            name = ?,
            description = ?,
            type = ?,
            is_archived = ?,
            raw_doc_json = ?,
            updated_at = ?
          WHERE id = ? OR slug = ?`,
    args: [name, description, type, isArchived, JSON.stringify(rawDoc), nowIso, communityId, communityId],
  });

  return {
    id: communityId,
    _id: communityId,
    name,
    description,
    type,
    isArchived: Boolean(isArchived),
    ...rawDoc,
  };
}

export async function initializeSystemCommunities(): Promise<{ global: any; oldSadhak: any }> {
  await initCommunitySchema();
  const global = await getCommunity('global');
  const oldSadhak = await getCommunity('swar-yoga');
  return {
    global: global ? { _id: global.id, name: global.name, type: global.type } : { _id: 'global', name: 'Global Community', type: 'global' },
    oldSadhak: oldSadhak ? { _id: oldSadhak.id, name: oldSadhak.name, type: oldSadhak.type } : { _id: 'swar-yoga', name: 'Swar Yoga', type: 'workshop_active' },
  };
}

export async function listBunnyCommunityMembers(filter?: {
  communityId?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<{ members: any[]; total: number }> {
  await initCommunitySchema();
  let sql = 'SELECT * FROM community_members_sql WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as cnt FROM community_members_sql WHERE 1=1';
  const args: any[] = [];
  const countArgs: any[] = [];

  if (filter?.communityId) {
    sql += ' AND community_id = ?';
    countSql += ' AND community_id = ?';
    args.push(filter.communityId);
    countArgs.push(filter.communityId);
  }
  if (filter?.status && filter.status !== 'all') {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    args.push(filter.status);
    countArgs.push(filter.status);
  }

  const countRes = await bunnyExecute({ sql: countSql, args: countArgs });
  const total = Number(countRes.rows[0]?.cnt || 0);

  sql += ' ORDER BY joined_at DESC';
  if (filter?.limit && filter.limit > 0) {
    sql += ' LIMIT ?';
    args.push(filter.limit);
    if (filter?.skip && filter.skip > 0) {
      sql += ' OFFSET ?';
      args.push(filter.skip);
    }
  }

  const res = await bunnyExecute({ sql, args });
  const members = res.rows.map((row: any) => {
    const rawDoc = cleanMongoJson(parse(row.raw_doc_json, {}));
    return {
      ...rawDoc,
      id: String(row.id),
      _id: String(row.id),
      userId: row.user_id ? String(row.user_id) : (rawDoc.userId ? String(rawDoc.userId) : String(row.id)),
      communityId: String(row.community_id),
      name: row.name && row.name !== 'null' ? String(row.name) : (rawDoc.name && rawDoc.name !== 'null' ? String(rawDoc.name) : 'Member'),
      mobile: row.mobile && row.mobile !== 'null' ? String(row.mobile) : (rawDoc.mobile || ''),
      email: row.email ? String(row.email) : (rawDoc.email || ''),
      role: String(row.role || rawDoc.role || 'member'),
      status: String(row.status || rawDoc.status || 'active'),
      approved: Boolean(row.approved ?? rawDoc.approved),
      joinedAt: String(row.joined_at || rawDoc.joinedAt || now()),
      updatedAt: String(row.updated_at || rawDoc.updatedAt || now()),
      messageCount: typeof rawDoc.messageCount === 'number' ? rawDoc.messageCount : parseMongoNumber(rawDoc.messageCount, 0),
      reactions: typeof rawDoc.reactions === 'number' ? rawDoc.reactions : parseMongoNumber(rawDoc.reactions, 0),
    };
  });

  return { members, total };
}

