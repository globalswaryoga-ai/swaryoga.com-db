import { NextRequest, NextResponse } from 'next/server';
import { getAllBodyModels, createBodyModel } from '@/lib/avatarEngine/body3dService';
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
    // Tenant isolation: Superadmins see all bodies; standard admins only see their own
    const filterUserId = isSuperAdmin(decoded) ? undefined : viewerId;
    const bodies = await getAllBodyModels(filterUserId);
    return NextResponse.json({
      success: true,
      total: bodies.length,
      bodies,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch 3D body models' },
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
    const { twinId, name, anthropometrics, rigType, meshGlbUrl, frontViewUrl } = body;

    if (!name || !anthropometrics) {
      return NextResponse.json(
        { success: false, error: 'name and anthropometrics object are required.' },
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

    // Server-derived ownership: strictly viewerId, client body userId is ignored
    const newBody = await createBodyModel({
      userId: viewerId,
      twinId,
      name,
      anthropometrics,
      rigType: rigType || 'blender_rigify',
      meshGlbUrl,
      frontViewUrl,
    });

    return NextResponse.json({
      success: true,
      body: newBody,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create 3D body model' },
      { status: 500 }
    );
  }
}
