import { NextRequest, NextResponse } from 'next/server';
import { getAllExpressions, saveCustomExpression } from '@/lib/avatarEngine/expressionService';
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
    // Tenant isolation: Superadmins see all expressions; standard admins see system presets + own
    const filterUserId = isSuperAdmin(decoded) ? undefined : viewerId;
    const expressions = await getAllExpressions(filterUserId);
    return NextResponse.json({
      success: true,
      total: expressions.length,
      expressions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expressions' },
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
      twinId,
      expressionName,
      emotionCategory,
      intensity,
      blendshapes,
      headPitch,
      headYaw,
      headRoll,
      eyeSquint,
      mouthSmile,
      previewImageUrl,
    } = body;

    if (!expressionName || !blendshapes) {
      return NextResponse.json(
        { success: false, error: 'expressionName and blendshapes are required.' },
        { status: 400 }
      );
    }

    // Verify parent digital twin ownership if twinId is provided
    if (twinId && !isSuperAdmin(decoded)) {
      const twinCheck = await bunnyExecute({
        sql: 'SELECT user_id FROM digital_twins_v3_sql WHERE id = ?',
        args: [twinId]
      });
      const owner = twinCheck.rows?.[0]?.user_id;
      if (owner && owner !== viewerId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not own the referenced digital twin.' },
          { status: 403 }
        );
      }
    }

    const id = `expr_${Date.now()}`;
    const saved = await saveCustomExpression({
      id,
      userId: viewerId,
      twinId,
      expressionName,
      emotionCategory: emotionCategory || 'custom',
      intensity: intensity || 1.0,
      blendshapes,
      headPitch: headPitch || 0.0,
      headYaw: headYaw || 0.0,
      headRoll: headRoll || 0.0,
      eyeSquint: eyeSquint || 0.0,
      mouthSmile: mouthSmile || 0.0,
      previewImageUrl,
    });

    return NextResponse.json({
      success: true,
      expression: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save expression' },
      { status: 500 }
    );
  }
}
