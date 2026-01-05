import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

type Body = {
  chatEnabled?: boolean;
  canSend?: boolean;
  allowText?: boolean;
  allowLinks?: boolean;
  allowImages?: boolean;
  allowVideos?: boolean;
  allowDocuments?: boolean;
};

export async function PUT(request: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    await connectDB();

    const { memberId } = params;
    if (!memberId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: 'Invalid member ID format' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const member = await CommunityMember.findById(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (typeof body.chatEnabled === 'boolean') (member as any).chatEnabled = body.chatEnabled;

    const nextPerms: any = { ...(member as any).chatPermissions };
    const keys: Array<keyof Body> = ['canSend', 'allowText', 'allowLinks', 'allowImages', 'allowVideos', 'allowDocuments'];
    for (const k of keys) {
      const v = body[k];
      if (typeof v === 'boolean') nextPerms[k] = v;
    }

    (member as any).chatPermissions = nextPerms;
    (member as any).updatedAt = new Date();
    await member.save();

    return NextResponse.json(
      {
        success: true,
        data: member,
        message: 'Chat permissions updated',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating chat permissions:', error);
    return NextResponse.json({ error: 'Failed to update chat permissions' }, { status: 500 });
  }
}
