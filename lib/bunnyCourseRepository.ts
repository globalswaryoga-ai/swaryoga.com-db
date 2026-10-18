import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';

export type BunnyLanguageFolder = {
  id: string;
  _id?: string;
  code: string;
  name: string;
  flag?: string;
  thumbnail?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type BunnyRecordedCourse = {
  id: string;
  _id?: string;
  slug: string;
  folderId?: string | null;
  videoLanguage?: string;
  category: string;
  level: string;
  isFree: boolean;
  isPublished: boolean;
  isActive: boolean;
  order: number;
  thumbnail?: string;
  totalDuration: number;
  totalVideos?: number;
  pricing: Record<string, any>;
  content: Record<string, any>;
  accessSettings: Record<string, any>;
  giftHours: Record<string, any>;
  defaultStudents?: number;
  likes?: number;
  rating?: number;
  discount?: number;
  promoCode?: string | null;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type BunnyCourseSection = {
  id: string;
  _id?: string;
  courseId: string;
  order: number;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type BunnyCourseVideo = {
  id: string;
  _id?: string;
  courseId: string;
  sectionId?: string | null;
  title: string;
  description?: string;
  bunnyVideoId?: string;
  videoUrl?: string;
  duration: number;
  isFree: boolean;
  accessType: string;
  order: number;
  isActive: boolean;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type BunnyCourseMaterial = {
  id: string;
  _id?: string;
  courseId: string;
  sectionId?: string | null;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize: number;
  order: number;
  isActive: boolean;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type BunnyCourseAssignment = {
  id: string;
  _id?: string;
  courseId: string;
  title: string;
  order: number;
  isActive: boolean;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type BunnyCourseEnrollment = {
  id: string;
  _id?: string;
  userId: string;
  courseId: string;
  status: string;
  enrolledAt: string;
  expiresAt?: string | null;
  progressPercent: number;
  videosWatched: string[];
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type BunnyCourseDevice = {
  id: string;
  _id?: string;
  userId: string;
  courseId: string;
  deviceFingerprint: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ip?: string;
  isActive: boolean;
  lastActiveAt: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback);
const parse = <T>(value: unknown, fallback: T): T => {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
};

function parseMongoDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.$date) {
      if (typeof val.$date === 'string') return val.$date;
      if (val.$date.$numberLong) return new Date(Number(val.$date.$numberLong)).toISOString();
      return new Date(Number(val.$date)).toISOString();
    }
  }
  return null;
}

function parseMongoNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'object' && val.$numberInt) return Number(val.$numberInt) || fallback;
  if (typeof val === 'object' && val.$numberDouble) return Number(val.$numberDouble) || fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function folderRowToObj(row: any): BunnyLanguageFolder {
  return {
    id: String(row.id),
    _id: String(row.id),
    code: row.code,
    name: row.name,
    flag: row.flag || '',
    thumbnail: row.thumbnail || '',
    isActive: Boolean(row.is_active),
    order: Number(row.display_order || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function courseRowToObj(row: any): BunnyRecordedCourse {
  const data = parse<Record<string, any>>(row.data_json, {});
  return {
    id: String(row.id),
    _id: String(row.id),
    slug: row.slug,
    folderId: row.folder_id || null,
    videoLanguage: row.video_language || data.videoLanguage || '',
    category: row.category || 'swar-yoga',
    level: row.level || 'all',
    isFree: Boolean(row.is_free),
    isPublished: Boolean(row.is_published),
    isActive: Boolean(row.is_active),
    order: Number(row.display_order || 1),
    thumbnail: row.thumbnail || data.thumbnail || '',
    totalDuration: Number(row.total_duration || data.totalDuration || 0),
    totalVideos: parseMongoNumber(data.totalVideos, 0),
    pricing: parse(row.pricing_json, data.pricing || { INR: { price: 0 } }),
    content: parse(row.content_json, data.content || {}),
    accessSettings: parse(row.access_settings_json, data.accessSettings || {}),
    giftHours: parse(row.gift_hours_json, data.giftHours || {}),
    defaultStudents: parseMongoNumber(data.defaultStudents, 15),
    likes: parseMongoNumber(data.likes, 10),
    rating: parseMongoNumber(data.rating, 5.0),
    discount: parseMongoNumber(data.discount, 0),
    promoCode: data.promoCode || null,
    data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sectionRowToObj(row: any): BunnyCourseSection {
  return {
    id: String(row.id),
    _id: String(row.id),
    courseId: String(row.course_id),
    order: Number(row.display_order !== null && row.display_order !== undefined ? row.display_order : 1),
    content: parse(row.content_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function videoRowToObj(row: any): BunnyCourseVideo {
  return {
    id: String(row.id),
    _id: String(row.id),
    courseId: String(row.course_id),
    sectionId: row.section_id || null,
    title: row.title,
    description: row.description || '',
    bunnyVideoId: row.bunny_video_id || '',
    videoUrl: row.video_url || '',
    duration: Number(row.duration || 0),
    isFree: Boolean(row.is_free),
    accessType: row.access_type || 'paid',
    order: Number(row.display_order !== null && row.display_order !== undefined ? row.display_order : 1),
    isActive: Boolean(row.is_active),
    content: parse(row.content_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function materialRowToObj(row: any): BunnyCourseMaterial {
  return {
    id: String(row.id),
    _id: String(row.id),
    courseId: String(row.course_id),
    sectionId: row.section_id || null,
    title: row.title,
    fileUrl: row.file_url || '',
    fileType: row.file_type || '',
    fileSize: Number(row.file_size || 0),
    order: Number(row.display_order !== null && row.display_order !== undefined ? row.display_order : 1),
    isActive: Boolean(row.is_active),
    content: parse(row.content_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assignmentRowToObj(row: any): BunnyCourseAssignment {
  return {
    id: String(row.id),
    _id: String(row.id),
    courseId: String(row.course_id),
    title: row.title,
    order: Number(row.display_order !== null && row.display_order !== undefined ? row.display_order : 1),
    isActive: Boolean(row.is_active),
    content: parse(row.content_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function enrollmentRowToObj(row: any): BunnyCourseEnrollment {
  return {
    id: String(row.id),
    _id: String(row.id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    status: row.status || 'active',
    enrolledAt: row.enrolled_at,
    expiresAt: row.expires_at || null,
    progressPercent: Number(row.progress_percent || 0),
    videosWatched: parse(row.videos_watched_json, []),
    data: parse(row.data_json, {}),
    createdAt: row.created_at || row.enrolled_at,
    updatedAt: row.updated_at || row.enrolled_at,
  };
}

function deviceRowToObj(row: any): BunnyCourseDevice {
  return {
    id: String(row.id),
    _id: String(row.id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    deviceFingerprint: row.device_fingerprint,
    deviceName: row.device_name || '',
    deviceType: row.device_type || '',
    browser: row.browser || '',
    os: row.os || '',
    ip: row.ip || '',
    isActive: Boolean(row.is_active),
    lastActiveAt: row.last_active_at,
    data: parse(row.data_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

let courseSchemaPromise: Promise<void> | undefined;

export function initCourseSchema() {
  if (!courseSchemaPromise) {
    courseSchemaPromise = initializeCourseSchema().catch((err) => {
      courseSchemaPromise = undefined;
      throw err;
    });
  }
  return courseSchemaPromise;
}

async function initializeCourseSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS language_folders_sql (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        flag TEXT,
        thumbnail TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_lang_folders_order ON language_folders_sql(display_order)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS recorded_courses_sql (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        folder_id TEXT,
        video_language TEXT,
        category TEXT DEFAULT 'swar-yoga',
        level TEXT DEFAULT 'all',
        is_free INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 1,
        thumbnail TEXT,
        total_duration INTEGER NOT NULL DEFAULT 0,
        pricing_json TEXT NOT NULL DEFAULT '{"INR":{"price":0}}',
        content_json TEXT NOT NULL DEFAULT '{}',
        access_settings_json TEXT NOT NULL DEFAULT '{}',
        gift_hours_json TEXT NOT NULL DEFAULT '{}',
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_rec_courses_slug ON recorded_courses_sql(slug)',
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_rec_courses_folder ON recorded_courses_sql(folder_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_sections_sql (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 1,
        content_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_course_sections_course ON course_sections_sql(course_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_videos_sql (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        section_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        bunny_video_id TEXT,
        video_url TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        is_free INTEGER NOT NULL DEFAULT 0,
        access_type TEXT NOT NULL DEFAULT 'paid',
        display_order INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        content_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_course_videos_course ON course_videos_sql(course_id, is_active)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_materials_sql (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        section_id TEXT,
        title TEXT NOT NULL,
        file_url TEXT,
        file_type TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        content_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_assignments_sql (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        content_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_enrollments_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT,
        progress_percent REAL NOT NULL DEFAULT 0,
        videos_watched_json TEXT NOT NULL DEFAULT '[]',
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments_sql(user_id, course_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_devices_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        device_fingerprint TEXT NOT NULL,
        device_name TEXT,
        device_type TEXT,
        browser TEXT,
        os TEXT,
        ip TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_course_devices_user ON course_devices_sql(user_id, course_id)',
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_certificates_sql (
        id TEXT PRIMARY KEY,
        enrollment_id TEXT,
        user_id TEXT,
        course_id TEXT,
        certificate_number TEXT,
        issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS course_assignment_submissions_sql (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS video_watch_logs_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        course_id TEXT,
        watch_time INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        last_watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
  ]);

  // Seed language_folders_sql from mongo_documents
  const countFolders = await bunnyExecute('SELECT COUNT(*) as cnt FROM language_folders_sql');
  if (Number(countFolders.rows[0]?.cnt || 0) === 0) {
    try {
      const archivedFolders = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name LIKE '%language%folder%'"
      );
      for (const row of archivedFolders.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const folderId = String(doc._id || row.document_id);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO language_folders_sql (
              id, code, name, flag, thumbnail, is_active, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              folderId,
              String(doc.code || doc.language || 'hi'),
              String(doc.name || doc.folderName || 'Default'),
              String(doc.flag || '🇮🇳'),
              String(doc.thumbnail || ''),
              doc.isActive !== false ? 1 : 0,
              parseMongoNumber(doc.order ?? doc.displayOrder, 1),
              parseMongoDate(doc.createdAt) || now(),
              parseMongoDate(doc.updatedAt) || now(),
            ],
          });
        } catch (e) {
          console.error('[Seed language_folders_sql] Error:', e);
        }
      }
    } catch (e) {
      console.warn('[Seed language_folders_sql] Skipped:', e);
    }
  }

  // Seed recorded_courses_sql from mongo_documents
  const countCourses = await bunnyExecute('SELECT COUNT(*) as cnt FROM recorded_courses_sql');
  if (Number(countCourses.rows[0]?.cnt || 0) === 0) {
    try {
      const archivedCourses = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'recordedcourses'"
      );
      for (const row of archivedCourses.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const courseId = String(doc._id || row.document_id);
          const slug = String(doc.slug || courseId);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO recorded_courses_sql (
              id, slug, folder_id, video_language, category, level,
              is_free, is_published, is_active, display_order, thumbnail,
              total_duration, pricing_json, content_json, access_settings_json,
              gift_hours_json, data_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              courseId,
              slug,
              doc.folderId ? String(doc.folderId) : null,
              doc.videoLanguage || null,
              String(doc.category || 'swar-yoga'),
              String(doc.level || 'all'),
              doc.isFree ? 1 : 0,
              doc.isPublished ? 1 : 0,
              doc.isActive !== false ? 1 : 0,
              parseMongoNumber(doc.order, 1),
              String(doc.thumbnail || ''),
              parseMongoNumber(doc.totalDuration, 0),
              json(doc.pricing, { INR: { price: 0 } }),
              json(doc.content, {}),
              json(doc.accessSettings, {}),
              json(doc.giftHours, {}),
              json(doc, {}),
              parseMongoDate(doc.createdAt) || now(),
              parseMongoDate(doc.updatedAt) || now(),
            ],
          });
        } catch (e) {
          console.error('[Seed recorded_courses_sql] Error:', e);
        }
      }
    } catch (e) {
      console.warn('[Seed recorded_courses_sql] Skipped:', e);
    }
  }

  // Seed course_videos_sql from mongo_documents
  const countVideos = await bunnyExecute('SELECT COUNT(*) as cnt FROM course_videos_sql');
  if (Number(countVideos.rows[0]?.cnt || 0) === 0) {
    try {
      const archivedVideos = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'coursevideos'"
      );
      for (const row of archivedVideos.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const videoId = String(doc._id || row.document_id);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO course_videos_sql (
              id, course_id, section_id, title, description, bunny_video_id,
              video_url, duration, is_free, access_type, display_order, is_active,
              content_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              videoId,
              String(doc.courseId || ''),
              doc.sectionId ? String(doc.sectionId) : null,
              String(doc.title || doc.content?.en?.title || 'Video'),
              String(doc.description || doc.content?.en?.description || ''),
              String(doc.bunnyVideoId || ''),
              String(doc.videoUrl || ''),
              parseMongoNumber(doc.duration, 0),
              doc.isFree ? 1 : 0,
              String(doc.accessType || 'paid'),
              parseMongoNumber(doc.order, 1),
              doc.isActive !== false ? 1 : 0,
              json(doc.content, {}),
              parseMongoDate(doc.createdAt) || now(),
              parseMongoDate(doc.updatedAt) || now(),
            ],
          });
        } catch (e) {
          console.error('[Seed course_videos_sql] Error:', e);
        }
      }
    } catch (e) {
      console.warn('[Seed course_videos_sql] Skipped:', e);
    }
  }

  // Seed course_enrollments_sql from mongo_documents
  const countEnrollments = await bunnyExecute('SELECT COUNT(*) as cnt FROM course_enrollments_sql');
  if (Number(countEnrollments.rows[0]?.cnt || 0) === 0) {
    try {
      const archivedEnroll = await bunnyExecute(
        "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'courseenrollments'"
      );
      for (const row of archivedEnroll.rows) {
        try {
          const doc = cleanMongoJson(JSON.parse(String(row.document_json)));
          const enrollId = String(doc._id || row.document_id);
          await bunnyExecute({
            sql: `INSERT OR REPLACE INTO course_enrollments_sql (
              id, user_id, course_id, status, enrolled_at, expires_at, progress_percent, videos_watched_json, data_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              enrollId,
              String(doc.userId || ''),
              String(doc.courseId || ''),
              String(doc.status || 'active'),
              parseMongoDate(doc.enrolledAt) || parseMongoDate(doc.createdAt) || now(),
              parseMongoDate(doc.expiresAt),
              parseMongoNumber(doc.progressPercent, 0),
              json(doc.videosWatched, []),
              json(doc, {}),
              parseMongoDate(doc.createdAt) || now(),
              parseMongoDate(doc.updatedAt) || now(),
            ],
          });
        } catch (e) {
          console.error('[Seed course_enrollments_sql] Error:', e);
        }
      }
    } catch (e) {
      console.warn('[Seed course_enrollments_sql] Skipped:', e);
    }
  }
}

// ============================================
// LANGUAGE FOLDERS CRUD
// ============================================

export async function listLanguageFolders(activeOnly = false): Promise<BunnyLanguageFolder[]> {
  await initCourseSchema();
  const sql = activeOnly
    ? 'SELECT * FROM language_folders_sql WHERE is_active = 1 ORDER BY display_order ASC, name ASC'
    : 'SELECT * FROM language_folders_sql ORDER BY display_order ASC, name ASC';
  const res = await bunnyExecute(sql);
  return res.rows.map(folderRowToObj);
}

export async function getLanguageFolder(id: string): Promise<BunnyLanguageFolder | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM language_folders_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  return res.rows[0] ? folderRowToObj(res.rows[0]) : null;
}

export async function saveLanguageFolder(data: {
  id?: string;
  code: string;
  name: string;
  flag?: string;
  thumbnail?: string;
  order?: number;
  isActive?: boolean;
}): Promise<BunnyLanguageFolder> {
  await initCourseSchema();
  const folderId = String(data.id || id());
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO language_folders_sql (
      id, code, name, flag, thumbnail, is_active, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      name = excluded.name,
      flag = excluded.flag,
      thumbnail = excluded.thumbnail,
      is_active = excluded.is_active,
      display_order = excluded.display_order,
      updated_at = excluded.updated_at`,
    args: [
      folderId,
      data.code,
      data.name,
      data.flag || '',
      data.thumbnail || '',
      data.isActive !== false ? 1 : 0,
      Number(data.order || 1),
      timestamp,
      timestamp,
    ],
  });
  const res = await getLanguageFolder(folderId);
  if (!res) throw new Error('Failed to retrieve saved language folder');
  return res;
}

export async function deleteLanguageFolder(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'UPDATE language_folders_sql SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// ============================================
// RECORDED COURSES CRUD
// ============================================

export async function listCourses(filters: {
  folderId?: string | null;
  videoLanguage?: string | null;
  isPublished?: boolean;
  isActive?: boolean;
} = {}): Promise<BunnyRecordedCourse[]> {
  await initCourseSchema();
  const conditions: string[] = [];
  const args: any[] = [];

  if (filters.folderId) {
    conditions.push('folder_id = ?');
    args.push(filters.folderId);
  }
  if (filters.videoLanguage && filters.videoLanguage !== 'all') {
    conditions.push('(LOWER(video_language) = ? OR video_language IS NULL OR video_language = \'\')');
    args.push(filters.videoLanguage.toLowerCase());
  }
  if (filters.isPublished !== undefined) {
    conditions.push('is_published = ?');
    args.push(filters.isPublished ? 1 : 0);
  }
  if (filters.isActive !== undefined) {
    conditions.push('is_active = ?');
    args.push(filters.isActive ? 1 : 0);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM recorded_courses_sql ${where} ORDER BY display_order ASC, created_at DESC`;
  const res = await bunnyExecute({ sql, args });
  return res.rows.map(courseRowToObj);
}

export async function getCourseById(id: string): Promise<BunnyRecordedCourse | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM recorded_courses_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  return res.rows[0] ? courseRowToObj(res.rows[0]) : null;
}

export async function getCourseBySlug(slug: string): Promise<BunnyRecordedCourse | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM recorded_courses_sql WHERE slug = ? LIMIT 1',
    args: [slug],
  });
  return res.rows[0] ? courseRowToObj(res.rows[0]) : null;
}

export async function saveCourse(
  data: Partial<BunnyRecordedCourse> & { slug: string }
): Promise<BunnyRecordedCourse> {
  await initCourseSchema();
  const courseId = String(data.id || data._id || id());
  const timestamp = now();

  await bunnyExecute({
    sql: `INSERT INTO recorded_courses_sql (
      id, slug, folder_id, video_language, category, level,
      is_free, is_published, is_active, display_order, thumbnail,
      total_duration, pricing_json, content_json, access_settings_json,
      gift_hours_json, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      folder_id = excluded.folder_id,
      video_language = excluded.video_language,
      category = excluded.category,
      level = excluded.level,
      is_free = excluded.is_free,
      is_published = excluded.is_published,
      is_active = excluded.is_active,
      display_order = excluded.display_order,
      thumbnail = excluded.thumbnail,
      total_duration = excluded.total_duration,
      pricing_json = excluded.pricing_json,
      content_json = excluded.content_json,
      access_settings_json = excluded.access_settings_json,
      gift_hours_json = excluded.gift_hours_json,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at`,
    args: [
      courseId,
      data.slug.trim(),
      data.folderId || null,
      data.videoLanguage || null,
      data.category || 'swar-yoga',
      data.level || 'all',
      data.isFree ? 1 : 0,
      data.isPublished !== false ? 1 : 0,
      data.isActive !== false ? 1 : 0,
      Number(data.order || 1),
      data.thumbnail || '',
      Number(data.totalDuration || 0),
      json(data.pricing, { INR: { price: 0 } }),
      json(data.content, {}),
      json(data.accessSettings, {}),
      json(data.giftHours, {}),
      json({
        totalVideos: parseMongoNumber(data.totalVideos, 0),
        defaultStudents: parseMongoNumber(data.defaultStudents, 15),
        likes: parseMongoNumber(data.likes, 10),
        rating: parseMongoNumber(data.rating, 5.0),
        discount: parseMongoNumber(data.discount, 0),
        promoCode: data.promoCode || null,
        folderId: data.folderId || null,
        ...(data.data || {}),
      }, {}),
      timestamp,
      timestamp,
    ],
  });

  const res = await getCourseById(courseId);
  if (!res) throw new Error('Failed to retrieve saved recorded course');
  return res;
}

export async function updateCourse(id: string, updates: Record<string, any>): Promise<BunnyRecordedCourse | null> {
  await initCourseSchema();
  const existing = await getCourseById(id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const args: any[] = [];
  const timestamp = now();

  if (updates.slug !== undefined) {
    setClauses.push('slug = ?');
    args.push(String(updates.slug).trim());
  }
  if (updates.folderId !== undefined) {
    setClauses.push('folder_id = ?');
    args.push(updates.folderId || null);
  }
  if (updates.videoLanguage !== undefined) {
    setClauses.push('video_language = ?');
    args.push(updates.videoLanguage || null);
  }
  if (updates.category !== undefined) {
    setClauses.push('category = ?');
    args.push(updates.category);
  }
  if (updates.level !== undefined) {
    setClauses.push('level = ?');
    args.push(updates.level);
  }
  if (updates.isFree !== undefined) {
    setClauses.push('is_free = ?');
    args.push(updates.isFree ? 1 : 0);
  }
  if (updates.isPublished !== undefined) {
    setClauses.push('is_published = ?');
    args.push(updates.isPublished ? 1 : 0);
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    args.push(updates.isActive ? 1 : 0);
  }
  if (updates.order !== undefined) {
    setClauses.push('display_order = ?');
    args.push(Number(updates.order));
  }
  if (updates.thumbnail !== undefined) {
    setClauses.push('thumbnail = ?');
    args.push(updates.thumbnail || '');
  }
  if (updates.totalDuration !== undefined) {
    setClauses.push('total_duration = ?');
    args.push(Number(updates.totalDuration));
  }
  if (updates.pricing !== undefined) {
    setClauses.push('pricing_json = ?');
    args.push(json(updates.pricing, existing.pricing));
  }
  if (updates.content !== undefined) {
    setClauses.push('content_json = ?');
    args.push(json(updates.content, existing.content));
  }
  if (updates.accessSettings !== undefined) {
    setClauses.push('access_settings_json = ?');
    args.push(json(updates.accessSettings, existing.accessSettings));
  }
  if (updates.giftHours !== undefined) {
    setClauses.push('gift_hours_json = ?');
    args.push(json(updates.giftHours, existing.giftHours));
  }

  // Merge and persist custom fields in data_json
  const existingData = existing.data || {};
  const mergedData: Record<string, any> = {
    ...existingData,
    ...(updates.data || {}),
  };
  if (updates.totalVideos !== undefined) mergedData.totalVideos = Number(updates.totalVideos);
  if (updates.defaultStudents !== undefined) mergedData.defaultStudents = Number(updates.defaultStudents);
  if (updates.likes !== undefined) mergedData.likes = Number(updates.likes);
  if (updates.rating !== undefined) mergedData.rating = Number(updates.rating);
  if (updates.discount !== undefined) mergedData.discount = Number(updates.discount);
  if (updates.promoCode !== undefined) mergedData.promoCode = updates.promoCode;
  if (updates.folderId !== undefined) mergedData.folderId = updates.folderId;
  if (updates.videoLanguage !== undefined) mergedData.videoLanguage = updates.videoLanguage;
  if (updates.thumbnail !== undefined) mergedData.thumbnail = updates.thumbnail;
  if (updates.totalDuration !== undefined) mergedData.totalDuration = Number(updates.totalDuration);
  if (updates.level !== undefined) mergedData.level = updates.level;
  if (updates.content !== undefined) mergedData.content = updates.content;
  if (updates.pricing !== undefined) mergedData.pricing = updates.pricing;
  if (updates.isFree !== undefined) mergedData.isFree = updates.isFree;

  setClauses.push('data_json = ?');
  args.push(json(mergedData, {}));

  setClauses.push('updated_at = ?');
  args.push(timestamp);

  args.push(id);
  await bunnyExecute({
    sql: `UPDATE recorded_courses_sql SET ${setClauses.join(', ')} WHERE id = ?`,
    args,
  });

  return getCourseById(id);
}

export async function deleteCourse(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'UPDATE recorded_courses_sql SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// ============================================
// SECTIONS CRUD
// ============================================

export async function listSectionsByCourse(courseId: string): Promise<BunnyCourseSection[]> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_sections_sql WHERE course_id = ? ORDER BY display_order ASC',
    args: [courseId],
  });
  return res.rows.map(sectionRowToObj);
}

export async function saveSection(data: {
  id?: string;
  courseId: string;
  order?: number;
  content: Record<string, any>;
}): Promise<BunnyCourseSection> {
  await initCourseSchema();
  const sectionId = String(data.id || id());
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO course_sections_sql (
      id, course_id, display_order, content_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_order = excluded.display_order,
      content_json = excluded.content_json,
      updated_at = excluded.updated_at`,
    args: [sectionId, String(data.courseId), Number(data.order !== undefined && data.order !== null ? data.order : 1), json(data.content, {}), timestamp, timestamp],
  });
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_sections_sql WHERE id = ? LIMIT 1',
    args: [sectionId],
  });
  return sectionRowToObj(res.rows[0]);
}

export async function deleteSection(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'DELETE FROM course_sections_sql WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// ============================================
// VIDEOS CRUD
// ============================================

export async function listVideosByCourse(courseId: string, activeOnly = true): Promise<BunnyCourseVideo[]> {
  await initCourseSchema();
  const sql = activeOnly
    ? 'SELECT * FROM course_videos_sql WHERE course_id = ? AND is_active = 1 ORDER BY display_order ASC'
    : 'SELECT * FROM course_videos_sql WHERE course_id = ? ORDER BY display_order ASC';
  const res = await bunnyExecute({ sql, args: [courseId] });
  return res.rows.map(videoRowToObj);
}

export async function getVideoById(id: string): Promise<BunnyCourseVideo | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  return res.rows[0] ? videoRowToObj(res.rows[0]) : null;
}

export async function saveVideo(data: {
  id?: string;
  courseId: string;
  sectionId?: string | null;
  title: string;
  description?: string;
  bunnyVideoId?: string;
  videoUrl?: string;
  duration?: number;
  isFree?: boolean;
  accessType?: string;
  order?: number;
  isActive?: boolean;
  content?: Record<string, any>;
}): Promise<BunnyCourseVideo> {
  await initCourseSchema();
  const videoId = String(data.id || id());
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO course_videos_sql (
      id, course_id, section_id, title, description, bunny_video_id,
      video_url, duration, is_free, access_type, display_order, is_active,
      content_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      section_id = excluded.section_id,
      title = excluded.title,
      description = excluded.description,
      bunny_video_id = excluded.bunny_video_id,
      video_url = excluded.video_url,
      duration = excluded.duration,
      is_free = excluded.is_free,
      access_type = excluded.access_type,
      display_order = excluded.display_order,
      is_active = excluded.is_active,
      content_json = excluded.content_json,
      updated_at = excluded.updated_at`,
    args: [
      videoId,
      String(data.courseId),
      data.sectionId || null,
      data.title,
      data.description || '',
      data.bunnyVideoId || '',
      data.videoUrl || '',
      Number(data.duration || 0),
      data.isFree ? 1 : 0,
      data.accessType || 'paid',
      Number(data.order !== undefined && data.order !== null ? data.order : 1),
      data.isActive !== false ? 1 : 0,
      json(data.content, {}),
      timestamp,
      timestamp,
    ],
  });
  const res = await getVideoById(videoId);
  if (!res) throw new Error('Failed to retrieve saved course video');
  return res;
}

export async function deleteVideo(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'UPDATE course_videos_sql SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// ============================================
// MATERIALS CRUD
// ============================================

export async function listMaterialsByCourse(courseId: string, activeOnly = true): Promise<BunnyCourseMaterial[]> {
  await initCourseSchema();
  const sql = activeOnly
    ? 'SELECT * FROM course_materials_sql WHERE course_id = ? AND is_active = 1 ORDER BY display_order ASC'
    : 'SELECT * FROM course_materials_sql WHERE course_id = ? ORDER BY display_order ASC';
  const res = await bunnyExecute({ sql, args: [courseId] });
  return res.rows.map(materialRowToObj);
}

export async function saveMaterial(data: {
  id?: string;
  courseId: string;
  sectionId?: string | null;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  order?: number;
  isActive?: boolean;
  content?: Record<string, any>;
}): Promise<BunnyCourseMaterial> {
  await initCourseSchema();
  const matId = String(data.id || id());
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO course_materials_sql (
      id, course_id, section_id, title, file_url, file_type, file_size,
      display_order, is_active, content_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      section_id = excluded.section_id,
      title = excluded.title,
      file_url = excluded.file_url,
      file_type = excluded.file_type,
      file_size = excluded.file_size,
      display_order = excluded.display_order,
      is_active = excluded.is_active,
      content_json = excluded.content_json,
      updated_at = excluded.updated_at`,
    args: [
      matId,
      String(data.courseId),
      data.sectionId || null,
      data.title,
      data.fileUrl,
      data.fileType || '',
      Number(data.fileSize || 0),
      Number(data.order !== undefined && data.order !== null ? data.order : 1),
      data.isActive !== false ? 1 : 0,
      json(data.content, {}),
      timestamp,
      timestamp,
    ],
  });
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_materials_sql WHERE id = ? LIMIT 1',
    args: [matId],
  });
  return materialRowToObj(res.rows[0]);
}

export async function deleteMaterial(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'UPDATE course_materials_sql SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// ============================================
// ASSIGNMENTS CRUD
// ============================================

export async function listAssignmentsByCourse(courseId: string, activeOnly = true): Promise<BunnyCourseAssignment[]> {
  await initCourseSchema();
  const sql = activeOnly
    ? 'SELECT * FROM course_assignments_sql WHERE course_id = ? AND is_active = 1 ORDER BY display_order ASC'
    : 'SELECT * FROM course_assignments_sql WHERE course_id = ? ORDER BY display_order ASC';
  const res = await bunnyExecute({ sql, args: [courseId] });
  return res.rows.map(assignmentRowToObj);
}

export async function saveAssignment(data: {
  id?: string;
  courseId: string;
  title: string;
  order?: number;
  isActive?: boolean;
  content?: Record<string, any>;
}): Promise<BunnyCourseAssignment> {
  await initCourseSchema();
  const assignId = String(data.id || id());
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO course_assignments_sql (
      id, course_id, title, display_order, is_active, content_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      display_order = excluded.display_order,
      is_active = excluded.is_active,
      content_json = excluded.content_json,
      updated_at = excluded.updated_at`,
    args: [
      assignId,
      String(data.courseId),
      data.title,
      Number(data.order !== undefined && data.order !== null ? data.order : 1),
      data.isActive !== false ? 1 : 0,
      json(data.content, {}),
      timestamp,
      timestamp,
    ],
  });
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_assignments_sql WHERE id = ? LIMIT 1',
    args: [assignId],
  });
  return assignmentRowToObj(res.rows[0]);
}

export async function deleteAssignment(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'UPDATE course_assignments_sql SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// ============================================
// ENROLLMENTS & DEVICES & STATS
// ============================================

export async function getEnrollment(userId: string, courseId: string): Promise<BunnyCourseEnrollment | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_enrollments_sql WHERE user_id = ? AND course_id = ? AND status IN (\'active\', \'completed\') LIMIT 1',
    args: [userId, courseId],
  });
  return res.rows[0] ? enrollmentRowToObj(res.rows[0]) : null;
}

export async function listEnrollmentsByUser(userId: string): Promise<BunnyCourseEnrollment[]> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_enrollments_sql WHERE user_id = ? ORDER BY enrolled_at DESC',
    args: [userId],
  });
  return res.rows.map(enrollmentRowToObj);
}

export async function listEnrollmentsByCourse(courseId: string): Promise<BunnyCourseEnrollment[]> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_enrollments_sql WHERE course_id = ? ORDER BY enrolled_at DESC',
    args: [courseId],
  });
  return res.rows.map(enrollmentRowToObj);
}

export async function countEnrollmentsByCourse(courseId: string): Promise<number> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT COUNT(*) as cnt FROM course_enrollments_sql WHERE course_id = ?',
    args: [courseId],
  });
  return Number(res.rows[0]?.cnt || 0);
}

export async function countVideosByCourse(courseId: string): Promise<number> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT COUNT(*) as cnt FROM course_videos_sql WHERE course_id = ? AND is_active = 1',
    args: [courseId],
  });
  return Number(res.rows[0]?.cnt || 0);
}

export async function saveEnrollment(data: {
  id?: string;
  userId: string;
  courseId: string;
  status?: string;
  expiresAt?: string | null;
  progressPercent?: number;
  videosWatched?: string[];
  data?: Record<string, any>;
}): Promise<BunnyCourseEnrollment> {
  await initCourseSchema();
  const enrollId = String(data.id || id());
  const timestamp = now();

  // If this is an update, preserve/merge existing data_json and videos_watched_json
  let mergedDataJson = data.data ? json(data.data, {}) : null;
  let mergedWatchedJson = data.videosWatched ? json(data.videosWatched, []) : null;

  if (data.id) {
    const existing = await getEnrollmentById(data.id);
    if (existing) {
      if (data.data) {
        mergedDataJson = json({ ...existing.data, ...data.data }, {});
      } else {
        mergedDataJson = json(existing.data, {});
      }
      if (!data.videosWatched) {
        mergedWatchedJson = json(existing.videosWatched, []);
      }
    }
  }

  await bunnyExecute({
    sql: `INSERT INTO course_enrollments_sql (
      id, user_id, course_id, status, enrolled_at, expires_at, progress_percent,
      videos_watched_json, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      expires_at = excluded.expires_at,
      progress_percent = excluded.progress_percent,
      videos_watched_json = excluded.videos_watched_json,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at`,
    args: [
      enrollId,
      String(data.userId),
      String(data.courseId),
      data.status || 'active',
      timestamp,
      data.expiresAt || null,
      Number(data.progressPercent || 0),
      mergedWatchedJson || json(data.videosWatched, []),
      mergedDataJson || json(data.data, {}),
      timestamp,
      timestamp,
    ],
  });
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
    args: [enrollId],
  });
  return enrollmentRowToObj(res.rows[0]);
}

export async function getEnrollmentById(id: string): Promise<BunnyCourseEnrollment | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  return res.rows[0] ? enrollmentRowToObj(res.rows[0]) : null;
}

export async function findEnrollmentByPaymentId(paymentId: string): Promise<BunnyCourseEnrollment | null> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: `SELECT * FROM course_enrollments_sql WHERE 
          json_extract(data_json, '$.paymentId') = ? 
          OR json_extract(data_json, '$.orderId') = ?
          OR id = ?
          LIMIT 1`,
    args: [paymentId, paymentId, paymentId],
  });
  if (res.rows[0]) return enrollmentRowToObj(res.rows[0]);
  
  // Fallback scan if json_extract didn't hit
  const allRes = await bunnyExecute('SELECT * FROM course_enrollments_sql ORDER BY enrolled_at DESC LIMIT 200');
  for (const row of allRes.rows) {
    const obj = enrollmentRowToObj(row);
    if (obj.data?.paymentId === paymentId || obj.data?.orderId === paymentId) {
      return obj;
    }
  }
  return null;
}

export async function updateEnrollmentStatus(
  id: string,
  status: string,
  additionalData?: Record<string, any>
): Promise<BunnyCourseEnrollment | null> {
  await initCourseSchema();
  const current = await getEnrollmentById(id);
  if (!current) return null;
  const updatedData = { ...current.data, ...additionalData };
  const timestamp = now();
  await bunnyExecute({
    sql: `UPDATE course_enrollments_sql 
          SET status = ?, data_json = ?, updated_at = ?
          WHERE id = ?`,
    args: [status, json(updatedData, {}), timestamp, id],
  });
  return getEnrollmentById(id);
}

export async function incrementCourseEnrolledCount(courseId: string, amount: number = 1): Promise<void> {
  await initCourseSchema();
  await bunnyExecute({
    sql: 'UPDATE recorded_courses_sql SET enrolled_count = enrolled_count + ? WHERE id = ?',
    args: [amount, courseId],
  });
}

export async function deleteEnrollment(id: string): Promise<boolean> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'DELETE FROM course_enrollments_sql WHERE id = ?',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}


// User Devices
export async function listDevices(userId: string, courseId?: string, activeOnly = false): Promise<BunnyCourseDevice[]> {
  await initCourseSchema();
  const conditions = ['user_id = ?'];
  const args = [userId];
  if (courseId) {
    conditions.push('course_id = ?');
    args.push(courseId);
  }
  if (activeOnly) {
    conditions.push('is_active = 1');
  }
  const sql = `SELECT * FROM course_devices_sql WHERE ${conditions.join(' AND ')} ORDER BY last_active_at DESC`;
  const res = await bunnyExecute({ sql, args });
  return res.rows.map(deviceRowToObj);
}

export async function registerDevice(data: {
  userId: string;
  courseId: string;
  deviceFingerprint: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ip?: string;
}): Promise<BunnyCourseDevice> {
  await initCourseSchema();
  const deviceId = id();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO course_devices_sql (
      id, user_id, course_id, device_fingerprint, device_name, device_type,
      browser, os, ip, is_active, last_active_at, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, '{}', ?, ?)`,
    args: [
      deviceId,
      data.userId,
      data.courseId,
      data.deviceFingerprint,
      data.deviceName || '',
      data.deviceType || '',
      data.browser || '',
      data.os || '',
      data.ip || '',
      timestamp,
      timestamp,
      timestamp,
    ],
  });
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_devices_sql WHERE id = ? LIMIT 1',
    args: [deviceId],
  });
  return deviceRowToObj(res.rows[0]);
}

// Watch Logs
export async function logWatchProgress(
  userId: string,
  videoId: string,
  courseId: string,
  watchTime: number,
  completed = false
): Promise<void> {
  await initCourseSchema();
  const timestamp = now();
  const logId = `${userId}_${videoId}`;
  await bunnyExecute({
    sql: `INSERT INTO video_watch_logs_sql (
      id, user_id, video_id, course_id, watch_time, completed, last_watched_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      watch_time = excluded.watch_time,
      completed = CASE WHEN excluded.completed = 1 THEN 1 ELSE video_watch_logs_sql.completed END,
      last_watched_at = excluded.last_watched_at,
      updated_at = excluded.updated_at`,
    args: [
      logId,
      userId,
      videoId,
      courseId,
      Math.round(watchTime),
      completed ? 1 : 0,
      timestamp,
      timestamp,
      timestamp,
    ],
  });
}

export async function listWatchLogs(userId: string, courseId?: string): Promise<Array<{
  userId: string;
  videoId: string;
  courseId: string;
  watchTime: number;
  completed: boolean;
  isCompleted: boolean;
  lastWatchedAt: string;
}>> {
  await initCourseSchema();
  const sql = courseId
    ? 'SELECT * FROM video_watch_logs_sql WHERE user_id = ? AND course_id = ?'
    : 'SELECT * FROM video_watch_logs_sql WHERE user_id = ?';
  const args = courseId ? [userId, courseId] : [userId];
  const res = await bunnyExecute({ sql, args });
  return res.rows.map((r: any) => ({
    userId: String(r.user_id),
    videoId: String(r.video_id),
    courseId: String(r.course_id),
    watchTime: Number(r.watch_time || 0),
    completed: Boolean(r.completed),
    isCompleted: Boolean(r.completed),
    lastWatchedAt: r.last_watched_at,
  }));
}

export async function listCertificatesByUser(userId: string): Promise<Array<{
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  data: Record<string, any>;
}>> {
  await initCourseSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM course_certificates_sql WHERE user_id = ? ORDER BY issued_at DESC',
    args: [userId],
  });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    enrollmentId: String(row.enrollment_id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    certificateNumber: String(row.certificate_number),
    issuedAt: row.issued_at,
    data: parse(row.data_json, {}),
  }));
}

export const listVideos = listVideosByCourse;
export const listAssignments = listAssignmentsByCourse;
export const listMaterials = listMaterialsByCourse;



