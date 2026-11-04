import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
import { chunkText } from '@/lib/ragRetrieval';

export const MOHAN_RAG_MODULES = [
  'why',
  'level1',
  'level2',
  'level3',
  'aahar_shastra',
  'weight_loss',
  'garbh_sanskar',
  'children',
  'youth',
  'meditation_sadhana',
  'general',
  'research',
] as const;
export type MohanRagModule = (typeof MOHAN_RAG_MODULES)[number];
export type KnowledgeStatus = 'draft' | 'approved' | 'rejected';

export interface KnowledgeSource {
  id: string;
  moduleId: MohanRagModule;
  title: string;
  content: string;
  topic: string;
  language: string;
  sourceType: string;
  sourceReference: string;
  originalFileName: string;
  originalFileUrl: string;
  originalMimeType: string;
  extractionType: string;
  status: KnowledgeStatus;
  createdBy: string;
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
  contentLength?: number;
}

let schemaReady = false;

function now() {
  return new Date().toISOString();
}

function assertConfigured() {
  if (!isBunnyDatabaseConfigured()) {
    throw new Error('Bunny Database is not configured for Mohan RAG.');
  }
}

export async function ensureMohanRagKnowledgeSchema() {
  if (schemaReady) return;
  assertConfigured();
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_rag_sources_sql (
        id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        topic TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT 'auto',
        source_type TEXT NOT NULL DEFAULT 'text',
        source_reference TEXT NOT NULL DEFAULT '',
        original_file_name TEXT NOT NULL DEFAULT '',
        original_file_url TEXT NOT NULL DEFAULT '',
        original_mime_type TEXT NOT NULL DEFAULT '',
        extraction_type TEXT NOT NULL DEFAULT 'text',
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT NOT NULL,
        reviewed_by TEXT NOT NULL DEFAULT '',
        reviewed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`, args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_rag_chunks_sql (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        topic TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT 'auto',
        created_at TEXT NOT NULL
      )`, args: [],
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_mohan_rag_sources_module_status ON mohan_rag_sources_sql(module_id, status, updated_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_mohan_rag_chunks_module_lang ON mohan_rag_chunks_sql(module_id, language, source_id)', args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS mohan_rag_ebook_drafts_sql (
      id TEXT PRIMARY KEY, source_id TEXT NOT NULL, language TEXT NOT NULL,
      content TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`, args: [] },
  ]);
  for (const column of [
    "original_file_name TEXT NOT NULL DEFAULT ''",
    "original_file_url TEXT NOT NULL DEFAULT ''",
    "original_mime_type TEXT NOT NULL DEFAULT ''",
    "extraction_type TEXT NOT NULL DEFAULT 'text'",
  ]) {
    try { await bunnyExecute(`ALTER TABLE mohan_rag_sources_sql ADD COLUMN ${column}`); } catch { /* Column already exists. */ }
  }
  schemaReady = true;
}

export function isMohanRagModule(value: unknown): value is MohanRagModule {
  return typeof value === 'string' && MOHAN_RAG_MODULES.includes(value as MohanRagModule);
}

function mapSource(row: any): KnowledgeSource {
  return {
    id: String(row.id),
    moduleId: row.module_id as MohanRagModule,
    title: String(row.title || ''),
    content: String(row.content || ''),
    topic: String(row.topic || ''),
    language: String(row.language || 'auto'),
    sourceType: String(row.source_type || 'text'),
    sourceReference: String(row.source_reference || ''),
    originalFileName: String(row.original_file_name || ''),
    originalFileUrl: String(row.original_file_url || ''),
    originalMimeType: String(row.original_mime_type || ''),
    extractionType: String(row.extraction_type || 'text'),
    status: row.status as KnowledgeStatus,
    createdBy: String(row.created_by || ''),
    reviewedBy: String(row.reviewed_by || ''),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    chunkCount: row.chunk_count === undefined ? undefined : Number(row.chunk_count || 0),
    contentLength: Number(row.content_length ?? (row.content ? row.content.length : 0)),
  };
}

export async function listKnowledgeSources(moduleId?: MohanRagModule, status?: KnowledgeStatus, language?: string) {
  await ensureMohanRagKnowledgeSchema();
  const where: string[] = [];
  const args: Array<string | number> = [];
  if (moduleId) { where.push('s.module_id = ?'); args.push(moduleId); }
  if (status) { where.push('s.status = ?'); args.push(status); }
  if (language && language !== 'all') {
    // Normalise language filter (e.g. 'mr', 'hi', 'en')
    const cleanLang = language.toLowerCase();
    where.push('(LOWER(s.language) = ? OR s.language = "auto")');
    args.push(cleanLang);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await bunnyExecute({
    sql: `SELECT s.id, s.module_id, s.title, '' AS content, LENGTH(s.content) AS content_length, s.topic, s.language, s.source_type, s.source_reference,
             s.original_file_name, s.original_file_url, s.original_mime_type, s.extraction_type,
             s.status, s.created_by, s.reviewed_by, s.reviewed_at, s.created_at, s.updated_at,
             (SELECT COUNT(*) FROM mohan_rag_chunks_sql c WHERE c.source_id = s.id) AS chunk_count
          FROM mohan_rag_sources_sql s ${whereSql} ORDER BY s.updated_at DESC LIMIT 500`,
    args,
  });
  return result.rows.map(mapSource);
}

export async function getKnowledgeSource(id: string) {
  await ensureMohanRagKnowledgeSchema();
  // A just-committed Bunny write may not be visible on the first read yet.
  // Retry briefly so the editor can open/save a source immediately after import.
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await bunnyExecute({ sql: 'SELECT * FROM mohan_rag_sources_sql WHERE id = ? LIMIT 1', args: [id] });
    if (result.rows[0]) return mapSource(result.rows[0]);
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
  }
  return null;
}

export async function saveKnowledgeSource(input: {
  id?: string;
  moduleId: MohanRagModule;
  title: string;
  content: string;
  topic?: string;
  language?: string;
  sourceType?: string;
  sourceReference?: string;
  originalFileName?: string;
  originalFileUrl?: string;
  originalMimeType?: string;
  extractionType?: string;
  status?: KnowledgeStatus;
}, userId: string, knownPrevious?: KnowledgeSource) {
  await ensureMohanRagKnowledgeSchema();
  const id = input.id || crypto.randomUUID();
  const previous = input.id ? knownPrevious || await getKnowledgeSource(input.id) : null;
  if (input.id && !previous) throw new Error('Knowledge source not found.');
  const timestamp = now();
  const chunks = chunkText(input.content, 1800, 220);
  if (!chunks.length) throw new Error('Source text is empty.');
  if (chunks.length > 300) throw new Error('This text source is too large for the current synchronous editor. Split it into smaller sources or use the background ingestion flow.');
  const status = input.status || 'approved';
  const statements = [
    {
      sql: `INSERT INTO mohan_rag_sources_sql
        (id, module_id, title, content, topic, language, source_type, source_reference, original_file_name, original_file_url, original_mime_type, extraction_type, status, created_by, reviewed_by, reviewed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET module_id=excluded.module_id, title=excluded.title, content=excluded.content,
        topic=excluded.topic, language=excluded.language, source_type=excluded.source_type,
        source_reference=excluded.source_reference, original_file_name=excluded.original_file_name,
        original_file_url=excluded.original_file_url, original_mime_type=excluded.original_mime_type,
        extraction_type=excluded.extraction_type, status=excluded.status, reviewed_by='', reviewed_at=NULL, updated_at=excluded.updated_at`,
      args: [id, input.moduleId, input.title.trim(), input.content.trim(), input.topic?.trim() || '', input.language || 'auto', input.sourceType || 'text', input.sourceReference?.trim() || '', input.originalFileName ?? previous?.originalFileName ?? '', input.originalFileUrl ?? previous?.originalFileUrl ?? '', input.originalMimeType ?? previous?.originalMimeType ?? '', input.extractionType ?? previous?.extractionType ?? 'text', status, previous?.createdBy || userId, previous?.createdAt || timestamp, timestamp],
    },
    { sql: 'DELETE FROM mohan_rag_chunks_sql WHERE source_id = ?', args: [id] },
    ...chunks.map((content, index) => ({
      sql: `INSERT INTO mohan_rag_chunks_sql (id, source_id, module_id, chunk_index, content, topic, language, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), id, input.moduleId, index, content, input.topic?.trim() || '', input.language || 'auto', timestamp],
    })),
  ];
  await bunnyBatch(statements);
  // The Bunny write batch is the commit point. Return the committed record
  // directly instead of depending on an immediate follow-up read, which can
  // be empty while the database read path is catching up.
  return {
    id,
    moduleId: input.moduleId,
    title: input.title.trim(),
    content: input.content.trim(),
    topic: input.topic?.trim() || '',
    language: input.language || 'auto',
    sourceType: input.sourceType || 'text',
    sourceReference: input.sourceReference?.trim() || '',
    originalFileName: input.originalFileName ?? previous?.originalFileName ?? '',
    originalFileUrl: input.originalFileUrl ?? previous?.originalFileUrl ?? '',
    originalMimeType: input.originalMimeType ?? previous?.originalMimeType ?? '',
    extractionType: input.extractionType ?? previous?.extractionType ?? 'text',
    status,
    createdBy: previous?.createdBy || userId,
    reviewedBy: '',
    reviewedAt: null,
    createdAt: previous?.createdAt || timestamp,
    updatedAt: timestamp,
    chunkCount: chunks.length,
  } satisfies KnowledgeSource;
}

