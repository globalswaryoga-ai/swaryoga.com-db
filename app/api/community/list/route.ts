import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultCommunities } from '@/lib/communitySeed';
import { getUserIdFromRequest } from '@/lib/communityAuth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultCommunities();

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await bunnyExecute({
      sql: `SELECT DISTINCT c.id, c.slug, c.name, c.created_at
            FROM communities_sql c
            LEFT JOIN community_members_sql m ON (m.community_id = c.id OR m.community_id = c.slug)
            WHERE c.id = 'global' OR c.slug = 'global' OR m.user_id = ?
            ORDER BY c.created_at ASC`,
      args: [userId],
    });

    return NextResponse.json(
      {
        success: true,
        data: res.rows.map((c: any) => ({
          id: String(c.id || c.slug),
          slug: String(c.slug || c.id),
          name: String(c.name),
          createdAt: c.created_at ? new Date(c.created_at).toISOString() : '',
        })),
      },
      { status: 200, headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
    );
  } catch (error) {
    console.error('Community list error:', error);
    return NextResponse.json({ error: 'Failed to load communities' }, { status: 500 });
  }
}
