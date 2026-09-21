import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { verifyCommunityTenant, getAccessibleCommunityIds } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

/**
 * POST /api/admin/crm/community/members/block
 * Admin-only: Block/ban a user from a community
 * Body: { memberId: string, communityId?: string, userId?: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    

    const body = await request.json().catch(() => null);
    const memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : '';
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Blocked by admin for policy violation';

    if (!memberId && !userId) {
      return NextResponse.json({ error: 'Either memberId or userId is required' }, { status: 400 });
    }

    // Community-level tenant isolation
    if (communityId) {
      if (!(await verifyCommunityTenant(decoded, communityId))) {
        return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
      }
    }

    let clauses: string[] = [];
    let args: any[] = [];
    if (memberId) {
      clauses.push("document_id = ?"); args.push(memberId);
    } else if (userId && communityId) {
      clauses.push("user_id = ?"); args.push(userId);
      clauses.push("community_id = ?"); args.push(communityId);
    } else if (userId) {
      clauses.push("user_id = ?"); args.push(userId);
      // Block from accessible communities only
      const accessibleIds = await getAccessibleCommunityIds(decoded);
      if (accessibleIds && accessibleIds.length > 0) {
        clauses.push(`community_id IN (${accessibleIds.map(() => '?').join(',')})`);
        args.push(...accessibleIds);
      }
    }

    const nowIso = new Date().toISOString();
    const adminUser = decoded.userId || decoded.username || 'admin';
    const result = await bunnyExecute({
      sql: `UPDATE community_members_sql 
            SET status = 'banned', 
                updated_at = ?,
                data_json = json_set(data_json, '$.status', 'banned', '$.chatPermissions.canSend', false, '$.metadata.bannedAt', ?, '$.metadata.bannedBy', ?, '$.metadata.banReason', ?, '$.updatedAt', ?) 
            WHERE ${clauses.join(' AND ')}`,
      args: [nowIso, nowIso, adminUser, reason, nowIso, ...args]
    });

    const modifiedCount = result.rowsAffected || 0;

    if (modifiedCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully blocked ${modifiedCount} member(s)`,
      data: {
        blockedCount: modifiedCount,
        reason
      }
    });
  } catch (error) {
    console.error('Admin block member error:', error);
    return NextResponse.json({ error: 'Failed to block member' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm/community/members/block
 * Admin-only: Unblock/unban a user from a community
 * Body: { memberId: string, communityId?: string, userId?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    

    const body = await request.json().catch(() => null);
    const memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : '';
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

    if (!memberId && !userId) {
      return NextResponse.json({ error: 'Either memberId or userId is required' }, { status: 400 });
    }

    // Community-level tenant isolation
    if (communityId) {
      if (!(await verifyCommunityTenant(decoded, communityId))) {
        return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
      }
    }

    let clauses: string[] = [];
    let args: any[] = [];
    if (memberId) {
      clauses.push("document_id = ?"); args.push(memberId);
    } else if (userId && communityId) {
      clauses.push("user_id = ?"); args.push(userId);
      clauses.push("community_id = ?"); args.push(communityId);
    } else if (userId) {
      clauses.push("user_id = ?"); args.push(userId);
      const accessibleIds = await getAccessibleCommunityIds(decoded);
      if (accessibleIds && accessibleIds.length > 0) {
        clauses.push(`community_id IN (${accessibleIds.map(() => '?').join(',')})`);
        args.push(...accessibleIds);
      }
    }

    const nowIso = new Date().toISOString();
    const adminUser = decoded.userId || decoded.username || 'admin';
    const result = await bunnyExecute({
      sql: `UPDATE community_members_sql 
            SET status = 'active', 
                updated_at = ?,
                data_json = json_remove(json_set(data_json, '$.status', 'active', '$.chatPermissions.canSend', true, '$.metadata.unbannedAt', ?, '$.metadata.unbannedBy', ?, '$.updatedAt', ?), '$.metadata.bannedAt', '$.metadata.bannedBy', '$.metadata.banReason') 
            WHERE ${clauses.join(' AND ')}`,
      args: [nowIso, nowIso, adminUser, nowIso, ...args]
    });

    const modifiedCount = result.rowsAffected || 0;

    if (modifiedCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unblocked ${modifiedCount} member(s)`,
      data: {
        unblockedCount: modifiedCount
      }
    });
  } catch (error) {
    console.error('Admin unblock member error:', error);
    return NextResponse.json({ error: 'Failed to unblock member' }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/community/members/block
 * Admin-only: Get list of blocked members
 * Query: ?communityId=xxx (optional, filter by community)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || '';

    // Community-level tenant isolation
    if (communityId) {
      if (!(await verifyCommunityTenant(decoded, communityId))) {
        return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
      }
    }

    let clauses: string[] = ["status = 'banned'"];
    let args: any[] = [];
    if (communityId) {
      clauses.push("community_id = ?"); args.push(communityId);
    } else {
      const accessibleIds = await getAccessibleCommunityIds(decoded);
      if (accessibleIds && accessibleIds.length > 0) {
        clauses.push(`community_id IN (${accessibleIds.map(() => '?').join(',')})`);
        args.push(...accessibleIds);
      }
    }

    const result = await bunnyExecute({
      sql: `SELECT data_json FROM community_members_sql WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT 100`,
      args
    });

    const blockedMembers = result.rows.map((r: any) => JSON.parse(String(r.data_json)));

    return NextResponse.json({
      success: true,
      data: {
        blockedMembers,
        total: blockedMembers.length
      }
    });
  } catch (error) {
    console.error('Admin get blocked members error:', error);
    return NextResponse.json({ error: 'Failed to get blocked members' }, { status: 500 });
  }
}
