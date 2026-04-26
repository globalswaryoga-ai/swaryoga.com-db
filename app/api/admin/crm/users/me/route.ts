import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/users/me
 * Returns the current authenticated admin user's profile from the JWT token.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId || (decoded as any).sub || decoded.username || '';
    const permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];
    const isSuperAdmin =
      userId === 'admin' ||
      userId === 'admincrm' ||
      permissions.includes('all') ||
      (decoded.permissionsV2 as any)?.isSuperAdmin === true;

    return NextResponse.json({
      success: true,
      data: {
        userId,
        name: decoded.name || decoded.username || userId,
        email: decoded.email || '',
        role: decoded.role || 'admin',
        isAdmin: decoded.isAdmin,
        isSuperAdmin,
        permissions,
        permissionsV2: decoded.permissionsV2 || null,
      },
    });
  } catch (error) {
    console.error('[admin/crm/users/me] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get user' },
      { status: 500 }
    );
  }
}
