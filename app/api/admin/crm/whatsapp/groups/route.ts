import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import axios from 'axios';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

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
    const { url: bridgeUrl, secret: bridgeSecret } = getWhatsAppBridgeConfig();

    try {
      // Try /groups endpoint first, fall back to /chats if not available
      let groups: any[] = [];
      
      try {
        const groupsResponse = await axios.get(`${bridgeUrl}/groups`, {
          headers: { 'x-bridge-secret': bridgeSecret },
          timeout: 5000,
        });
        groups = groupsResponse.data?.groups || [];
      } catch (groupsErr: any) {
        // If /groups endpoint doesn't exist, try /chats and filter for groups
        if (groupsErr?.response?.status === 404 || groupsErr?.message?.includes('Cannot GET')) {
          console.log('Bridge /groups not available, falling back to /chats');
          const chatsResponse = await axios.get(`${bridgeUrl}/chats`, {
            headers: { 'x-bridge-secret': bridgeSecret },
            timeout: 5000,
          });
          // Filter to only include groups (isGroup: true or id ends with @g.us)
          groups = (chatsResponse.data?.chats || []).filter(
            (c: any) => c.isGroup === true || c.id?.endsWith('@g.us')
          );
        } else {
          throw groupsErr;
        }
      }
      
      return NextResponse.json({
        success: true,
        groups: groups.map((g: any) => ({
          id: g.id,
          name: g.name || 'Unknown Group',
          description: g.description || '',
          participants: g.participants || [],
          participantCount: g.memberCount || g.participants?.length || 0,
          isAdmin: g.isAdmin || false,
          inviteCode: g.inviteCode || '',
          icon: g.profilePicUrl || g.icon || '',
          createdAt: g.timestamp ? new Date(g.timestamp * 1000).toISOString() : new Date().toISOString(),
          // Safely extract lastMessage body as string, not object
          lastMessage: typeof g.lastMessage === 'string' 
            ? g.lastMessage 
            : g.lastMessage?.body || '',
          lastMessageTime: g.timestamp ? new Date(g.timestamp * 1000).toISOString() : '',
        })),
        total: groups.length,
      });
    } catch (bridgeError: any) {
      console.error('Bridge error:', bridgeError?.message || bridgeError);
      
      // Determine specific error message
      let errorMessage = 'Unable to fetch groups from WhatsApp bridge';
      if (bridgeError?.code === 'ECONNREFUSED') {
        errorMessage = 'WhatsApp bridge is not running. Please start the bridge service.';
      } else if (bridgeError?.code === 'ETIMEDOUT' || bridgeError?.code === 'ECONNABORTED') {
        errorMessage = 'WhatsApp bridge connection timed out. Check if the bridge is accessible.';
      } else if (bridgeError?.response?.status === 400) {
        errorMessage = 'WhatsApp client is not connected. Please scan QR code first.';
      } else if (bridgeError?.response?.status === 401) {
        errorMessage = 'Bridge authentication failed. Check WHATSAPP_WEB_BRIDGE_SECRET.';
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage, groups: [] },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Groups fetch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch groups', groups: [] },
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

    const { action, groupId, phoneNumber, message, media, url } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    const { url: bridgeUrl, secret: bridgeSecret } = getWhatsAppBridgeConfig();

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
        if (!groupId || (!message && !media && !url)) {
          return NextResponse.json(
            { error: 'Group ID and message or media required' },
            { status: 400 }
          );
        }

        try {
          const response = await axios.post(
            `${bridgeUrl}/groups/${groupId}/messages`,
            { 
              text: message,
              media: media || url 
            },
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
