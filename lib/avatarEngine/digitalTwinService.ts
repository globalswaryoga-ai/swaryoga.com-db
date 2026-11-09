import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface DigitalTwinRecord {
  id: string;
  userId: string;
  profileId: string;
  twinName: string;
  baseVideoUrl: string;
  thumbnailUrl: string;
  headPoseRange: { yaw_range: [number, number]; pitch_range: [number, number]; roll_range: [number, number] };
  speakingCadenceWpm: number;
  dominantExpressions: string[];
  handGesturesEnabled: boolean;
  eyeBlinkRateBpm: number;
  identityConsistencyScore: number;
  trainingStatus: 'completed' | 'training' | 'queued' | 'failed' | 'not_trained';
  validationReport: {
    status?: string;
    verified?: boolean;
    reason?: string;
    framing?: string;
    resolution?: string;
    fps?: number;
    confidence_pct?: number;
    bilabial_accuracy?: string;
    audio_snr?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export async function getAllDigitalTwins(userId?: string): Promise<DigitalTwinRecord[]> {
  try {
    const sql = userId
      ? 'SELECT * FROM digital_twins_v3_sql WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM digital_twins_v3_sql ORDER BY created_at DESC';
    const args = userId ? [userId] : [];
    const res = await bunnyExecute({ sql, args });

    return (res.rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      profileId: r.profile_id,
      twinName: r.twin_name,
      baseVideoUrl: r.base_video_url,
      thumbnailUrl: r.thumbnail_url,
      headPoseRange: JSON.parse(r.head_pose_range_json || '{"yaw_range":[-15,15],"pitch_range":[-10,10],"roll_range":[-5,5]}'),
      speakingCadenceWpm: Number(r.speaking_cadence_wpm || 0),
      dominantExpressions: JSON.parse(r.dominant_expressions_json || '["teaching","smiling"]'),
      handGesturesEnabled: Boolean(r.hand_gestures_enabled),
      eyeBlinkRateBpm: Number(r.eye_blink_rate_bpm || 0),
      identityConsistencyScore: Number(r.identity_consistency_score || 0),
      trainingStatus: r.training_status || 'not_trained',
      validationReport: JSON.parse(r.validation_report_json || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching digital twins:', error);
    return [];
  }
}

export async function getDigitalTwinById(twinId: string): Promise<DigitalTwinRecord | null> {
  try {
    const res = await bunnyExecute({
      sql: 'SELECT * FROM digital_twins_v3_sql WHERE id = ?',
      args: [twinId]
    });
    const r = res.rows?.[0] as any;
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      profileId: r.profile_id,
      twinName: r.twin_name,
      baseVideoUrl: r.base_video_url,
      thumbnailUrl: r.thumbnail_url,
      headPoseRange: JSON.parse(r.head_pose_range_json || '{"yaw_range":[-15,15],"pitch_range":[-10,10],"roll_range":[-5,5]}'),
      speakingCadenceWpm: Number(r.speaking_cadence_wpm || 0),
      dominantExpressions: JSON.parse(r.dominant_expressions_json || '["teaching","smiling"]'),
      handGesturesEnabled: Boolean(r.hand_gestures_enabled),
      eyeBlinkRateBpm: Number(r.eye_blink_rate_bpm || 0),
      identityConsistencyScore: Number(r.identity_consistency_score || 0),
      trainingStatus: r.training_status || 'not_trained',
      validationReport: JSON.parse(r.validation_report_json || '{}'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } catch {
    return null;
  }
}
