import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

export interface RecipeScene {
  id: string;
  order: number;
  stepTitle: string;
  spokenScript: string;
  visualType: 'avatar' | 'image' | 'video' | 'pip'; // pip = Picture in Picture (Avatar over Image/Video)
  mediaUrl?: string; // Image or Video URL on Bunny CDN
  avatarId?: string; // Mohan Sir avatar reference
  voiceId?: string; // 'onyx' | 'alloy' | 'echo' etc.
  ingredientBullets?: string[]; // Optional bullet overlays
  durationSeconds?: number;
}

export interface MultiLangScene {
  sceneId: string;
  language: string;
  translatedTitle: string;
  translatedScript: string;
  audioUrl?: string; // Bunny CDN generated voice
}

export interface VideoRecipeProject {
  id: string;
  title: string;
  category: string;
  sourceLanguage: string;
  targetLanguages: string[];
  scenes: RecipeScene[];
  multiLangScenes: MultiLangScene[];
  status: 'draft' | 'translating' | 'ready' | 'rendering' | 'completed';
  finalVideoUrls?: Record<string, string>; // lang -> Bunny CDN video URL
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function initBunnyVideoRecipeSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS video_recipes_sql (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'ayurveda_recipe',
        source_language TEXT DEFAULT 'hi',
        target_languages_json TEXT NOT NULL DEFAULT '["en", "hi", "mr", "kn"]',
        scenes_json TEXT NOT NULL DEFAULT '[]',
        multilang_scenes_json TEXT NOT NULL DEFAULT '[]',
        status TEXT DEFAULT 'draft',
        final_video_urls_json TEXT DEFAULT '{}',
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_video_recipes_status ON video_recipes_sql(status)`, args: [] }
  ]);
}

export async function listVideoRecipes(): Promise<VideoRecipeProject[]> {
  await initBunnyVideoRecipeSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM video_recipes_sql ORDER BY updated_at DESC LIMIT 50',
    args: []
  });

  return (result.rows || []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    category: String(row.category || 'ayurveda_recipe'),
    sourceLanguage: String(row.source_language || 'hi'),
    targetLanguages: JSON.parse(row.target_languages_json || '["en", "hi", "mr", "kn"]'),
    scenes: JSON.parse(row.scenes_json || '[]'),
    multiLangScenes: JSON.parse(row.multilang_scenes_json || '[]'),
    status: row.status as any,
    finalVideoUrls: JSON.parse(row.final_video_urls_json || '{}'),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveVideoRecipe(project: Partial<VideoRecipeProject>): Promise<VideoRecipeProject> {
  await initBunnyVideoRecipeSchema();
  const id = project.id || `recipe_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `
      INSERT INTO video_recipes_sql (
        id, title, category, source_language, target_languages_json,
        scenes_json, multilang_scenes_json, status, final_video_urls_json,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        source_language = excluded.source_language,
        target_languages_json = excluded.target_languages_json,
        scenes_json = excluded.scenes_json,
        multilang_scenes_json = excluded.multilang_scenes_json,
        status = excluded.status,
        final_video_urls_json = excluded.final_video_urls_json,
        updated_at = excluded.updated_at
    `,
    args: [
      id,
      project.title || 'Untitled Video Recipe',
      project.category || 'ayurveda_recipe',
      project.sourceLanguage || 'hi',
      JSON.stringify(project.targetLanguages || ['en', 'hi', 'mr', 'kn']),
      JSON.stringify(project.scenes || []),
      JSON.stringify(project.multiLangScenes || []),
      project.status || 'draft',
      JSON.stringify(project.finalVideoUrls || {}),
      project.createdBy || 'superadmin',
      project.createdAt || now,
      now
    ]
  });

  return {
    id,
    title: project.title || 'Untitled Video Recipe',
    category: project.category || 'ayurveda_recipe',
    sourceLanguage: project.sourceLanguage || 'hi',
    targetLanguages: project.targetLanguages || ['en', 'hi', 'mr', 'kn'],
    scenes: project.scenes || [],
    multiLangScenes: project.multiLangScenes || [],
    status: (project.status as any) || 'draft',
    finalVideoUrls: project.finalVideoUrls || {},
    createdBy: project.createdBy || 'superadmin',
    createdAt: project.createdAt || now,
    updatedAt: now,
  };
}
