import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import axios from 'axios';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/whatsapp/groups
 * Fetch all WhatsApp groups from QR bridge
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch groups from QR bridge
    const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;

    try {
      const groupsResponse = await axios.get(`${bridgeUrl}/groups`, {
        headers: {
          'x-bridge-secret': bridgeSecret,
        },
        timeout: 5000,
      });

      const groups = groupsResponse.data?.groups || [];
      
      return NextResponse.json({
        success: true,
        groups: groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          participants: g.participants || [],
          participantCount: g.participants?.length || 0,
          isAdmin: g.isAdmin || false,
          inviteCode: g.inviteCode || '',
          icon: g.icon || '',
          createdAt: g.createdAt,
          lastMessage: g.lastMessage,
          lastMessageTime: g.lastMessageTime,
        })),
        total: groups.length,
      });
    } catch (bridgeError) {
      console.error('Bridge error:', bridgeError);
      return NextResponse.json(
        { error: 'Unable to fetch groups from WhatsApp bridge' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Groups fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/whatsapp/groups/add-participant
 * Add a user to a WhatsApp group
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, groupId, phoneNumber, message } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;

    switch (action) {
      case 'add-participant':
        if (!groupId || !phoneNumber) {
          return NextResponse.json(
            { error: 'Group ID and phone number required' },
            { status: 400 }
          );
        }

        try {
          const response = await axios.post(
            `${bridgeUrl}/groups/${groupId}/participants`,
            { phoneNumber },
            {
              headers: { 'x-bridge-secret': bridgeSecret },
              timeout: 5000,
            }
          );

          return NextResponse.json({
            success: true,
            message: `Added participant ${phoneNumber}`,
            data: response.data,
          });
        } catch (error) {
          throw new Error(`Failed to add participant: ${error}`);
        }

      case 'remove-participant':
        if (!groupId || !phoneNumber) {
          return NextResponse.json(
            { error: 'Group ID and phone number required' },
            { status: 400 }
          );
        }

        try {
          const response = await axios.delete(
            `${bridgeUrl}/groups/${groupId}/participants/${phoneNumber}`,
            {
              headers: { 'x-bridge-secret': bridgeSecret },
              timeout: 5000,
            }
          );

          return NextResponse.json({
            success: true,
            message: `Removed participant ${phoneNumber}`,
            data: response.data,
          });
        } catch (error) {
          throw new Error(`Failed to remove participant: ${error}`);
        }

      case 'send-message':
        if (!groupId || !message) {
          return NextResponse.json(
            { error: 'Group ID and message required' },
            { status: 400 }
          );
        }

        try {
          const response = await axios.post(
            `${bridgeUrl}/groups/${groupId}/messages`,
            { text: message },
            {
              headers: { 'x-bridge-secret': bridgeSecret },
              timeout: 5000,
            }
          );

          return NextResponse.json({
            success: true,
            message: 'Message sent to group',
            data: response.data,
          });
        } catch (error) {
          throw new Error(`Failed to send message: ${error}`);
        }

      case 'update-description':
        if (!groupId || !message) {
          return NextResponse.json(
            { error: 'Group ID and description required' },
            { status: 400 }
          );
        }

        try {
          const response = await axios.put(
            `${bridgeUrl}/groups/${groupId}`,
            { description: message },
            {
              headers: { 'x-bridge-secret': bridgeSecret },
              timeout: 5000,
            }
          );

          return NextResponse.json({
            success: true,
            message: 'Group description updated',
            data: response.data,
          });
        } catch (error) {
          throw new Error(`Failed to update description: ${error}`);
        }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Group action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
