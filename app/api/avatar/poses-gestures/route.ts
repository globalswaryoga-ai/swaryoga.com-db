import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'both';

    let poses: any[] = [];
    let gestures: any[] = [];

    if (type === 'poses' || type === 'both') {
      const posesRes = await bunnyExecute(`SELECT * FROM mohan_body_pose_library_sql ORDER BY created_at DESC`);
      poses = posesRes.rows || [];
    }

    if (type === 'gestures' || type === 'both') {
      const gesturesRes = await bunnyExecute(`SELECT * FROM mohan_gesture_library_sql ORDER BY created_at DESC`);
      gestures = gesturesRes.rows || [];
    }

    return NextResponse.json({ success: true, poses, gestures });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { item_type = 'pose', ...data } = body;
    const now = new Date().toISOString();

    if (item_type === 'pose') {
      const id = data.id || `pose_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await bunnyExecute({
        sql: `INSERT INTO mohan_body_pose_library_sql
              (id, pose_name, category, camera_distance, keypoint_structure_json, reference_image_key,
               is_verified, review_status, reviewed_by, reviewed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                pose_name = excluded.pose_name,
                category = excluded.category,
                camera_distance = excluded.camera_distance,
                is_verified = excluded.is_verified,
                review_status = excluded.review_status,
                reviewed_by = excluded.reviewed_by,
                reviewed_at = excluded.reviewed_at`,
        args: [
          id,
          data.pose_name || 'Vedic Sitting Asana',
          data.category || 'teaching',
          data.camera_distance || 'medium',
          data.keypoint_structure_json || null,
          data.reference_image_key || null,
          data.is_verified ? 1 : 0, // Enforces 0 (pending) by default
          data.review_status || 'pending',
          data.reviewed_by || null,
          data.reviewed_at || null,
          now,
        ],
      });
      return NextResponse.json({ success: true, message: 'Pose saved', id });
    }

    if (item_type === 'gesture') {
      const id = data.id || `gest_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await bunnyExecute({
        sql: `INSERT INTO mohan_gesture_library_sql
              (id, gesture_name, category, source_video_id, timestamp_start, timestamp_end,
               keyframe_motion_json, confidence_score, human_verification_status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                gesture_name = excluded.gesture_name,
                category = excluded.category,
                confidence_score = excluded.confidence_score,
                human_verification_status = excluded.human_verification_status`,
        args: [
          id,
          data.gesture_name || 'Chin Mudra Teaching Gesture',
          data.category || 'teaching',
          data.source_video_id || null,
          Number(data.timestamp_start || 0),
          Number(data.timestamp_end || 0),
          data.keyframe_motion_json || null,
          Number(data.confidence_score || 0.9),
          data.human_verification_status || 'pending',
          now,
        ],
      });
      return NextResponse.json({ success: true, message: 'Gesture saved', id });
    }

    return NextResponse.json({ success: false, error: 'item_type must be pose or gesture' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

