import crypto from 'crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface SceneObject3D {
  id: string;
  name: string;
  category: 'daily_objects' | 'human_body' | 'yoga_elements' | 'nature_food' | 'custom_glb' | 'environment';
  modelUrl?: string; // Custom GLB/GLTF or image texture url
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  color?: string;
  speed: 'slow' | 'normal' | 'fast';
  direction: 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward';
  path: 'straight' | 'curved' | 'circular';
  entry: 'fade' | 'move' | 'appear';
  exit: 'fade' | 'move' | 'disappear';
  keyframes?: Array<{ timeSec: number; posX: number; posY: number; posZ: number; scale: number; opacity: number }>;
  startSec: number;
  endSec: number;
}

export interface MediaTrackItem {
  id: string;
  type: 'video' | 'ppt' | 'image' | 'audio' | '3d_animation' | 'text_subtitle';
  title: string;
  url: string;
  startSec: number;
  endSec: number;
  layerIndex: number;
  volume?: number;
  opacity?: number;
}

export interface ApprovalChecklist {
  script: 'pending' | 'approved' | 'rejected';
  objects: 'pending' | 'approved' | 'rejected';
  motion: 'pending' | 'approved' | 'rejected';
  timeline: 'pending' | 'approved' | 'rejected';
  camera: 'pending' | 'approved' | 'rejected';
  audio: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
}

export interface ApprovalHistoryEvent {
  action: 'submitted' | 'approved' | 'rejected' | 'invalidated' | 'regenerated';
  timestamp: string;
  adminEmail?: string;
  notes?: string;
}

