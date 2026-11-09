import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface ExpressionBlendshapeRecord {
  id: string;
  twinId?: string;
  expressionName: string;
  emotionCategory: string;
  intensity: number;
  blendshapes: Record<string, number>;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  eyeSquint: number;
  mouthSmile: number;
  previewImageUrl?: string;
  createdAt: string;
}

export async function getAllExpressions(): Promise<ExpressionBlendshapeRecord[]> {
  try {
    const res = await bunnyExecute('SELECT * FROM avatar_expressions_sql ORDER BY created_at ASC');
    return (res.rows || []).map((r: any) => ({
      id: r.id,
      twinId: r.twin_id,
      expressionName: r.expression_name,
      emotionCategory: r.emotion_category,
      intensity: r.intensity || 1.0,
      blendshapes: JSON.parse(r.blendshapes_json || '{}'),
      headPitch: r.head_pitch || 0.0,
      headYaw: r.head_yaw || 0.0,
      headRoll: r.head_roll || 0.0,
      eyeSquint: r.eye_squint || 0.0,
      mouthSmile: r.mouth_smile || 0.0,
      previewImageUrl: r.preview_image_url,
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.error('Error fetching expressions:', error);
    return [];
  }
}

export async function saveCustomExpression(params: {
  id: string;
  twinId?: string;
  expressionName: string;
  emotionCategory: string;
  intensity: number;
  blendshapes: Record<string, number>;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  eyeSquint: number;
  mouthSmile: number;
  previewImageUrl?: string;
}): Promise<ExpressionBlendshapeRecord> {
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO avatar_expressions_sql (
      id, twin_id, expression_name, emotion_category, intensity, blendshapes_json,
      head_pitch, head_yaw, head_roll, eye_squint, mouth_smile, preview_image_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      expression_name=excluded.expression_name,
      intensity=excluded.intensity,
      blendshapes_json=excluded.blendshapes_json,
      head_pitch=excluded.head_pitch,
      head_yaw=excluded.head_yaw,
      head_roll=excluded.head_roll,
      eye_squint=excluded.eye_squint,
      mouth_smile=excluded.mouth_smile`,
    args: [
      params.id,
      params.twinId || null,
      params.expressionName,
      params.emotionCategory,
      params.intensity,
      JSON.stringify(params.blendshapes),
      params.headPitch,
      params.headYaw,
      params.headRoll,
      params.eyeSquint,
      params.mouthSmile,
      params.previewImageUrl || null,
      now,
    ],
  });

  return {
    ...params,
    createdAt: now,
  };
}

