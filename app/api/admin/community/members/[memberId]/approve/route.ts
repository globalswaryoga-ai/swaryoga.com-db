import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { notifyCommunityApproval } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { memberId } = params;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Find member
    const memberResult = await bunnyExecute({
      sql: 'SELECT data_json FROM community_members_sql WHERE document_id = ?',
      args: [memberId]
    });

    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const member = JSON.parse(String(memberResult.rows[0].data_json));

    // Check if member is already approved
    if (member.approved) {
      return NextResponse.json(
        { 
          success: true,
          data: member,
          message: 'Member is already approved'
        },
        { status: 200 }
      );
    }

    // Update member approval status
    member.approved = true;
    member.approvedAt = new Date().toISOString();
    member.approvedBy = decoded.userId || decoded.username || 'admin';

    await bunnyExecute({
      sql: 'UPDATE community_members_sql SET approved = 1, updated_at = ?, data_json = ? WHERE document_id = ?',
      args: [new Date().toISOString(), JSON.stringify(member), memberId]
    });

    // NEW: Also add to linked WhatsApp QR group if exists
    try {
      const commResult = await bunnyExecute({
        sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'communities' AND JSON_EXTRACT(document_json, '$.id') = ?",
        args: [member.communityId]
      });
      const community = commResult.rows.length > 0 ? JSON.parse(String(commResult.rows[0].document_json)) : null;
      if (community?.whatsappGroupId && member.mobile) {
        const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
        const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;

        console.log(`[Approval] Adding approved member to WA Group: ${community.whatsappGroupId}`);
        await axios.post(
          `${bridgeUrl}/groups/${community.whatsappGroupId}/participants`,
          { phoneNumber: member.mobile },
          { headers: { 'x-bridge-secret': bridgeSecret }, timeout: 5000 }
        );
      }
    } catch (waErr) {
      console.error('[Approval] Failed to add to WA group:', waErr);
      // Don't fail the whole request if WA add fails
    }

    // Fire-and-forget: Send approval notification email
    if (member.email) {
      notifyCommunityApproval(
        { name: member.name, email: member.email, phone: member.mobile },
        { communityName: member.communityName },
      ).catch(err => console.error('[Approval] Notification error:', err));
    }

    return NextResponse.json(
      {
        success: true,
        data: member,
        message: `Member approved for messaging in ${member.communityName} community`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving member:', error);
    return NextResponse.json(
      { error: 'Failed to approve member' },
      { status: 500 }
    );
  }
}
