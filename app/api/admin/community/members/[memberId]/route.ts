import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// PUT - Update member status
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const { status } = await request.json();

    if (!memberId || !status) {
      return NextResponse.json(
        { error: 'memberId and status are required' },
        { status: 400 }
      );
    }

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updated = await CommunityMember.findByIdAndUpdate(
      memberId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Member status updated to ${status}`,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error updating member:', errorMsg);

    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}
