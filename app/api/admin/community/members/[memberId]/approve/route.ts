import { connectDB, Community } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { notifyCommunityApproval } from '@/lib/notifications';

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

    await connectDB();

    const { memberId } = params;

    // Validate MongoDB ID format
    if (!memberId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: 'Invalid member ID format' },
        { status: 400 }
      );
    }

    // Find member
    const member = await CommunityMember.findById(memberId);

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

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
    member.approvedAt = new Date();
    member.approvedBy = decoded.userId || decoded.username || 'admin';

    await member.save();

    // NEW: Also add to linked WhatsApp QR group if exists
    try {
      const community = await Community.findOne({ id: member.communityId });
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
