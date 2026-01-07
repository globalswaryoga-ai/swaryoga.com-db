import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

/**
 * GET /api/whatsapp/messages?phone=PHONE_NUMBER
 * Fetch all WhatsApp messages for a specific phone number
 */
export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find lead by phone number
    const lead = await Lead.findOne({ phoneNumber: phone }).lean();

    if (!lead) {
      // No lead found, return empty messages array
      return NextResponse.json(
        {
          success: true,
          messages: [],
          lead: null,
        },
        { status: 200 }
      );
    }

    // Fetch all messages for this lead, sorted by date
    const messages = await WhatsAppMessage.find({ leadId: lead._id })
      .sort({ sentAt: -1 })
      .lean()
      .select({
        _id: 1,
        waMessageId: 1,
        messageContent: 1,
        direction: 1,
        status: 1,
        sentAt: 1,
        deliveredAt: 1,
        readAt: 1,
        messageType: 1,
        createdAt: 1,
      });

    return NextResponse.json(
      {
        success: true,
        messages: messages.map((msg: any) => ({
          _id: msg._id,
          waMessageId: msg.waMessageId,
          messageContent: msg.messageContent,
          direction: msg.direction,
          status: msg.status,
          sentAt: msg.sentAt,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt,
          messageType: msg.messageType,
          createdAt: msg.createdAt,
        })),
        lead: {
          _id: lead._id,
          phoneNumber: lead.phoneNumber,
          status: lead.status,
          lastMessageAt: lead.lastMessageAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
