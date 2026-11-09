import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface MotionProfileRecord {
  id: string;
  userId?: string;
  motionName: string;
  motionCategory: 'walking' | 'running' | 'sitting' | 'standing' | 'teaching' | 'yoga_swar';
  loopable: boolean;
  durationSeconds: number;
  fps: number;
  keyframeCount: number;
  applicablePoses: string[];
  description?: string;
  animationClipUrl?: string;
}

export async function getAllMotionProfiles(userId?: string): Promise<MotionProfileRecord[]> {
  try {
    const sql = userId
      ? 'SELECT * FROM avatar_motion_profiles_sql WHERE user_id = ? OR user_id IS NULL ORDER BY motion_category ASC, motion_name ASC'
      : 'SELECT * FROM avatar_motion_profiles_sql ORDER BY motion_category ASC, motion_name ASC';
    const args = userId ? [userId] : [];
    const res = await bunnyExecute({ sql, args });

    return (res.rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      motionName: r.motion_name,
      motionCategory: r.motion_category,
      loopable: Boolean(r.loopable),
      durationSeconds: r.duration_seconds || 3.0,
      fps: r.fps || 30,
      keyframeCount: r.keyframe_count || 90,
      applicablePoses: JSON.parse(r.applicable_poses_json || '["standing"]'),
      description: r.description,
      animationClipUrl: r.animation_clip_url,
    }));
  } catch (error) {
    console.error('Error fetching motion profiles:', error);
    return [];
  }
}

export async function getMotionsByCategory(category: string, userId?: string): Promise<MotionProfileRecord[]> {
  try {
    const sql = userId
      ? 'SELECT * FROM avatar_motion_profiles_sql WHERE motion_category = ? AND (user_id = ? OR user_id IS NULL) ORDER BY motion_name ASC'
      : 'SELECT * FROM avatar_motion_profiles_sql WHERE motion_category = ? ORDER BY motion_name ASC';
    const args = userId ? [category, userId] : [category];
    const res = await bunnyExecute({ sql, args });

    return (res.rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      motionName: r.motion_name,
      motionCategory: r.motion_category,
      loopable: Boolean(r.loopable),
      durationSeconds: r.duration_seconds || 3.0,
      fps: r.fps || 30,
      keyframeCount: r.keyframe_count || 90,
      applicablePoses: JSON.parse(r.applicable_poses_json || '["standing"]'),
      description: r.description,
      animationClipUrl: r.animation_clip_url,
    }));
  } catch (error) {
    console.error(`Error fetching motions for ${category}:`, error);
    return [];
  }
}

export async function createMotionProfile(params: {
  userId: string;
  motionName: string;
  motionCategory: 'walking' | 'running' | 'sitting' | 'standing' | 'teaching' | 'yoga_swar';
  loopable?: boolean;
  durationSeconds?: number;
  fps?: number;
  keyframeCount?: number;
  applicablePoses?: string[];
  description?: string;
  animationClipUrl?: string;
}): Promise<MotionProfileRecord> {
  const id = `motion_${Date.now()}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT INTO avatar_motion_profiles_sql (
      id, user_id, motion_name, motion_category, loopable, duration_seconds, fps,
      animation_clip_url, keyframe_count, applicable_poses_json, description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.userId,
      params.motionName,
      params.motionCategory,
      params.loopable !== false ? 1 : 0,
      params.durationSeconds || 3.0,
      params.fps || 30,
      params.animationClipUrl || null,
      params.keyframeCount || 90,
      JSON.stringify(params.applicablePoses || ['standing']),
      params.description || null,
      now,
    ],
  });

  return {
    id,
    userId: params.userId,
    motionName: params.motionName,
    motionCategory: params.motionCategory,
    loopable: params.loopable !== false,
    durationSeconds: params.durationSeconds || 3.0,
    fps: params.fps || 30,
    keyframeCount: params.keyframeCount || 90,
    applicablePoses: params.applicablePoses || ['standing'],
    description: params.description,
    animationClipUrl: params.animationClipUrl,
  };
}