export interface RenderJob {
  jobId: string;
  status: 'idle' | 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number; // 0 to 100
  durationSeconds: number;
  resolution: '720p' | '1080p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1';
  format: 'mp4' | 'webm';
  outputUrl?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface StoryboardChunk {
  chunkIndex: number;
  timeRange: string; // e.g. "00:00 - 00:05s", "00:06 - 00:10s"
  startSecond: number;
  endSecond: number;
  actionText: string;
  movementStartToEnd: string; // Kinematics from start to end
  cameraDirection: string; // Camera movement & angle
  lightingEnvironment: string; // Scene lighting & environment
  endStateDescription: string; // State at segment completion
  objects: SceneObject3D[];
  needfulThings: string[];
  visualPrompt: string; // 4K visual prompt
  assetType: 'ai_4k' | 'ppt_slide' | 'video_clip';
  pptSlideUrl?: string;
  videoClipUrl?: string;
  status: 'draft' | 'approved' | 'rejected';
}

export interface CustomAnimationProject {
  id: string;
  title: string;
  topic: string;
  category: 'daily_health' | 'yoga_pranayama' | 'human_anatomy' | 'panchakarma' | 'general';
  durationSeconds: number; // 1 to 30 seconds
  fps: number; // 30 or 60
  resolution: '720p' | '1080p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1';
  format: 'mp4' | 'webm';
  needfulThings: string[]; // Master prop list
  chunks: StoryboardChunk[];
  mediaTracks: MediaTrackItem[];
  approvalChecklist: ApprovalChecklist;
  approvalStatus: 'draft' | 'ready_for_approval' | 'approved' | 'rejected' | 'rendering' | 'rendered';
  approvalHistory: ApprovalHistoryEvent[];
  renderJob: RenderJob;
  adminApprovedAt?: string;
  renderedVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Initialize Bunny Database Edge SQL table for custom animation projects.
 */
export async function initCustomAnimationTable(): Promise<void> {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS studio_custom_animation_projects_sql (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      duration_seconds INTEGER DEFAULT 30,
      fps INTEGER DEFAULT 60,
      resolution TEXT DEFAULT '1080p',
      aspect_ratio TEXT DEFAULT '16:9',
      format TEXT DEFAULT 'mp4',
      needful_things TEXT NOT NULL,
      chunks_json TEXT NOT NULL,
      media_tracks_json TEXT DEFAULT '[]',
      approval_checklist_json TEXT DEFAULT '{}',
      approval_status TEXT DEFAULT 'ready_for_approval',
      approval_history_json TEXT DEFAULT '[]',
      render_job_json TEXT DEFAULT '{}',
      admin_approved_at TEXT,
      rendered_video_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  });
}

/**
 * Save or update custom animation project with automatic approval invalidation on content edits.
 */
export async function saveCustomAnimationProject(
  project: Partial<CustomAnimationProject> & { title: string; topic: string },
  isExplicitAdminApprovalAction: boolean = false
): Promise<CustomAnimationProject> {
  await initCustomAnimationTable();

  const id = project.id || `proj_anim_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  // Fetch previous project state if it exists
  const existing = await getCustomAnimationProjectById(id);

  let approvalStatus = project.approvalStatus || (existing?.approvalStatus ?? 'ready_for_approval');
  let approvalHistory = project.approvalHistory || existing?.approvalHistory || [];
  let adminApprovedAt = project.adminApprovedAt || existing?.adminApprovedAt;

  // RULE: If project was previously approved, and non-approval edits are performed, invalidate approval
  if (existing && existing.approvalStatus === 'approved' && !isExplicitAdminApprovalAction) {
    approvalStatus = 'ready_for_approval';
    adminApprovedAt = undefined;
    approvalHistory.push({
      action: 'invalidated',
      timestamp: now,
      notes: 'Content or timeline was modified after approval. Re-approval is required before final rendering.',
    });
  }

  const durationSeconds = project.durationSeconds ?? existing?.durationSeconds ?? 30;
  const fps = project.fps ?? existing?.fps ?? 60;
  const resolution = project.resolution ?? existing?.resolution ?? '1080p';
  const aspectRatio = project.aspectRatio ?? existing?.aspectRatio ?? '16:9';
  const format = project.format ?? existing?.format ?? 'mp4';
  const category = project.category ?? existing?.category ?? 'general';
  const needfulThings = project.needfulThings ?? existing?.needfulThings ?? ['glass', 'water', 'spoon'];
  const chunks = project.chunks ?? existing?.chunks ?? [];
  const mediaTracks = project.mediaTracks ?? existing?.mediaTracks ?? [];
  const approvalChecklist = project.approvalChecklist ?? existing?.approvalChecklist ?? {
    script: 'pending',
    objects: 'pending',
    motion: 'pending',
    timeline: 'pending',
    camera: 'pending',
    audio: 'pending',
  };
  const renderJob = project.renderJob ?? existing?.renderJob ?? {
    jobId: `job_${Date.now()}`,
    status: 'idle',
    progress: 0,
    durationSeconds,
    resolution,
    aspectRatio,
    format,
  };
  const renderedVideoUrl = project.renderedVideoUrl ?? existing?.renderedVideoUrl ?? undefined;

  await bunnyExecute({
    sql: `INSERT INTO studio_custom_animation_projects_sql (
      id, title, topic, category, duration_seconds, fps, resolution, aspect_ratio, format,
      needful_things, chunks_json, media_tracks_json, approval_checklist_json,
      approval_status, approval_history_json, render_job_json, admin_approved_at,
      rendered_video_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      topic = excluded.topic,
      category = excluded.category,
      duration_seconds = excluded.duration_seconds,
      fps = excluded.fps,
      resolution = excluded.resolution,
      aspect_ratio = excluded.aspect_ratio,
      format = excluded.format,
      needful_things = excluded.needful_things,
      chunks_json = excluded.chunks_json,
      media_tracks_json = excluded.media_tracks_json,
      approval_checklist_json = excluded.approval_checklist_json,
      approval_status = excluded.approval_status,
      approval_history_json = excluded.approval_history_json,
      render_job_json = excluded.render_job_json,
      admin_approved_at = excluded.admin_approved_at,
      rendered_video_url = excluded.rendered_video_url,
      updated_at = excluded.updated_at`,
    args: [
      id,
      project.title,
      project.topic,
      category,
      durationSeconds,
      fps,
      resolution,
      aspectRatio,
      format,
      JSON.stringify(needfulThings),
      JSON.stringify(chunks),
      JSON.stringify(mediaTracks),
      JSON.stringify(approvalChecklist),
      approvalStatus,
      JSON.stringify(approvalHistory),
      JSON.stringify(renderJob),
      adminApprovedAt || null,
      renderedVideoUrl || null,
      existing?.createdAt || project.createdAt || now,
      now,
    ],
  });

  return {
    id,
    title: project.title,
    topic: project.topic,
    category,
    durationSeconds,
    fps,
    resolution,
    aspectRatio,
    format,
    needfulThings,
    chunks,
    mediaTracks,
    approvalChecklist,
    approvalStatus,
    approvalHistory,
    renderJob,
    adminApprovedAt,
    renderedVideoUrl,
    createdAt: existing?.createdAt || project.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Fetch all custom animation projects.
 */
export async function listCustomAnimationProjects(): Promise<CustomAnimationProject[]> {
  await initCustomAnimationTable();

  const res = await bunnyExecute({
    sql: `SELECT * FROM studio_custom_animation_projects_sql ORDER BY updated_at DESC LIMIT 50`,
  });

  return (res.rows || []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    topic: String(row.topic),
    category: (row.category as any) || 'general',
    durationSeconds: Number(row.duration_seconds || 30),
    fps: Number(row.fps || 60),
    resolution: (row.resolution as any) || '1080p',
    aspectRatio: (row.aspect_ratio as any) || '16:9',
    format: (row.format as any) || 'mp4',
    needfulThings: JSON.parse(String(row.needful_things || '[]')),
    chunks: JSON.parse(String(row.chunks_json || '[]')),
    mediaTracks: JSON.parse(String(row.media_tracks_json || '[]')),
    approvalChecklist: JSON.parse(String(row.approval_checklist_json || '{}')),
    approvalStatus: (row.approval_status as any) || 'ready_for_approval',
    approvalHistory: JSON.parse(String(row.approval_history_json || '[]')),
    renderJob: JSON.parse(String(row.render_job_json || '{}')),
    adminApprovedAt: row.admin_approved_at ? String(row.admin_approved_at) : undefined,
    renderedVideoUrl: row.rendered_video_url ? String(row.rendered_video_url) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

/**
 * Fetch single custom animation project by ID.
 */
export async function getCustomAnimationProjectById(id: string): Promise<CustomAnimationProject | null> {
  await initCustomAnimationTable();

  const res = await bunnyExecute({
    sql: `SELECT * FROM studio_custom_animation_projects_sql WHERE id = ? LIMIT 1`,
    args: [id],
  });

  if (!res.rows || res.rows.length === 0) return null;
  const row: any = res.rows[0];

  return {
    id: String(row.id),
    title: String(row.title),
    topic: String(row.topic),
    category: (row.category as any) || 'general',
    durationSeconds: Number(row.duration_seconds || 30),
    fps: Number(row.fps || 60),
    resolution: (row.resolution as any) || '1080p',
    aspectRatio: (row.aspect_ratio as any) || '16:9',
    format: (row.format as any) || 'mp4',
    needfulThings: JSON.parse(String(row.needful_things || '[]')),
    chunks: JSON.parse(String(row.chunks_json || '[]')),
    mediaTracks: JSON.parse(String(row.media_tracks_json || '[]')),
    approvalChecklist: JSON.parse(String(row.approval_checklist_json || '{}')),
    approvalStatus: (row.approval_status as any) || 'ready_for_approval',
    approvalHistory: JSON.parse(String(row.approval_history_json || '[]')),
    renderJob: JSON.parse(String(row.render_job_json || '{}')),
    adminApprovedAt: row.admin_approved_at ? String(row.admin_approved_at) : undefined,
    renderedVideoUrl: row.rendered_video_url ? String(row.rendered_video_url) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
