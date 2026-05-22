import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

function getAuthedIdentity(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { userId: payload.userId, email: payload.email };
}

function buildQuery(userId?: string, email?: string, tenantId?: string | null) {
  if (tenantId) {
    if (userId && Types.ObjectId.isValid(userId)) return { _id: userId, tenantId };
    if (email) return { email: email.trim().toLowerCase(), tenantId };
  } else {
    if (userId && Types.ObjectId.isValid(userId)) return { _id: userId };
    if (email) return { email: email.trim().toLowerCase() };
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const identity = getAuthedIdentity(request);
    if (!identity?.userId && !identity?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id');
    const query = buildQuery(identity.userId, identity.email, tenantId);
    if (!query) return NextResponse.json({ error: 'Invalid user context' }, { status: 400 });

    const user = await User.findOne(query);
    // If user not found, return empty events (new user hasn't created any yet)
    if (!user) return NextResponse.json({ events: [] });

    return NextResponse.json({ events: user.crmEvents || [] });
  } catch (error: any) {
    console.error('[CRM Events GET] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const identity = getAuthedIdentity(request);
    if (!identity?.userId && !identity?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { events } = await request.json();
    const tenantId = request.headers.get('x-tenant-id');
    const query = buildQuery(identity.userId, identity.email, tenantId);
    if (!query) return NextResponse.json({ error: 'Invalid user context' }, { status: 400 });

    const user = await User.findOneAndUpdate(
      query,
      { crmEvents: events, updatedAt: new Date() },
      { new: true, upsert: true }  // Create user doc if not found
    );
    if (!user) return NextResponse.json({ error: 'Failed to save events' }, { status: 500 });

    return NextResponse.json({ events: user.crmEvents || [] });
  } catch (error: any) {
    console.error('[CRM Events POST] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
