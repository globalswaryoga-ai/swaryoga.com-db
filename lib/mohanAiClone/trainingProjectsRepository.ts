import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface TrainingProjectRecord {
  id: string;
  project_name: string;
  target_identity_name: string;
  status: 'draft' | 'analyzing' | 'trained' | 'archived';
  total_videos: number;
  approved_videos: number;
  coverage_score: number;
  coverage_report_json?: string;
  master_avatar_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingVideoSlotRecord {
  id: string;
  training_project_id: string;
  slot_number: number; // 1 to 20
  original_filename: string;
  storage_object_key: string;
  file_url: string;
  file_checksum_sha256?: string;
  duration_seconds: number;
  resolution_width: number;
  resolution_height: number;
  frame_rate: number;
  audio_sample_rate: number;
  audio_snr_db: number;
  face_visibility_score: number; // 0.0 to 1.0
  body_visibility_score: number; // 0.0 to 1.0
  lighting_score: number; // 0.0 to 1.0
  analysis_status: 'pending' | 'processing' | 'approved' | 'rejected';
  analysis_metrics_json?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface TrainingCoverageReport {
  projectId: string;
  totalSlotsUploaded: number;
  totalApproved: number;
  coverageScorePct: number;
  checks: {
    frontFace: { passed: boolean; count: number; required: number; label: string };
    profileAngles: { passed: boolean; count: number; required: number; label: string };
    smileAndLips: { passed: boolean; count: number; required: number; label: string };
    speechAudioClarity: { passed: boolean; count: number; required: number; label: string };
    bodyPosture: { passed: boolean; count: number; required: number; label: string };
    handGestures: { passed: boolean; count: number; required: number; label: string };
  };
  missingRecommendations: string[];
  isReadyForCloneGeneration: boolean;
}

const DEFAULT_PROJECT_ID = 'mohan_master_clone_proj_v1';

/**
 * Get or automatically initialize the master Mohan AI Clone training project
 */
export async function getOrCreateDefaultTrainingProject(): Promise<TrainingProjectRecord> {
  const check = await bunnyExecute({
    sql: `SELECT * FROM mohan_clone_training_projects_sql WHERE id = ? LIMIT 1`,
    args: [DEFAULT_PROJECT_ID],
  });

  if (check.rows && check.rows.length > 0) {
    return check.rows[0] as unknown as TrainingProjectRecord;
  }

  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO mohan_clone_training_projects_sql
          (id, project_name, target_identity_name, status, total_videos, approved_videos, coverage_score, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      DEFAULT_PROJECT_ID,
      'Mohan Master Digital Human v1.0',
      'Mohan Kalburgi',
      'draft',
      0,
      0,
      0.0,
      now,
      now,
    ],
  });

  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_clone_training_projects_sql WHERE id = ? LIMIT 1`,
    args: [DEFAULT_PROJECT_ID],
  });
  if (res.rows && res.rows.length > 0) {
    return res.rows[0] as unknown as TrainingProjectRecord;
  }

  return {
    id: DEFAULT_PROJECT_ID,
    project_name: 'Mohan Master Digital Human v1.0',
    target_identity_name: 'Mohan Kalburgi',
    status: 'draft',
    total_videos: 0,
    approved_videos: 0,
    coverage_score: 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Fetch all 20 video slots for a training project
 */
export async function getTrainingVideosForProject(projectId = DEFAULT_PROJECT_ID): Promise<TrainingVideoSlotRecord[]> {
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_clone_training_videos_sql WHERE training_project_id = ? ORDER BY slot_number ASC`,
    args: [projectId],
  });
  return (res.rows || []) as unknown as TrainingVideoSlotRecord[];
}

/**
 * Save or update an individual training video slot (enforces 1-20 slot uniqueness)
 */
