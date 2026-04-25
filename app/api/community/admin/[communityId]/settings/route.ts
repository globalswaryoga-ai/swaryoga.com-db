import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Community } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


export async function PUT(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId } = params;
    const { name, whatsappGroupId, description, joinLink } = await request.json();

    await connectDB();

    const update: any = {};
    if (name) update.name = name;
    if (whatsappGroupId !== undefined) update.whatsappGroupId = whatsappGroupId;
    if (description !== undefined) update.description = description;
    if (joinLink !== undefined) update.joinLink = joinLink;

    const comm = await Community.findOneAndUpdate(
      { id: communityId },
      { $set: update },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Community settings updated',
      community: comm
    });
  } catch (error) {
    console.error('Update community settings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId } = params;
    await connectDB();

    const comm = await Community.findOne({ id: communityId });

    return NextResponse.json({
      success: true,
      community: comm
    });
  } catch (error) {
    console.error('Get community settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
