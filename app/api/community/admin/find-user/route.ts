import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { connectDB, User } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    await connectDB();

    let user: any = null;

    if (q.includes('@')) {
      user = await User.findOne({ email: q.toLowerCase() })
        .select({ _id: 1, email: 1, name: 1, profileId: 1 })
        .lean();
    } else if (isObjectIdLike(q)) {
      user = await User.findById(q).select({ _id: 1, email: 1, name: 1, profileId: 1 }).lean();
    } else {
      // Not requested, but helpful: support profileId lookup without exposing public membership.
      user = await User.findOne({ profileId: q }).select({ _id: 1, email: 1, name: 1, profileId: 1 }).lean();
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: user._id?.toString(),
          email: user.email,
          name: user.name,
          profileId: user.profileId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin find user error:', error);
    return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
  }
}
