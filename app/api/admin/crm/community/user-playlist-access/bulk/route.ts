import { NextRequest, NextResponse } from 'next/server';
import { connectDB, UserPlaylistAccess } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/community/user-playlist-access/bulk
 * Bulk update playlist access for multiple users at once.
 *
 * Body: {
 *   userIds: string[],           // array of user IDs
 *   communityId: string,
 *   action: 'allAccess-on' | 'allAccess-off' | 'grant-playlist' | 'revoke-playlist',
 *   playlistId?: string,         // required for grant-playlist / revoke-playlist
 *   members?: { userId: string; name?: string; mobile?: string }[]  // optional metadata
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userIds, communityId, action, playlistId, members } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0 || !communityId || !action) {
      return NextResponse.json({ error: 'userIds (array), communityId, and action are required' }, { status: 400 });
    }

    if ((action === 'grant-playlist' || action === 'revoke-playlist') && !playlistId) {
      return NextResponse.json({ error: 'playlistId is required for grant/revoke playlist actions' }, { status: 400 });
    }

    const adminUser = decoded.userId || decoded.username || 'admin';
    const memberMap = new Map<string, { name?: string; mobile?: string }>();
    if (Array.isArray(members)) {
      for (const m of members) {
        memberMap.set(m.userId, { name: m.name, mobile: m.mobile });
      }
    }

    let updated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const meta = memberMap.get(userId) || {};

        if (action === 'allAccess-on') {
          await UserPlaylistAccess.findOneAndUpdate(
            { userId, communityId },
            {
              userId,
              communityId,
              userName: meta.name || '',
              mobile: meta.mobile || '',
              allAccess: true,
              playlistIds: [],
              updatedBy: adminUser,
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        } else if (action === 'allAccess-off') {
          await UserPlaylistAccess.findOneAndUpdate(
            { userId, communityId },
            {
              userId,
              communityId,
              userName: meta.name || '',
              mobile: meta.mobile || '',
              allAccess: false,
              updatedBy: adminUser,
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        } else if (action === 'grant-playlist') {
          // Ensure doc exists first
          await UserPlaylistAccess.findOneAndUpdate(
            { userId, communityId },
            {
              $set: {
                userId,
                communityId,
                userName: meta.name || '',
                mobile: meta.mobile || '',
                allAccess: false,
                updatedBy: adminUser,
                updatedAt: new Date(),
              },
              $addToSet: { playlistIds: playlistId },
            },
            { upsert: true, new: true }
          );
        } else if (action === 'revoke-playlist') {
          await UserPlaylistAccess.findOneAndUpdate(
            { userId, communityId },
            {
              $set: {
                userName: meta.name || '',
                mobile: meta.mobile || '',
                updatedBy: adminUser,
                updatedAt: new Date(),
              },
              $pull: { playlistIds: playlistId },
            },
            { upsert: true, new: true }
          );
        }

        updated++;
      } catch (err) {
        console.error(`[Bulk Access] Failed for userId=${userId}:`, err);
        failed++;
      }
    }

    const actionLabels: Record<string, string> = {
      'allAccess-on': 'All Access granted',
      'allAccess-off': 'All Access revoked',
      'grant-playlist': 'Playlist access granted',
      'revoke-playlist': 'Playlist access revoked',
    };

    return NextResponse.json({
      success: true,
      message: `${actionLabels[action] || action} for ${updated} user${updated !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`,
      updated,
      failed,
    });
  } catch (error: any) {
    console.error('[Bulk Playlist Access POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process bulk action' }, { status: 500 });
  }
}
