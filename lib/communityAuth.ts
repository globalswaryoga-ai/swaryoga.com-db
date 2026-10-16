import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCommunity } from '@/lib/bunnyCommunityRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const decoded = token ? verifyToken(token) : null;
  return decoded?.userId ? String(decoded.userId) : null;
}

export async function requireCommunityMembership(request: NextRequest, communityId: string): Promise<string> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  // Allow engagement in the 'global' community for any authenticated user
  if (communityId === 'global') {
    return userId;
  }

  const community = await getCommunity(communityId);
  if (!community) {
    const err = new Error('Community not found');
    (err as any).status = 404;
    throw err;
  }

  if (community.id === 'global' || community.slug === 'global') {
    return userId;
  }

  // Check if member in community_members_sql
  const res = await bunnyExecute({
    sql: 'SELECT 1 FROM community_members_sql WHERE (community_id = ? OR community_id = ?) AND user_id = ? AND status = \'active\' LIMIT 1',
    args: [community.id, community.slug, userId],
  });

  if (res.rows.length === 0) {
    const err = new Error('Forbidden');
    (err as any).status = 403;
    throw err;
  }

  return userId;
}
