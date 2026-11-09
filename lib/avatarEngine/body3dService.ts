import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface AnthropometricSpec {
  heightM: number;           // Target height in meters (e.g. 1.676 for 5'6")
  weightKg: number;          // Weight in kg (e.g. 80.0)
  shoulderWidthM: number;    // Shoulder width in meters (e.g. 0.470 for 18.5 in)
  chestCircM: number;        // Chest circumference in meters (e.g. 0.965 for 38 in)
  waistCircM: number;        // Waist circumference in meters (e.g. 0.813 for 32 in)
  hipsCircM: number;         // Hips circumference in meters (e.g. 0.965 for 38 in)
}

export interface Body3DModelRecord {
  id: string;
  userId: string;
  twinId?: string;
  name: string;
  anthropometrics: AnthropometricSpec;
  rigType: 'blender_rigify' | 'mixamo' | 'ready_player_me';
  boneCount: number;
  meshGlbUrl?: string;
  frontViewUrl?: string;
  backViewUrl?: string;
  leftViewUrl?: string;
  rightViewUrl?: string;
  riggingStatus: 'rigged' | 'in_progress' | 'failed' | 'not_started' | 'not_verified';
  createdAt: string;
  updatedAt: string;
}

export async function getAllBodyModels(userId?: string): Promise<Body3DModelRecord[]> {
  try {
    const sql = userId
      ? 'SELECT * FROM avatar_body_models_sql WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM avatar_body_models_sql ORDER BY created_at DESC';
    const args = userId ? [userId] : [];
    const res = await bunnyExecute({ sql, args });

    return (res.rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      twinId: r.twin_id,
      name: r.name,
      anthropometrics: {
        heightM: r.target_height_m,
        weightKg: r.weight_kg,
        shoulderWidthM: r.shoulder_width_m,
        chestCircM: r.chest_circ_m,
        waistCircM: r.waist_circ_m,
        hipsCircM: r.hips_circ_m,
      },
      rigType: r.rig_type || 'blender_rigify',
      boneCount: Number(r.bone_count || 0),
      meshGlbUrl: r.mesh_glb_url,
      frontViewUrl: r.front_view_url,
      backViewUrl: r.back_view_url,
      leftViewUrl: r.left_view_url,
      rightViewUrl: r.right_view_url,
      riggingStatus: r.rigging_status || 'not_verified',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching body models:', error);
    return [];
  }
}

export async function createBodyModel(params: {
  userId: string;
  twinId?: string;
  name: string;
  anthropometrics: AnthropometricSpec;
  rigType?: 'blender_rigify' | 'mixamo' | 'ready_player_me';
  meshGlbUrl?: string;
  frontViewUrl?: string;
}): Promise<Body3DModelRecord> {
  const id = `body_${Date.now()}`;
  const now = new Date().toISOString();
  const a = params.anthropometrics;

  await bunnyExecute({
    sql: `INSERT INTO avatar_body_models_sql (
      id, user_id, twin_id, name, target_height_m, weight_kg, shoulder_width_m,
      chest_circ_m, waist_circ_m, hips_circ_m, rig_type, bone_count,
      mesh_glb_url, front_view_url, rigging_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, "not_started", ?, ?)`,
    args: [
      id,
      params.userId,
      params.twinId || null,
      params.name,
      a.heightM,
      a.weightKg,
      a.shoulderWidthM,
      a.chestCircM,
      a.waistCircM,
      a.hipsCircM,
      params.rigType || 'blender_rigify',
      params.meshGlbUrl || null,
      params.frontViewUrl || null,
      now,
      now,
    ],
  });

  return {
    id,
    userId: params.userId,
    twinId: params.twinId,
    name: params.name,
    anthropometrics: a,
    rigType: params.rigType || 'blender_rigify',
    boneCount: 0,
    meshGlbUrl: params.meshGlbUrl,
    frontViewUrl: params.frontViewUrl,
    riggingStatus: 'not_started',
    createdAt: now,
    updatedAt: now,
  };
}
