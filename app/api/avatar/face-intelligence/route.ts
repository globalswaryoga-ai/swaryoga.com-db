import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'mohan_master_clone_proj_v1';

    const faceRes = await bunnyExecute({
      sql: `SELECT * FROM mohan_face_identity_sql WHERE training_project_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [projectId],
    });

    let lipProfile = null;
    const faceIdentity = faceRes.rows && faceRes.rows.length > 0 ? faceRes.rows[0] : null;

    if (faceIdentity) {
      const lipRes = await bunnyExecute({
        sql: `SELECT * FROM mohan_lip_smile_profiles_sql WHERE face_identity_id = ? LIMIT 1`,
        args: [faceIdentity.id],
      });
      if (lipRes.rows && lipRes.rows.length > 0) {
        lipProfile = lipRes.rows[0];
      }
    }

    return NextResponse.json({
      success: true,
      faceIdentity,
      lipProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      training_project_id = 'mohan_master_clone_proj_v1',
      version = '1.0',
      face_shape = 'oval',
      forehead_ratio = 0.33,
      eye_spacing = 0.42,
      jaw_width = 0.78,
      skin_tone_hex = '#d4a373',
      upper_lip_thickness = 0.18,
      lower_lip_thickness = 0.28,
      mouth_width_rest = 0.48,
      mouth_width_smile = 0.65,
      teeth_exposure_ratio = 0.45,
      approval_status = 'approved',
    } = body;

    const faceId = body.id || `face_${training_project_id}_${version}`;
    const now = new Date().toISOString();

    // 1. Upsert Face Identity
    await bunnyExecute({
      sql: `INSERT INTO mohan_face_identity_sql
            (id, training_project_id, version, face_shape, forehead_ratio, eye_spacing,
             jaw_width, skin_tone_hex, approval_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              face_shape = excluded.face_shape,
              forehead_ratio = excluded.forehead_ratio,
              eye_spacing = excluded.eye_spacing,
              jaw_width = excluded.jaw_width,
              skin_tone_hex = excluded.skin_tone_hex,
              approval_status = excluded.approval_status`,
      args: [
        faceId,
        training_project_id,
        version,
        face_shape,
        Number(forehead_ratio),
        Number(eye_spacing),
        Number(jaw_width),
        skin_tone_hex,
        approval_status,
        now,
      ],
    });

    // 2. Upsert Lip & Smile Profile
    const lipId = `lip_${faceId}`;
    await bunnyExecute({
      sql: `INSERT INTO mohan_lip_smile_profiles_sql
            (id, face_identity_id, upper_lip_thickness, lower_lip_thickness, mouth_width_rest,
             mouth_width_smile, teeth_exposure_ratio, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              upper_lip_thickness = excluded.upper_lip_thickness,
              lower_lip_thickness = excluded.lower_lip_thickness,
              mouth_width_rest = excluded.mouth_width_rest,
              mouth_width_smile = excluded.mouth_width_smile,
              teeth_exposure_ratio = excluded.teeth_exposure_ratio`,
      args: [
        lipId,
        faceId,
        Number(upper_lip_thickness),
        Number(lower_lip_thickness),
        Number(mouth_width_rest),
        Number(mouth_width_smile),
        Number(teeth_exposure_ratio),
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Face identity and lip profile saved successfully',
      faceId,
      lipId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

