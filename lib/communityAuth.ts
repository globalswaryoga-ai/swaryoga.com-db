import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, Community } from '@/lib/db';
import mongoose from 'mongoose';

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

  if (!mongoose.Types.ObjectId.isValid(communityId)) {
    const err = new Error('Community not found');
    (err as any).status = 404;
    throw err;
  }

  await connectDB();
  const community = await Community.findById(communityId).select({ members: 1 }).lean();
  if (!community) {
    const err = new Error('Community not found');
    (err as any).status = 404;
    throw err;
  }

  const members = Array.isArray((community as any).members) ? ((community as any).members as string[]) : [];
  if (!members.includes(userId)) {
    const err = new Error('Forbidden');
    (err as any).status = 403;
    throw err;
  }

  return userId;
}
