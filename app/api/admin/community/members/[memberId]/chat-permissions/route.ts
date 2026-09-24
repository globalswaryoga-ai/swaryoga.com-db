import { NextRequest, NextResponse } from 'next/server';

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const { memberId } = params;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const memberResult = await bunnyExecute({
      sql: 'SELECT data_json FROM community_members_sql WHERE document_id = ?',
      args: [memberId]
    });

    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = JSON.parse(String(memberResult.rows[0].data_json));

    if (typeof body.chatEnabled === 'boolean') member.chatEnabled = body.chatEnabled;

    const nextPerms: any = { ...member.chatPermissions };
    const keys: Array<keyof Body> = ['canSend', 'allowText', 'allowLinks', 'allowImages', 'allowVideos', 'allowDocuments'];
    for (const k of keys) {
      const v = body[k];
      if (typeof v === 'boolean') nextPerms[k] = v;
    }

    member.chatPermissions = nextPerms;
    member.updatedAt = new Date().toISOString();

    await bunnyExecute({
      sql: 'UPDATE community_members_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(member), member.updatedAt, memberId]
    });

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
