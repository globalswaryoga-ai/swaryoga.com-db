import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
import { uploadToPath, fetchFromStorage, isBunnyStorageConfigured } from '@/lib/bunny-storage';

const STORAGE_PATH = 'admin/crm/knowledge-base-articles.json';

export interface KBArticle {
  _id: string;
  id: string;
  title: string;
  content: string;
  shortAnswer?: string | null;
  category?: string;
  subcategory?: string | null;
  keywords?: string[];
  triggerPhrases?: string[];
  language?: string;
  priority?: number;
  enabled?: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

function parseJson(str: unknown, fallback: any = {}): any {
  try {
    return str ? JSON.parse(String(str)) : fallback;
  } catch {
    return fallback;
  }
}

function now(): string {
  return new Date().toISOString();
}

function mapRowToArticle(row: any): KBArticle {
  const data = parseJson(row.data_json, {});
  const keywords = parseJson(row.keywords_json, Array.isArray(data.keywords) ? data.keywords : []);
  const triggerPhrases = parseJson(row.trigger_phrases_json, Array.isArray(data.triggerPhrases) ? data.triggerPhrases : []);

  return {
    ...data,
    _id: String(row.document_id),
    id: String(row.document_id),
    title: row.title || data.title || '',
    category: row.category || data.category || 'general',
    content: row.content || data.content || '',
    shortAnswer: row.short_answer !== undefined ? row.short_answer : data.shortAnswer,
    language: row.language || data.language || 'auto',
    enabled: row.enabled === undefined ? (data.enabled !== false) : Boolean(row.enabled),
    priority: Number(row.priority !== undefined ? row.priority : data.priority || 0),
    keywords: Array.isArray(keywords) ? keywords : [],
    triggerPhrases: Array.isArray(triggerPhrases) ? triggerPhrases : [],
    usageCount: Number(row.usage_count !== undefined ? row.usage_count : data.usageCount || 0),
    createdByUserId: row.created_by_user_id || data.createdByUserId || '',
    createdAt: row.created_at || data.createdAt || now(),
    updatedAt: row.updated_at || data.updatedAt || now(),
  };
}

export async function ensureBunnyKnowledgeBaseSchema() {
  if (!isBunnyDatabaseConfigured()) return;
  try {
    await bunnyBatch([
      {
        sql: `CREATE TABLE IF NOT EXISTS knowledge_base_articles_sql (
          document_id TEXT PRIMARY KEY,
          created_by_user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'general',
          content TEXT NOT NULL,
          short_answer TEXT,
          language TEXT NOT NULL DEFAULT 'auto',
          enabled INTEGER NOT NULL DEFAULT 1,
          priority INTEGER NOT NULL DEFAULT 0,
          keywords_json TEXT NOT NULL DEFAULT '[]',
          trigger_phrases_json TEXT NOT NULL DEFAULT '[]',
          usage_count INTEGER NOT NULL DEFAULT 0,
          data_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        args: [],
      },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_kb_owner ON knowledge_base_articles_sql(created_by_user_id, updated_at DESC)', args: [] },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_kb_enabled ON knowledge_base_articles_sql(enabled, priority DESC)', args: [] },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base_articles_sql(category, enabled)', args: [] },
    ]);
  } catch (err) {
    console.error('Error setting up Bunny KB schema:', err);
  }
}

/** Fallback Storage handler when SQL client is unavailable */
async function loadStorageArticles(): Promise<KBArticle[]> {
  try {
    if (isBunnyStorageConfigured()) {
      const { buffer } = await fetchFromStorage(STORAGE_PATH);
      const data = JSON.parse(buffer.toString('utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

async function saveStorageArticles(articles: KBArticle[]): Promise<void> {
  try {
    if (isBunnyStorageConfigured()) {
      const buffer = Buffer.from(JSON.stringify(articles, null, 2));
      await uploadToPath(buffer, STORAGE_PATH, 'application/json');
    }
  } catch (err) {
    console.error('Failed to save KB articles to Bunny storage fallback:', err);
  }
}

export async function listBunnyKnowledgeBaseArticles(
  ownerId?: string,
  opts: { limit?: number; skip?: number; category?: string; search?: string; enabled?: boolean } = {}
): Promise<{ articles: KBArticle[]; total: number }> {
  const limit = Math.min(Math.max(Number(opts.limit || 100), 1), 500);
  const skip = Math.max(Number(opts.skip || 0), 0);

  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyKnowledgeBaseSchema();
      const clauses: string[] = [];
      const args: any[] = [];

      if (ownerId) {
        clauses.push('created_by_user_id = ?');
        args.push(ownerId);
      }
      if (opts.category && opts.category !== 'all') {
        clauses.push('category = ?');
        args.push(opts.category);
      }
      if (opts.enabled !== undefined) {
        clauses.push('enabled = ?');
        args.push(opts.enabled ? 1 : 0);
      }
      if (opts.search) {
        const q = `%${opts.search.toLowerCase()}%`;
        clauses.push('(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(keywords_json) LIKE ?)');
        args.push(q, q, q);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const countRes = await bunnyExecute({ sql: `SELECT COUNT(*) AS count FROM knowledge_base_articles_sql ${where}`, args });
      const rowsRes = await bunnyExecute({
        sql: `SELECT * FROM knowledge_base_articles_sql ${where} ORDER BY priority DESC, usage_count DESC, updated_at DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, skip],
      });

      return {
        articles: rowsRes.rows.map(mapRowToArticle),
        total: Number(countRes.rows[0]?.count || 0),
      };
    } catch (err) {
      console.error('Bunny SQL KB query failed, using storage fallback:', err);
    }
  }

