import { NextRequest, NextResponse } from 'next/server';
import { getAllDigitalTwins } from '@/lib/avatarEngine/digitalTwinService';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) {
    return NextResponse.json({ success: false, error: 'Admin identity is missing.' }, { status: 401 });
  }

  try {
    // Tenant isolation: Superadmins see all twins; standard admins only see their own
    const filterUserId = isSuperAdmin(decoded) ? undefined : viewerId;
    const twins = await getAllDigitalTwins(filterUserId);
    return NextResponse.json({
      success: true,
      total: twins.length,
      twins,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch digital twins' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) {
    return NextResponse.json({ success: false, error: 'Admin identity is missing.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      twinName,
      baseVideoUrl,
      thumbnailUrl,
      profileId,
      headPoseRange,
      handGesturesEnabled,
    } = body;

    if (!twinName || !baseVideoUrl) {
      return NextResponse.json(
        { success: false, error: 'twinName and baseVideoUrl are required.' },
        { status: 400 }
      );
    }

    // Verify parent profile ownership if profileId is passed
    if (profileId && !isSuperAdmin(decoded)) {
      const profileCheck = await bunnyExecute({
        sql: 'SELECT user_id FROM avatar_identity_profiles_sql WHERE id = ?',
        args: [profileId]
      });
      const owner = profileCheck.rows?.[0]?.user_id;
      if (owner && owner !== viewerId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not own the referenced avatar profile.' },
          { status: 403 }
        );
      }
    }

    const id = `twin_${Date.now()}`;
    const now = new Date().toISOString();

    const report = {
      status: 'not_run',
      verified: false,
      reason: 'No training or video-quality validation pipeline is connected.',
    };

    // Server-derived ownership: strictly viewerId, never trusting client body
    await bunnyExecute({
      sql: `INSERT INTO digital_twins_v3_sql (
        id, user_id, profile_id, twin_name, base_video_url, thumbnail_url,
        head_pose_range_json, speaking_cadence_wpm, dominant_expressions_json,
        hand_gestures_enabled, eye_blink_rate_bpm, identity_consistency_score,
        training_status, validation_report_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        viewerId,
        profileId || `profile_${id}`,
        twinName,
        baseVideoUrl,
        thumbnailUrl || null,
        JSON.stringify(headPoseRange || { yaw_range: [-15, 15], pitch_range: [-10, 10], roll_range: [-5, 5] }),
        0,
        JSON.stringify([]),
        handGesturesEnabled !== false ? 1 : 0,
        0,
        0,
        'not_trained',
        JSON.stringify(report),
        now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      twinId: id,
      userId: viewerId,
      validationReport: report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create digital twin' },
      { status: 500 }
    );
  }
}
