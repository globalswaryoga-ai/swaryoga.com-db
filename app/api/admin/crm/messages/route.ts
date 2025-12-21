import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { WhatsAppMessage, Lead } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

/**
 * WhatsApp message management
 * GET: Fetch messages with filtering
 * POST: Send a message
 * PUT: Update message (retry, mark as read)
 * DELETE: Delete message
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId');
    const phoneNumber = url.searchParams.get('phoneNumber');
    const status = url.searchParams.get('status'); // queued, sent, delivered, read, failed
    const direction = url.searchParams.get('direction'); // inbound, outbound
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

    const filter: any = {};
    if (leadId) {
      if (!mongoose.Types.ObjectId.isValid(leadId)) {
        return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
      }
      filter.leadId = new mongoose.Types.ObjectId(leadId);
    }
    if (phoneNumber) filter.phoneNumber = phoneNumber;
    if (status) filter.status = status;
    if (direction) filter.direction = direction;

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

    return NextResponse.json(
      { success: true, data: { messages, total, limit, skip } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { leadId, phoneNumber, messageContent, templateId, messageType } = body;

    if (!leadId || !phoneNumber || !messageContent) {
      return NextResponse.json({ error: 'Missing: leadId, phoneNumber, messageContent' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(String(leadId))) {
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
      sentBy: decoded.userId,
      sentAt: new Date(),
      templateId: templateId || undefined,
      retryCount: 0,
    });

    // Update lead's lastMessageAt
    await Lead.updateOne({ _id: leadId }, { $set: { lastMessageAt: new Date() } });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messageId, action, ...updates } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Missing: messageId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(String(messageId))) {
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
      return NextResponse.json({ success: true, data: message }, { status: 200 });
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
      return NextResponse.json({ success: true, data: message }, { status: 200 });
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
      return NextResponse.json({ success: true, data: message }, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId parameter required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    await connectDB();

    const result = await WhatsAppMessage.findByIdAndDelete(messageId);

    if (!result) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
