import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'mohan_master_clone_proj_v1';

    const res = await bunnyExecute({
      sql: `SELECT * FROM mohan_expression_library_sql WHERE training_project_id = ? ORDER BY created_at DESC`,
      args: [projectId],
    });

    return NextResponse.json({ success: true, expressions: res.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      training_project_id = 'mohan_master_clone_proj_v1',
      expression_name,
      category = 'teaching',
      source_video_id,
      source_timestamp_start = 0,
      source_timestamp_end = 0,
      intensity = 1.0,
      landmark_deltas_json,
      reference_thumbnail_key,
      confidence_score = 0.9,
      human_verification_status = 'pending',
    } = body;

    if (!expression_name) {
      return NextResponse.json({ success: false, error: 'expression_name is required' }, { status: 400 });
    }

    const id = body.id || `expr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    await bunnyExecute({
      sql: `INSERT INTO mohan_expression_library_sql
            (id, training_project_id, expression_name, category, source_video_id,
             source_timestamp_start, source_timestamp_end, intensity, landmark_deltas_json,
             reference_thumbnail_key, confidence_score, human_verification_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              expression_name = excluded.expression_name,
              category = excluded.category,
              intensity = excluded.intensity,
              confidence_score = excluded.confidence_score,
              human_verification_status = excluded.human_verification_status`,
      args: [
        id,
        training_project_id,
        expression_name,
        category,
        source_video_id || null,
        Number(source_timestamp_start),
        Number(source_timestamp_end),
        Number(intensity),
        typeof landmark_deltas_json === 'string' ? landmark_deltas_json : JSON.stringify(landmark_deltas_json || {}),
        reference_thumbnail_key || null,
        Number(confidence_score),
        human_verification_status,
        now,
      ],
    });

    const res = await bunnyExecute({
      sql: `SELECT * FROM mohan_expression_library_sql WHERE id = ? LIMIT 1`,
      args: [id],
    });

    return NextResponse.json({ success: true, expression: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