export async function setKnowledgeSourceStatus(id: string, status: KnowledgeStatus, reviewerId: string) {
  await ensureMohanRagKnowledgeSchema();
  const timestamp = now();
  const result = await bunnyExecute({
    sql: `UPDATE mohan_rag_sources_sql SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    args: [status, reviewerId, timestamp, timestamp, id],
  });
  if (Number(result.rowsAffected || 0) === 0) return null;
  return getKnowledgeSource(id);
}

export async function deleteKnowledgeSource(id: string) {
  await ensureMohanRagKnowledgeSchema();
  await bunnyBatch([
    { sql: 'DELETE FROM mohan_rag_ebook_drafts_sql WHERE source_id = ?', args: [id] },
    { sql: 'DELETE FROM mohan_rag_chunks_sql WHERE source_id = ?', args: [id] },
    { sql: 'DELETE FROM mohan_rag_sources_sql WHERE id = ?', args: [id] },
  ]);
}

export async function saveKnowledgeEbookDraft(input: { sourceId: string; language: string; content: string; createdBy: string }) {
  await ensureMohanRagKnowledgeSchema();
  const id = crypto.randomUUID();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO mohan_rag_ebook_drafts_sql (id, source_id, language, content, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.sourceId, input.language, input.content, input.createdBy, timestamp, timestamp],
  });
  return { id, sourceId: input.sourceId, language: input.language, content: input.content, createdAt: timestamp };
}

export async function listKnowledgeEbookDrafts(sourceId: string) {
  await ensureMohanRagKnowledgeSchema();
  const result = await bunnyExecute({
    sql: 'SELECT id, source_id, language, content, created_by, created_at, updated_at FROM mohan_rag_ebook_drafts_sql WHERE source_id = ? ORDER BY updated_at DESC LIMIT 25',
    args: [sourceId],
  });
  return result.rows.map((row: any) => ({
    id: String(row.id), sourceId: String(row.source_id), language: String(row.language),
    content: String(row.content || ''), createdBy: String(row.created_by || ''),
    createdAt: String(row.created_at || ''), updatedAt: String(row.updated_at || ''),
  }));
}

export async function deleteKnowledgeEbookDraft(sourceId: string, draftId?: string) {
  await ensureMohanRagKnowledgeSchema();
  if (draftId) {
    await bunnyExecute({
      sql: 'DELETE FROM mohan_rag_ebook_drafts_sql WHERE id = ? AND source_id = ?',
      args: [draftId, sourceId],
    });
  } else {
    await bunnyExecute({
      sql: 'DELETE FROM mohan_rag_ebook_drafts_sql WHERE source_id = ?',
      args: [sourceId],
    });
  }
}

const SEARCH_STOP_WORDS = new Set([
  'the', 'is', 'in', 'at', 'of', 'on', 'and', 'a', 'an', 'to', 'for', 'it', 'with', 'as', 'by', 'that', 'this',
  'what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'you', 'tell', 'me', 'about', 'give', 'know',
  'let', 'please', 'sir', 'mohan', 'ji', 'aahe', 'aani', 'tar', 'kay', 'kasa', 'kase', 'kiti', 'kahi',
  'kya', 'hai', 'hain', 'kaise', 'kyun', 'aur', 'ko', 'se', 'ki', 'ka', 'ke', 'batao', 'sang', 'explain'
]);

function queryTerms(query: string) {
  const allTerms = Array.from(new Set(String(query || '').toLowerCase().split(/[\s,.;:!?()"'।॥\-]+/).filter(term => term.length >= 2)));
  const filtered = allTerms.filter(term => !SEARCH_STOP_WORDS.has(term));
  return filtered.length > 0 ? filtered : allTerms;
}

export async function searchApprovedKnowledge(options: {
  moduleIds: MohanRagModule[];
  query: string;
  language?: string;
  limit?: number;
}) {
  await ensureMohanRagKnowledgeSchema();
  const terms = queryTerms(options.query);
  if (!terms.length || !options.moduleIds.length) return [];
  const ids = options.moduleIds;
  const langClause = options.language && options.language !== 'auto' ? 'AND (c.language = ? OR c.language = \'auto\')' : '';
  const args: string[] = [...ids];
  if (langClause) args.push(options.language!);
  let result = await bunnyExecute({
    sql: `SELECT c.id AS chunk_id, c.source_id, c.module_id, c.chunk_index, c.content, c.topic, c.language,
             s.title, s.source_reference, s.source_type
          FROM mohan_rag_chunks_sql c JOIN mohan_rag_sources_sql s ON s.id = c.source_id
          WHERE s.status IN ('approved', 'draft') AND c.module_id IN (${ids.map(() => '?').join(',')}) ${langClause}
          ORDER BY s.updated_at DESC LIMIT 1000`,
    args,
  });

  const rankRows = (rows: any[]) => {
    return rows.map((row: any) => {
      const content = String(row.content || '');
      const searchable = `${row.title || ''} ${row.topic || ''} ${content}`.toLowerCase();
      const matchedTerms = terms.filter(term => searchable.includes(term));
      const score = matchedTerms.length / terms.length;
      return {
        id: String(row.chunk_id),
        sourceId: String(row.source_id),
        moduleId: String(row.module_id),
        chunkIndex: Number(row.chunk_index || 0),
        title: String(row.title || 'Approved source'),
        topic: String(row.topic || ''),
        language: String(row.language || 'auto'),
        sourceType: String(row.source_type || 'text'),
        sourceReference: String(row.source_reference || ''),
        content,
        matchedTerms,
        score,
      };
    }).filter((item: any) => item.score > 0).sort((a: any, b: any) => b.score - a.score);
  };

  let ranked = rankRows(result.rows);

  // Cross-lingual fallback: if language-filtered search yielded no matches, search all approved chunks in module
  if (ranked.length === 0 && langClause) {
    const fallbackResult = await bunnyExecute({
      sql: `SELECT c.id AS chunk_id, c.source_id, c.module_id, c.chunk_index, c.content, c.topic, c.language,
               s.title, s.source_reference, s.source_type
            FROM mohan_rag_chunks_sql c JOIN mohan_rag_sources_sql s ON s.id = c.source_id
            WHERE s.status IN ('approved', 'draft') AND c.module_id IN (${ids.map(() => '?').join(',')})
            ORDER BY s.updated_at DESC LIMIT 1000`,
      args: ids,
    });
    ranked = rankRows(fallbackResult.rows);
  }

  return ranked.slice(0, Math.min(Math.max(options.limit || 6, 1), 20));
}
