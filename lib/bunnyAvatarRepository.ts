import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { EMOTION_LIBRARY } from './avatarEmotionParser';

export interface AvatarProfile {
  id: string;
  name: string;
  avatarType: 'digital_twin' | 'ai_generated' | 'stylized';
  sourceImageUrl: string;
  voiceCloneId?: string;
  defaultLanguage: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvatarProject {
  id: string;
  title: string;
  profileId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  status: 'draft' | 'analyzing' | 'synthesizing' | 'rendering' | 'completed';
  rawScript: string;
  cleanScript: string;
  totalDurationSeconds: number;
  sceneId?: string;
  wardrobeId?: string;
  lookId?: string;
  customSceneUrl?: string;
  outputVideosJson?: string;
  createdAt: string;
  updatedAt: string;
}

let schemaInitialized = false;

export async function initAvatarSchema(): Promise<void> {
  if (schemaInitialized) return;

  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS avatar_profiles_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar_type TEXT NOT NULL,
        source_image_url TEXT NOT NULL,
        voice_clone_id TEXT,
        default_language TEXT DEFAULT 'hi',
        bio TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS avatar_projects_sql (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        source_language TEXT DEFAULT 'hi',
        target_languages_json TEXT,
        status TEXT DEFAULT 'draft',
        raw_script TEXT,
        clean_script TEXT,
        total_duration_seconds REAL DEFAULT 0,
        timeline_json TEXT,
        output_videos_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
  ]);

  // Seed Mohan Sir Digital Twin Profile if table is empty
  const count = await bunnyExecute({ sql: 'SELECT COUNT(*) as cnt FROM avatar_profiles_sql' });
  if (Number(count.rows[0]?.cnt || 0) === 0) {
    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO avatar_profiles_sql (
        id, name, avatar_type, source_image_url, voice_clone_id, default_language, bio, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'profile_mohan_sir',
        'Mohan Sir (Swar Yoga Founder)',
        'digital_twin',
        'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
        'voice_clone_mohan_sir_01',
        'hi',
        'Master Vedic breath science, Ida-Pingala dominance, and Shiva Swarodaya.',
        now,
        now,
      ],
    });
  }

  schemaInitialized = true;
}

export async function getAvatarProfile(id: string = 'profile_mohan_sir'): Promise<AvatarProfile | null> {
  await initAvatarSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM avatar_profiles_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: String(row.id),
    name: String(row.name),
    avatarType: row.avatar_type as any,
    sourceImageUrl: String(row.source_image_url),
    voiceCloneId: row.voice_clone_id ? String(row.voice_clone_id) : undefined,
    defaultLanguage: String(row.default_language || 'hi'),
    bio: row.bio ? String(row.bio) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listAvatarProjects(): Promise<AvatarProject[]> {
  await initAvatarSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM avatar_projects_sql ORDER BY created_at DESC LIMIT 50',
  });
  return res.rows.map((row: any) => {
    let sceneConfig: any = {};
    try {
      if (row.timeline_json) sceneConfig = JSON.parse(row.timeline_json);
    } catch {}
    return {
      id: String(row.id),
      title: String(row.title),
      profileId: String(row.profile_id),
      sourceLanguage: String(row.source_language || 'hi'),
      targetLanguages: JSON.parse(row.target_languages_json || '["mr","en","gu","kn","te","ta"]'),
      status: row.status as any,
      rawScript: String(row.raw_script || ''),
      cleanScript: String(row.clean_script || ''),
      totalDurationSeconds: Number(row.total_duration_seconds || 0),
      sceneId: sceneConfig.sceneId || 'kitchen',
      wardrobeId: sceneConfig.wardrobeId || 'chef_apron',
      lookId: sceneConfig.lookId || 'ayurvedic_chef',
      customSceneUrl: sceneConfig.customSceneUrl,
      outputVideosJson: row.output_videos_json || undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });
}

export async function saveAvatarProject(data: Partial<AvatarProject>): Promise<AvatarProject> {
  await initAvatarSchema();
  const id = data.id || `proj_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();
  const targetLanguagesJson = JSON.stringify(data.targetLanguages || ['mr', 'en', 'gu', 'kn', 'ta', 'te', 'bn']);
  const sceneConfigJson = JSON.stringify({
    sceneId: data.sceneId || 'kitchen',
    wardrobeId: data.wardrobeId || 'chef_apron',
    lookId: data.lookId || 'ayurvedic_chef',
    customSceneUrl: data.customSceneUrl || '',
  });

  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO avatar_projects_sql (
      id, title, profile_id, source_language, target_languages_json, status,
      raw_script, clean_script, total_duration_seconds, timeline_json, output_videos_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.title || 'Untitled Swar Yoga Avatar Project',
      data.profileId || 'profile_mohan_sir',
      data.sourceLanguage || 'hi',
      targetLanguagesJson,
      data.status || 'draft',
      data.rawScript || '',
      data.cleanScript || '',
      data.totalDurationSeconds || 0,
      sceneConfigJson,
      data.outputVideosJson || null,
      data.createdAt || now,
      now,
    ],
  });

  return {
    id,
    title: data.title || 'Untitled Swar Yoga Avatar Project',
    profileId: data.profileId || 'profile_mohan_sir',
    sourceLanguage: data.sourceLanguage || 'hi',
    targetLanguages: data.targetLanguages || ['mr', 'en', 'gu', 'kn', 'ta', 'te', 'bn'],
    status: data.status || 'draft',
    rawScript: data.rawScript || '',
    cleanScript: data.cleanScript || '',
    totalDurationSeconds: data.totalDurationSeconds || 0,
    sceneId: data.sceneId || 'kitchen',
    wardrobeId: data.wardrobeId || 'chef_apron',
    lookId: data.lookId || 'ayurvedic_chef',
    customSceneUrl: data.customSceneUrl,
    outputVideosJson: data.outputVideosJson,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export async function listAiAvatars(type?: string): Promise<any[]> {
  await initAvatarSchema();
  let sql = 'SELECT * FROM avatar_profiles_sql';
  const args: any[] = [];
  if (type) {
    sql += ' WHERE avatar_type = ?';
    args.push(type);
  }
  sql += ' ORDER BY created_at DESC';
  const res = await bunnyExecute({ sql, args });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    _id: String(row.id),
    name: String(row.name),
    avatarType: String(row.avatar_type),
    mediaUrl: String(row.source_image_url),
    thumbnailUrl: row.source_image_url ? String(row.source_image_url) : undefined,
    language: String(row.default_language || 'hi'),
    notes: row.bio ? String(row.bio) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createAiAvatar(data: {
  name: string;
  avatarType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  language?: string;
  notes?: string;
  createdBy?: string;
}): Promise<any> {
  await initAvatarSchema();
  const id = `avatar_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO avatar_profiles_sql (
      id, name, avatar_type, source_image_url, voice_clone_id, default_language, bio, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name,
      data.avatarType,
      data.mediaUrl,
      null,
      data.language || 'hi',
      data.notes || null,
      now,
      now,
    ],
  });
  return {
    id,
    _id: id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteAiAvatar(id: string): Promise<boolean> {
  await initAvatarSchema();
  await bunnyExecute({
    sql: 'DELETE FROM avatar_profiles_sql WHERE id = ?',
    args: [id],
  });
  return true;
}

