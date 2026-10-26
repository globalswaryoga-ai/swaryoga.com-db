import crypto from 'crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export interface AnimationProject3D {
  id: string;
  title: string;
  category: 'breathing_pranayama' | 'yoga_asana' | 'chakra_nadis' | 'digestive_system' | 'anatomy' | 'panchakarma';
  durationSeconds: number; // 10, 15, or 20
  aspectRatio: '16:9' | '9:16';
  modelType: string;
  activeOrganId: string;
  cameraPreset: string;
  animationPreset: string;
  timelineJson: string;
  effectsJson: string;
  labelsEnabled: boolean;
  scientificMode: boolean;
  renderedVideoUrl?: string;
  renderStatus: 'draft' | 'rendering' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
}

/**
 * Initialize 3D Animation database table in Bunny Database (Edge SQL).
 */
export async function init3DAnimationTable(): Promise<void> {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS studio_3d_animation_projects_sql (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 10,
      aspect_ratio TEXT DEFAULT '16:9',
      model_type TEXT NOT NULL,
      active_organ_id TEXT,
      camera_preset TEXT DEFAULT 'front_cinematic',
      animation_preset TEXT DEFAULT 'deep_diaphragmatic',
      timeline_json TEXT NOT NULL,
      effects_json TEXT,
      labels_enabled INTEGER DEFAULT 1,
      scientific_mode INTEGER DEFAULT 1,
      rendered_video_url TEXT,
      render_status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  });
}

/**
 * Save or update a 3D animation project.
 */
export async function save3DAnimationProject(
  project: Partial<AnimationProject3D> & { title: string }
): Promise<AnimationProject3D> {
  await init3DAnimationTable();

  const id = project.id || `proj_3d_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const fullProject: AnimationProject3D = {
    id,
    title: project.title,
    category: project.category || 'breathing_pranayama',
    durationSeconds: project.durationSeconds || 10,
    aspectRatio: project.aspectRatio || '16:9',
    modelType: project.modelType || 'respiratory_system',
    activeOrganId: project.activeOrganId || 'lungs_diaphragm',
    cameraPreset: project.cameraPreset || 'front_cinematic',
    animationPreset: project.animationPreset || 'deep_diaphragmatic',
    timelineJson: project.timelineJson || JSON.stringify({ keyframes: [] }),
    effectsJson: project.effectsJson || JSON.stringify({ particles: true, glow: true }),
    labelsEnabled: project.labelsEnabled !== false,
    scientificMode: project.scientificMode !== false,
    renderedVideoUrl: project.renderedVideoUrl || undefined,
    renderStatus: project.renderStatus || 'draft',
    createdAt: project.createdAt || now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_3d_animation_projects_sql (
      id, title, category, duration_seconds, aspect_ratio, model_type,
      active_organ_id, camera_preset, animation_preset, timeline_json,
      effects_json, labels_enabled, scientific_mode, rendered_video_url,
      render_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      fullProject.id,
      fullProject.title,
      fullProject.category,
      fullProject.durationSeconds,
      fullProject.aspectRatio,
      fullProject.modelType,
      fullProject.activeOrganId,
      fullProject.cameraPreset,
      fullProject.animationPreset,
      fullProject.timelineJson,
      fullProject.effectsJson,
      fullProject.labelsEnabled ? 1 : 0,
      fullProject.scientificMode ? 1 : 0,
      fullProject.renderedVideoUrl || null,
      fullProject.renderStatus,
      fullProject.createdAt,
      fullProject.updatedAt,
    ],
  });

  return fullProject;
}

/**
 * List all saved 3D animation projects.
 */
export async function get3DAnimationProjects(): Promise<AnimationProject3D[]> {
  await init3DAnimationTable();

  const res = await bunnyExecute({
    sql: `SELECT * FROM studio_3d_animation_projects_sql ORDER BY updated_at DESC LIMIT 50`,
  });

  return (res.rows || []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    category: row.category as any,
    durationSeconds: Number(row.duration_seconds || 10),
    aspectRatio: (row.aspect_ratio as any) || '16:9',
    modelType: String(row.model_type || 'respiratory_system'),
    activeOrganId: String(row.active_organ_id || 'lungs_diaphragm'),
    cameraPreset: String(row.camera_preset || 'front_cinematic'),
    animationPreset: String(row.animation_preset || 'deep_diaphragmatic'),
    timelineJson: String(row.timeline_json || '{}'),
    effectsJson: String(row.effects_json || '{}'),
    labelsEnabled: Number(row.labels_enabled) === 1,
    scientificMode: Number(row.scientific_mode) === 1,
    renderedVideoUrl: row.rendered_video_url ? String(row.rendered_video_url) : undefined,
    renderStatus: (row.render_status as any) || 'draft',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

/**
 * Delete a 3D animation project by ID.
 */
export async function delete3DAnimationProject(id: string): Promise<boolean> {
  await init3DAnimationTable();
  const res = await bunnyExecute({
    sql: `DELETE FROM studio_3d_animation_projects_sql WHERE id = ?`,
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}
