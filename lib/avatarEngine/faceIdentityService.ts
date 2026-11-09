import * as crypto from 'crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface FaceLandmarkAnalysis {
  faceDetected: boolean;
  box: { x: number; y: number; width: number; height: number };
  pitchAngle: number;   // Up/Down head tilt
  yawAngle: number;     // Left/Right head turn
  rollAngle: number;    // Head tilt to shoulder
  isFrontal: boolean;   // True if within ±15 degrees of pure 0° frontal lens
  eyeDistancePx: number;
  qualityScore: number; // 0.0 - 1.0 (lighting, contrast, blur)
  facialEmbeddings?: number[];
}

export interface AvatarIdentityProfile {
  id: string;
  userId: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  ageGroup: 'young_adult' | 'adult' | 'senior';
  defaultClothing: string;
  defaultHair: string;
  frontalFaceUrl: string;
  bgRemovedUrl?: string;
  qualityScore: number;
  consentRecordId?: string;
  createdAt: string;
}

export class FaceAnalysisUnavailableError extends Error {
  constructor() {
    super('Face analysis is not implemented on this server; no facial metrics were produced.');
    this.name = 'FaceAnalysisUnavailableError';
  }
}

/**
 * Fail closed until a real, versioned face-analysis runtime is connected.
 */
export function analyzeFaceGeometry(): FaceLandmarkAnalysis {
  throw new FaceAnalysisUnavailableError();
}

/**
 * Creates or updates a reusable Avatar Identity Profile
 */
export async function createAvatarIdentityProfile(params: {
  userId: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  ageGroup: 'young_adult' | 'adult' | 'senior';
  defaultClothing: string;
  defaultHair: string;
  frontalFaceUrl: string;
  bgRemovedUrl?: string;
  consentRecordId?: string;
  qualityScore?: number;
}): Promise<AvatarIdentityProfile> {
  const id = `profile_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const quality = params.qualityScore ?? 0;

  await bunnyExecute({
    sql: `INSERT INTO avatar_identity_profiles_sql (
      id, user_id, name, gender, age_group, default_clothing, default_hair,
      frontal_face_url, bg_removed_url, quality_score, consent_record_id, is_active,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [
      id,
      params.userId,
      params.name,
      params.gender,
      params.ageGroup,
      params.defaultClothing,
      params.defaultHair,
      params.frontalFaceUrl,
      params.bgRemovedUrl || null,
      quality,
      params.consentRecordId || null,
      now,
      now
    ]
  });

  return {
    id,
    userId: params.userId,
    name: params.name,
    gender: params.gender,
    ageGroup: params.ageGroup,
    defaultClothing: params.defaultClothing,
    defaultHair: params.defaultHair,
    frontalFaceUrl: params.frontalFaceUrl,
    bgRemovedUrl: params.bgRemovedUrl,
    qualityScore: quality,
    consentRecordId: params.consentRecordId,
    createdAt: now
  };
}

export async function getAvatarProfileById(profileId: string): Promise<AvatarIdentityProfile | null> {
  const res = await bunnyExecute({
    sql: 'SELECT * FROM avatar_identity_profiles_sql WHERE id = ?',
    args: [profileId]
  });
  const row = res.rows?.[0] as any;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    gender: row.gender,
    ageGroup: row.age_group,
    defaultClothing: row.default_clothing,
    defaultHair: row.default_hair,
    frontalFaceUrl: row.frontal_face_url,
    bgRemovedUrl: row.bg_removed_url,
    qualityScore: row.quality_score,
    consentRecordId: row.consent_record_id,
    createdAt: row.created_at
  };
}