  // Fallback to Bunny Storage JSON
  let list = await loadStorageArticles();
  if (ownerId) list = list.filter(a => a.createdByUserId === ownerId);
  if (opts.category && opts.category !== 'all') list = list.filter(a => a.category === opts.category);
  if (opts.enabled !== undefined) list = list.filter(a => a.enabled === opts.enabled);
  if (opts.search) {
    const s = opts.search.toLowerCase();
    list = list.filter(a =>
      a.title.toLowerCase().includes(s) ||
      a.content.toLowerCase().includes(s) ||
      (a.keywords || []).some(k => k.toLowerCase().includes(s))
    );
  }
  const total = list.length;
  const sliced = list.slice(skip, skip + limit);
  return { articles: sliced, total };
}

export async function getBunnyKnowledgeBaseArticle(id: string): Promise<KBArticle | null> {
  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyKnowledgeBaseSchema();
      const res = await bunnyExecute({ sql: 'SELECT * FROM knowledge_base_articles_sql WHERE document_id = ? LIMIT 1', args: [id] });
      if (res.rows[0]) return mapRowToArticle(res.rows[0]);
    } catch {}
  }

  const list = await loadStorageArticles();
  return list.find(a => a._id === id || a.id === id) || null;
}

export async function saveBunnyKnowledgeBaseArticle(
  input: Record<string, any>,
  ownerId: string,
  articleId?: string
): Promise<KBArticle> {
  const id = articleId || input._id || input.id || crypto.randomUUID();
  const timestamp = now();
  const existing = await getBunnyKnowledgeBaseArticle(id);

  const article: KBArticle = {
    _id: id,
    id,
    title: String(input.title || existing?.title || 'Untitled Article').trim(),
    content: String(input.content || existing?.content || '').trim(),
    shortAnswer: input.shortAnswer !== undefined ? input.shortAnswer : (existing?.shortAnswer || null),
    category: input.category || existing?.category || 'general',
    subcategory: input.subcategory !== undefined ? input.subcategory : (existing?.subcategory || null),
    keywords: Array.isArray(input.keywords)
      ? input.keywords.map((k: string) => String(k).trim().toLowerCase()).filter(Boolean)
      : (existing?.keywords || []),
    triggerPhrases: Array.isArray(input.triggerPhrases)
      ? input.triggerPhrases.map((p: string) => String(p).trim()).filter(Boolean)
      : (existing?.triggerPhrases || []),
    language: input.language || existing?.language || 'auto',
    priority: Number(input.priority !== undefined ? input.priority : existing?.priority || 0),
    enabled: input.enabled !== undefined ? Boolean(input.enabled) : (existing?.enabled !== false),
    usageCount: Number(input.usageCount !== undefined ? input.usageCount : existing?.usageCount || 0),
    lastUsedAt: input.lastUsedAt || existing?.lastUsedAt || null,
    createdByUserId: ownerId || existing?.createdByUserId || '',
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyKnowledgeBaseSchema();
      await bunnyExecute({
        sql: `INSERT INTO knowledge_base_articles_sql (
          document_id, created_by_user_id, title, category, content, short_answer, language, enabled, priority, keywords_json, trigger_phrases_json, usage_count, data_json, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(document_id) DO UPDATE SET
          title=excluded.title, category=excluded.category, content=excluded.content, short_answer=excluded.short_answer, language=excluded.language, enabled=excluded.enabled, priority=excluded.priority, keywords_json=excluded.keywords_json, trigger_phrases_json=excluded.trigger_phrases_json, usage_count=excluded.usage_count, data_json=excluded.data_json, updated_at=excluded.updated_at`,
        args: [
          id,
          article.createdByUserId,
          article.title,
          article.category,
          article.content,
          article.shortAnswer || null,
          article.language || 'auto',
          article.enabled ? 1 : 0,
          article.priority || 0,
          JSON.stringify(article.keywords || []),
          JSON.stringify(article.triggerPhrases || []),
          article.usageCount || 0,
          JSON.stringify(article),
          article.createdAt,
          article.updatedAt,
        ],
      });
      return article;
    } catch (err) {
      console.error('Failed saving KB article to Bunny SQL, saving to storage fallback:', err);
    }
  }

  // Backup storage save
  const list = await loadStorageArticles();
  const idx = list.findIndex(a => a._id === id || a.id === id);
  if (idx >= 0) list[idx] = article;
  else list.unshift(article);
  await saveStorageArticles(list);

  return article;
}

