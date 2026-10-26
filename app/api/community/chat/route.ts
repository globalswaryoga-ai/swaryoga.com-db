import { NextRequest, NextResponse } from 'next/server';
import { getCommunityMessages, sendCommunityMessage } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/chat?communityId=...
 * Fetch recent chat messages for a specific community group
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || 'global';
    const limit = parseInt(searchParams.get('limit') || '60', 10);

    const messages = await getCommunityMessages(communityId, limit);

    return NextResponse.json({
      success: true,
      communityId,
      messages,
      total: messages.length,
    });
  } catch (error: any) {
    console.error('[Community Chat GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch messages',
        messages: [],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/chat
 * Post a new message in a community group chat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communityId = 'global', message, userName, userMobile, userId, userRole } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (!userName || !userName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter your name to send a message' },
        { status: 400 }
      );
    }

    const newMessage = await sendCommunityMessage({
      communityId,
      userId: userId || undefined,
      userName: userName.trim(),
      userMobile: userMobile?.trim() || undefined,
      userRole: userRole || 'member',
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    console.error('[Community Chat POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send message',
      },
      { status: 500 }
    );
  }
}