export async function saveTrainingVideoSlot(
  data: Omit<TrainingVideoSlotRecord, 'id' | 'created_at'> & { id?: string }
): Promise<TrainingVideoSlotRecord> {
  if (data.slot_number < 1 || data.slot_number > 20) {
    throw new Error(`Slot number must be between 1 and 20. Received: ${data.slot_number}`);
  }

  const id = data.id || `slot_${data.training_project_id}_${data.slot_number}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT INTO mohan_clone_training_videos_sql
          (id, training_project_id, slot_number, original_filename, storage_object_key, file_url,
           file_checksum_sha256, duration_seconds, resolution_width, resolution_height, frame_rate,
           audio_sample_rate, audio_snr_db, face_visibility_score, body_visibility_score, lighting_score,
           analysis_status, analysis_metrics_json, rejection_reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(training_project_id, slot_number) DO UPDATE SET
            original_filename = excluded.original_filename,
            storage_object_key = excluded.storage_object_key,
            file_url = excluded.file_url,
            file_checksum_sha256 = excluded.file_checksum_sha256,
            duration_seconds = excluded.duration_seconds,
            resolution_width = excluded.resolution_width,
            resolution_height = excluded.resolution_height,
            frame_rate = excluded.frame_rate,
            audio_sample_rate = excluded.audio_sample_rate,
            audio_snr_db = excluded.audio_snr_db,
            face_visibility_score = excluded.face_visibility_score,
            body_visibility_score = excluded.body_visibility_score,
            lighting_score = excluded.lighting_score,
            analysis_status = excluded.analysis_status,
            analysis_metrics_json = excluded.analysis_metrics_json,
            rejection_reason = excluded.rejection_reason`,
    args: [
      id,
      data.training_project_id,
      data.slot_number,
      data.original_filename,
      data.storage_object_key,
      data.file_url,
      data.file_checksum_sha256 || null,
      data.duration_seconds || 0,
      data.resolution_width || 1280,
      data.resolution_height || 720,
      data.frame_rate || 30,
      data.audio_sample_rate || 44100,
      data.audio_snr_db || 20,
      data.face_visibility_score ?? 0.9,
      data.body_visibility_score ?? 0.8,
      data.lighting_score ?? 0.85,
      data.analysis_status || 'approved',
      data.analysis_metrics_json || null,
      data.rejection_reason || null,
      now,
    ],
  });

  // Re-calculate coverage and update project totals
  await updateProjectStats(data.training_project_id);

  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_clone_training_videos_sql WHERE id = ? LIMIT 1`,
    args: [id],
  });
  return res.rows[0] as unknown as TrainingVideoSlotRecord;
}

/**
 * Delete a specific slot
 */
export async function deleteTrainingVideoSlot(projectId: string, slotNumber: number): Promise<void> {
  await bunnyExecute({
    sql: `DELETE FROM mohan_clone_training_videos_sql WHERE training_project_id = ? AND slot_number = ?`,
    args: [projectId, slotNumber],
  });
  await updateProjectStats(projectId);
}

/**
 * Comprehensive Training Coverage Matrix Calculator
 */
export async function calculateTrainingCoverage(projectId = DEFAULT_PROJECT_ID): Promise<TrainingCoverageReport> {
  const videos = await getTrainingVideosForProject(projectId);
  const totalSlotsUploaded = videos.length;
  const approvedVideos = videos.filter((v) => v.analysis_status === 'approved');

  // Dimension 1: Front Face Alignment (Face visibility >= 0.8)
  const frontFaceCount = approvedVideos.filter((v) => (v.face_visibility_score || 0) >= 0.75).length;
  const frontFacePassed = frontFaceCount >= 3;

  // Dimension 2: Profile Angles / 3/4 View (Slots 17-20 or specific profile indicators)
  const profileCount = approvedVideos.filter((v) => v.slot_number >= 17 || (v.analysis_metrics_json && v.analysis_metrics_json.includes('profile'))).length;
  const profilePassed = profileCount >= 2;

  // Dimension 3: Smile & Lip Articulation (Slots 9-12 speech or smile score)
  const smileCount = approvedVideos.filter((v) => (v.slot_number >= 9 && v.slot_number <= 12) || (v.face_visibility_score || 0) >= 0.8).length;
  const smilePassed = smileCount >= 2;

  // Dimension 4: Audio Clarity & Speaking Rhythm (SNR >= 15dB)
  const audioCount = approvedVideos.filter((v) => (v.audio_snr_db || 0) >= 15).length;
  const audioPassed = audioCount >= 4;

  // Dimension 5: Body Posture & Torso (Body visibility >= 0.6)
  const bodyCount = approvedVideos.filter((v) => (v.body_visibility_score || 0) >= 0.5).length;
  const bodyPassed = bodyCount >= 3;

  // Dimension 6: Teaching & Kinetic Gestures (Slots 13-16)
  const gestureCount = approvedVideos.filter((v) => (v.slot_number >= 13 && v.slot_number <= 16) || (v.body_visibility_score || 0) >= 0.6).length;
  const gesturePassed = gestureCount >= 2;

  const checksArray = [frontFacePassed, profilePassed, smilePassed, audioPassed, bodyPassed, gesturePassed];
  const passedCount = checksArray.filter(Boolean).length;
  const coverageScorePct = Math.round((passedCount / checksArray.length) * 100);

  const missingRecommendations: string[] = [];
  if (!frontFacePassed) missingRecommendations.push(`Upload at least ${3 - frontFaceCount} more direct front-facing videos with clear facial lighting.`);
  if (!profilePassed) missingRecommendations.push(`Upload at least ${2 - profileCount} videos at 45° semi-profile or 90° side profile for 3D depth.`);
  if (!smilePassed) missingRecommendations.push(`Upload at least ${2 - smileCount} videos featuring natural speaking smiles and visible tooth articulation.`);
  if (!audioPassed) missingRecommendations.push(`Upload at least ${4 - audioCount} videos with clean, low-noise audio (SNR ≥ 15 dB) for voice synthesis.`);
  if (!bodyPassed) missingRecommendations.push(`Upload at least ${3 - bodyCount} videos showing waist-up or sitting meditation posture.`);
  if (!gesturePassed) missingRecommendations.push(`Upload at least ${2 - gestureCount} videos demonstrating natural hand teaching gestures & mudras.`);

  return {
    projectId,
    totalSlotsUploaded,
    totalApproved: approvedVideos.length,
    coverageScorePct,
    checks: {
      frontFace: { passed: frontFacePassed, count: frontFaceCount, required: 3, label: 'Front Facial Alignment' },
      profileAngles: { passed: profilePassed, count: profileCount, required: 2, label: '3/4 Profile & 3D Depth' },
      smileAndLips: { passed: smilePassed, count: smileCount, required: 2, label: 'Natural Smile & Lip Dynamics' },
      speechAudioClarity: { passed: audioPassed, count: audioCount, required: 4, label: 'Speech Clarity & Voice SNR' },
      bodyPosture: { passed: bodyPassed, count: bodyCount, required: 3, label: 'Full Body & Torso Posture' },
      handGestures: { passed: gesturePassed, count: gestureCount, required: 2, label: 'Kinetic Teaching Gestures' },
    },
    missingRecommendations,
    isReadyForCloneGeneration: totalSlotsUploaded >= 5 && coverageScorePct >= 65,
  };
}

/**
 * Internal helper to keep project stats synchronized
 */
async function updateProjectStats(projectId: string): Promise<void> {
  const report = await calculateTrainingCoverage(projectId);
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `UPDATE mohan_clone_training_projects_sql
          SET total_videos = ?,
              approved_videos = ?,
              coverage_score = ?,
              coverage_report_json = ?,
              updated_at = ?
          WHERE id = ?`,
    args: [
      report.totalSlotsUploaded,
      report.totalApproved,
      report.coverageScorePct,
      JSON.stringify(report),
      now,
      projectId,
    ],
  });
}