export async function deleteBunnyKnowledgeBaseArticle(id: string): Promise<number> {
  let count = 0;
  if (isBunnyDatabaseConfigured()) {
    try {
      await ensureBunnyKnowledgeBaseSchema();
      const res = await bunnyExecute({ sql: 'DELETE FROM knowledge_base_articles_sql WHERE document_id = ?', args: [id] });
      count = Number((res as any).rowsAffected || (res as any).rows_affected || 0);
    } catch {}
  }

  const list = await loadStorageArticles();
  const filtered = list.filter(a => a._id !== id && a.id !== id);
  if (filtered.length !== list.length) {
    count = Math.max(count, 1);
    await saveStorageArticles(filtered);
  }

  return count;
}

export async function searchBunnyKnowledgeBaseArticles(
  query: string,
  options: { category?: string; language?: string; limit?: number; preferShortAnswer?: boolean } = {}
) {
  const searchQuery = query.trim().toLowerCase();
  if (!searchQuery) {
    return { found: false, answer: null, confidence: 0, matches: [], matchType: 'none' };
  }

  const { articles } = await listBunnyKnowledgeBaseArticles(undefined, {
    enabled: true,
    category: options.category,
    limit: 500,
  });

  // Filter by language if specified
  const eligible = articles.filter(a => {
    if (!options.language || options.language === 'auto') return true;
    return a.language === options.language || a.language === 'auto';
  });

  // 1. Exact trigger phrase match
  const exactMatch = eligible.find(a =>
    (a.triggerPhrases || []).some(p => p.toLowerCase().trim() === searchQuery)
  );

  if (exactMatch) {
    await saveBunnyKnowledgeBaseArticle({ ...exactMatch, usageCount: (exactMatch.usageCount || 0) + 1, lastUsedAt: now() }, exactMatch.createdByUserId || '');
    return {
      found: true,
      answer: options.preferShortAnswer && exactMatch.shortAnswer ? exactMatch.shortAnswer : exactMatch.content,
      confidence: 1.0,
      articleId: exactMatch.id,
      category: exactMatch.category,
      matchType: 'exact',
      matches: [exactMatch],
    };
  }

  // 2. Keyword matching
  const words = searchQuery.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const scored = eligible.map(article => {
      const keywords = article.keywords || [];
      const matchCount = words.filter(w =>
        keywords.some(k => k.includes(w) || w.includes(k))
      ).length;
      return { article, score: matchCount / Math.max(words.length, 1) };
    }).filter(item => item.score >= 0.25).sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const topMatch = scored[0].article;
      await saveBunnyKnowledgeBaseArticle({ ...topMatch, usageCount: (topMatch.usageCount || 0) + 1, lastUsedAt: now() }, topMatch.createdByUserId || '');
      return {
        found: true,
        answer: options.preferShortAnswer && topMatch.shortAnswer ? topMatch.shortAnswer : topMatch.content,
        confidence: Number(scored[0].score.toFixed(2)),
        articleId: topMatch.id,
        category: topMatch.category,
        matchType: 'keyword',
        matches: scored.slice(0, options.limit || 3).map(s => s.article),
      };
    }
  }

  // 3. Fuzzy search in title and content
  const fuzzy = eligible.filter(a => {
    const text = `${a.title} ${a.content}`.toLowerCase();
    return words.some(w => text.includes(w));
  });

  if (fuzzy.length > 0) {
    const topMatch = fuzzy[0];
    return {
      found: true,
      answer: options.preferShortAnswer && topMatch.shortAnswer ? topMatch.shortAnswer : topMatch.content,
      confidence: 0.5,
      articleId: topMatch.id,
      category: topMatch.category,
      matchType: 'fuzzy',
      matches: fuzzy.slice(0, options.limit || 3),
    };
  }

  return { found: false, answer: null, confidence: 0, matches: [], matchType: 'none' };
}
