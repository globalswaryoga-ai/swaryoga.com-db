import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

export interface BunnyMediaComment {
  id: string;
  mediaId: string;
  mediaTitle: string;
  authorName: string;
  authorAvatar?: string;
  commentText: string;
  likesCount: number;
  status: 'approved' | 'flagged' | 'pinned';
  createdAt: string;
  updatedAt: string;
}

export async function initBunnyMediaCommentsSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS bunny_media_comments_sql (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        media_title TEXT DEFAULT '',
        author_name TEXT NOT NULL,
        author_avatar TEXT DEFAULT '',
        comment_text TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'approved',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bunny_comments_media ON bunny_media_comments_sql(media_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bunny_comments_created ON bunny_media_comments_sql(created_at DESC)`, args: [] }
  ]);

  try {
    const countCheck = await bunnyExecute({
      sql: `SELECT COUNT(*) as count FROM bunny_media_comments_sql`,
      args: []
    });
    const totalCount = Number(countCheck.rows?.[0]?.count || 0);
    if (totalCount === 0) {
      await seedInitialComments();
    }
  } catch (e) {
    console.warn('Comments auto-seed check bypassed:', e);
  }
}

async function seedInitialComments() {
  const now = new Date().toISOString();
  const seedComments = [
    {
      id: 'comm_seed_1',
      media_id: 'seed_video_swar_masterclass',
      media_title: 'Swar Yoga Complete Masterclass: Science of Shiva Swarodaya & Nostril Cycles',
      author_name: 'Ramesh Sharma',
      author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      comment_text: 'मोहन सर, यह स्वर परीक्षण मैंने आजमाया, तुरंत लाभ मिला। सिरदर्द 5 मिनट में शांत हो गया। धन्यवाद प्रणाम! 🙏',
      likes_count: 42,
      status: 'pinned',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: now
    },
    {
      id: 'comm_seed_2',
      media_id: 'seed_video_chandra_healing',
      media_title: 'Chandra Nadi (Ida Breath): Awakening Inner Calm & Curing Insomnia',
      author_name: 'Ananya Patil',
      author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      comment_text: 'Watching this on repeat every morning before starting my sadhana. Amazing clarity on left nostril cooling!',
      likes_count: 28,
      status: 'approved',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: now
    },
    {
      id: 'comm_seed_3',
      media_id: 'seed_short_check_swar',
      media_title: 'How to Check Your Active Swar in 5 Seconds 👃',
      author_name: 'Dr. Vikram Joshi',
      author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      comment_text: 'Ancient Shiva Swarodaya explained with modern biological science. Mohan Sir has made this wisdom accessible to all.',
      likes_count: 67,
      status: 'approved',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: now
    },
    {
      id: 'comm_seed_4',
      media_id: 'seed_video_morning_sadhana',
      media_title: 'Daily Morning Sadhana & Tithi Synchronization with Shiva Swarodaya',
      author_name: 'Pooja Kulkarni',
      author_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      comment_text: 'Can you please share how to switch nostrils during meditation if Suryanadi is hyperactive?',
      likes_count: 14,
      status: 'approved',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: now
    }
  ];

  for (const c of seedComments) {
    try {
      await bunnyExecute({
        sql: `INSERT OR IGNORE INTO bunny_media_comments_sql (
          id, media_id, media_title, author_name, author_avatar, comment_text, likes_count, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          c.id, c.media_id, c.media_title, c.author_name, c.author_avatar, c.comment_text, c.likes_count, c.status, c.created_at, c.updated_at
        ]
      });
    } catch {}
  }
}

export async function listBunnyMediaComments(options?: {
  mediaId?: string;
  status?: string;
  search?: string;
  limit?: number;
  skip?: number;
}): Promise<{ comments: BunnyMediaComment[]; total: number }> {
  await initBunnyMediaCommentsSchema();

  let whereClauses: string[] = [];
  let args: any[] = [];

  if (options?.mediaId) {
    whereClauses.push(`media_id = ?`);
    args.push(options.mediaId);
  }

  if (options?.status && options.status !== 'all') {
    whereClauses.push(`status = ?`);
    args.push(options.status);
  }

  if (options?.search?.trim()) {
    whereClauses.push(`(author_name LIKE ? OR comment_text LIKE ? OR media_title LIKE ?)`);
    const q = `%${options.search.trim()}%`;
    args.push(q, q, q);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const limit = Math.min(options?.limit || 50, 100);
  const skip = options?.skip || 0;

  const countRes = await bunnyExecute({
    sql: `SELECT COUNT(*) as count FROM bunny_media_comments_sql ${whereStr}`,
    args
  });
  const total = Number(countRes.rows?.[0]?.count || 0);

  const queryArgs = [...args, limit, skip];
  const res = await bunnyExecute({
    sql: `SELECT * FROM bunny_media_comments_sql ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: queryArgs
  });

  const comments: BunnyMediaComment[] = (res.rows || []).map((row: any) => ({
    id: String(row.id),
    mediaId: String(row.media_id),
    mediaTitle: String(row.media_title || ''),
    authorName: String(row.author_name || 'Anonymous'),
    authorAvatar: row.author_avatar || undefined,
    commentText: String(row.comment_text || ''),
    likesCount: Number(row.likes_count || 0),
    status: row.status || 'approved',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }));

  return { comments, total };
}

export async function addBunnyMediaComment(data: {
  mediaId: string;
  mediaTitle?: string;
  authorName: string;
  authorAvatar?: string;
  commentText: string;
}): Promise<BunnyMediaComment> {
  await initBunnyMediaCommentsSchema();
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT INTO bunny_media_comments_sql (
      id, media_id, media_title, author_name, author_avatar, comment_text, likes_count, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.mediaId,
      data.mediaTitle || '',
      data.authorName || 'Anonymous',
      data.authorAvatar || '',
      data.commentText,
      0,
      'approved',
      now,
      now
    ]
  });

  return {
    id,
    mediaId: data.mediaId,
    mediaTitle: data.mediaTitle || '',
    authorName: data.authorName || 'Anonymous',
    authorAvatar: data.authorAvatar,
    commentText: data.commentText,
    likesCount: 0,
    status: 'approved',
    createdAt: now,
    updatedAt: now
  };
}

export async function deleteBunnyMediaComment(id: string): Promise<boolean> {
  await initBunnyMediaCommentsSchema();
  await bunnyExecute({
    sql: `DELETE FROM bunny_media_comments_sql WHERE id = ?`,
    args: [id]
  });
  return true;
}

export async function updateBunnyMediaCommentStatus(id: string, status: 'approved' | 'flagged' | 'pinned'): Promise<boolean> {
  await initBunnyMediaCommentsSchema();
  await bunnyExecute({
    sql: `UPDATE bunny_media_comments_sql SET status = ?, updated_at = ? WHERE id = ?`,
    args: [status, new Date().toISOString(), id]
  });
  return true;
}
