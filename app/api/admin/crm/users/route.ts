import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/users
 * Returns a list of admin users derived from lead assignments.
 * Used by the Meta Dashboard admin dropdown filter.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const Lead = getLead();

    // Get all distinct assigned user IDs from leads
    const assignedUserIds: string[] = await Lead.distinct('assignedToUserId');

    // Filter out null/empty values and build user list
    const users = assignedUserIds
      .filter((id) => id && id !== 'null' && id !== 'undefined')
      .sort()
      .map((userId) => ({
        userId,
        name: userId, // assignedToUserId already stores human-readable names
        _id: userId,
      }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('[admin/crm/users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
