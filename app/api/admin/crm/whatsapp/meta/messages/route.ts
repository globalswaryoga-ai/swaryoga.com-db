import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

/**
 * GET /api/admin/crm/whatsapp/meta/messages
 * Fetch all messages for a specific phone number
 * Returns chronological message history for the conversation
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const phoneNumber = request.nextUrl.searchParams.get('phoneNumber');
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Missing phoneNumber param' }, { status: 400 });
    }

    await connectDB();

    // Fetch all messages for this phone, sorted chronologically
    const messages = await WhatsAppMessage.find({
      phoneNumber,
    })
      .sort({ sentAt: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: messages,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Meta Messages] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch messages' }, { status: 500 });
  }
}
