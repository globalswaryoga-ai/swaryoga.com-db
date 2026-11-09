import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface MotionProfileRecord {
  id: string;
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

export async function getAllMotionProfiles(): Promise<MotionProfileRecord[]> {
  try {
    const res = await bunnyExecute('SELECT * FROM avatar_motion_profiles_sql ORDER BY motion_category ASC, motion_name ASC');
    return (res.rows || []).map((r: any) => ({
      id: r.id,
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

export async function getMotionsByCategory(category: string): Promise<MotionProfileRecord[]> {
  try {
    const res = await bunnyExecute({
      sql: 'SELECT * FROM avatar_motion_profiles_sql WHERE motion_category = ?',
      args: [category]
    });
    return (res.rows || []).map((r: any) => ({
      id: r.id,
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
