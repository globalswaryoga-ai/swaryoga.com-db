import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  buildFilter,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { WhatsAppMessage, Lead } from '@/lib/schemas/enterpriseSchemas';

/**
 * WhatsApp message management - REFACTORED
 * GET: Fetch messages with filtering
 * POST: Send a message
 * PUT: Update message (retry, mark as read)
 * DELETE: Delete message
 */

export async function GET(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    await connectDB();

    // Build filter from query parameters
    const filterParams = {
      leadId: url.searchParams.get('leadId') || undefined,
      phoneNumber: url.searchParams.get('phoneNumber') || undefined,
      status: url.searchParams.get('status') || undefined,
      direction: url.searchParams.get('direction') || undefined,
    };
    const filter: any = buildFilter(filterParams);

    // Add date range filter
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    const messages = await WhatsAppMessage.find(filter)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('leadId', 'name phoneNumber')
      .lean();

    const total = await WhatsAppMessage.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ messages, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { leadId, phoneNumber, messageContent, templateId, messageType } = body;

    if (!leadId || !phoneNumber || !messageContent) {
      return NextResponse.json({ error: 'Missing: leadId, phoneNumber, messageContent' }, { status: 400 });
    }

    if (!isValidObjectId(String(leadId))) {
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
    }

    await connectDB();

    // Verify lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Create message record
    const message = await WhatsAppMessage.create({
      leadId,
      phoneNumber,
      messageContent,
      direction: 'outbound',
      messageType: messageType || 'text',
      status: 'queued',
      sentBy: userId,
      sentAt: new Date(),
      templateId: templateId || undefined,
      retryCount: 0,
    });

    // Update lead's lastMessageAt
    await Lead.updateOne({ _id: leadId }, { $set: { lastMessageAt: new Date() } });

    return formatCrmSuccess(message);
  } catch (error) {
    return handleCrmError(error, 'POST message');
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messageId, action, ...updates } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Missing: messageId' }, { status: 400 });
    }

    if (!isValidObjectId(String(messageId))) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    await connectDB();

    if (action === 'markAsRead') {
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        { $set: { status: 'read', readAt: new Date() } },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    } else if (action === 'retry') {
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        {
          $set: { status: 'queued', nextRetryAt: new Date() },
          $inc: { retryCount: 1 },
        },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    } else {
      // Generic update
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        { $set: updates },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    }
  } catch (error) {
    return handleCrmError(error, 'PUT message');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId parameter required' }, { status: 400 });
    }

    if (!isValidObjectId(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    await connectDB();

    const result = await WhatsAppMessage.findByIdAndDelete(messageId);

    if (!result) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return formatCrmSuccess({ deleted: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE message');
  }
}
